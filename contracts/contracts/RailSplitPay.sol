// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/**
 * Minimal FTSOv2 feed reader. Both the Coston2 test feed and the mainnet
 * Flare feed expose the same getFeedById(bytes21) surface, so the provider
 * address is injected at deploy time and this contract carries no network-
 * specific registry import.
 */
interface IFtsoV2 {
    function getFeedById(bytes21 _feedId)
        external
        view
        returns (uint256 _value, int8 _decimals, uint64 _timestamp);
}

/**
 * Minimal ERC-20 surface for FXRP. FXRP is the FAsset representation of XRP
 * on Flare (an ERC-20 token), unlike C2FLR which is the network's native
 * coin. Payments in FXRP move through approve + transferFrom.
 */
interface IERC20 {
    function decimals() external view returns (uint8);
    function transferFrom(address _from, address _to, uint256 _amount) external returns (bool);
    function transfer(address _to, uint256 _amount) external returns (bool);
}

/**
 * RailSplitPay lets a merchant publish a payment request priced in US dollars
 * and be paid in the network's native coin (C2FLR) or in FXRP, the FAsset
 * representation of XRP on Flare.
 *
 * The merchant never has to quote a coin amount. The contract reads the
 * FTSOv2 feed when the customer pays, converts the dollar price to the
 * coin amount at that moment, and forwards that coin to the merchant.
 * A payment is accepted only if it covers the converted price, so the
 * merchant receives the dollar value they asked for.
 *
 * `asset` on each settled Payment records which coin settled it: 0 = native
 * C2FLR, 1 = FXRP. The feed fields on the record carry the USD price of
 * whichever asset was used.
 */
contract RailSplitPay {
    /// FTSOv2 feed id for FLR/USD. The bytes hold "FLR/USD" behind a 0x01 category byte.
    bytes21 public constant FLR_USD_FEED_ID =
        bytes21(0x01464c522f55534400000000000000000000000000);

    /// FTSOv2 feed id for XRP/USD. The bytes hold "XRP/USD" behind a 0x01 category byte.
    bytes21 public constant XRP_USD_FEED_ID =
        bytes21(0x015852502f55534400000000000000000000000000);

    /// Settlement asset enum stored on each Payment.
    uint8 public constant ASSET_NATIVE = 0;
    uint8 public constant ASSET_FXRP = 1;

    /// The FTSOv2 feed for this network, resolved at deploy time from the
    /// Flare contract registry. Frozen here so the contract works on any
    /// Flare network without knowing which one it is deployed to.
    IFtsoV2 public immutable ftsoV2;

    /// The FXRP ERC-20 token (FAsset XRP) accepted as an alternate rail.
    IERC20 public immutable fxrp;

    /// FXRP token decimals, read from the token at deploy time. XRP is
    /// represented with 6 decimals, so the dollar-to-FXRP conversion scales
    /// by 10**6 rather than the native coin's 10**18.
    uint8 public immutable fxrpDecimals;

    constructor(IFtsoV2 ftsoV2_, IERC20 fxrp_) {
        if (address(ftsoV2_) == address(0)) revert FeedUnavailable();
        if (address(fxrp_) == address(0)) revert FxrpRequired();
        ftsoV2 = ftsoV2_;
        fxrp = fxrp_;
        fxrpDecimals = fxrp_.decimals();
    }

    /// A payment is rejected if the feed behind it is older than this.
    uint64 public constant MAX_QUOTE_AGE = 300;

    /// Upper bounds on link identifiers so on-chain state cannot be bloated
    /// without limit by a spammer paying the small per-byte storage cost.
    uint256 private constant MAX_SLUG_LENGTH = 64;
    uint256 private constant MAX_TITLE_LENGTH = 200;

    struct PaymentLink {
        address merchant;
        uint64 priceUsdCents;
        uint64 createdAt;
        uint64 expiresAt;
        bool active;
        uint32 paymentCount;
        uint256 totalReceivedWei;
        uint64 totalReceivedUsdCents;
        string title;
        // Held in storage as well as in the creation event so a reader can
        // list links without replaying history. Public RPC nodes cap log
        // queries to a small block range, which makes log replay impractical
        // once the chain has moved on.
        string slug;
    }

    /// Payment links keyed by the keccak256 hash of their public slug.
    mapping(bytes32 => PaymentLink) private links;

    /// Slug hashes in creation order, so the dashboard can list them.
    bytes32[] private linkIds;

    /// Slug hashes created by each merchant, in creation order.
    mapping(address => bytes32[]) private merchantLinkIds;

    /**
     * A settled payment, kept in storage as well as in the event.
     *
     * Events alone would be cheaper, but reading them back needs wide log
     * queries that public RPC nodes refuse. Storing the record means the
     * merchant view can show settlement history from a plain call.
     */
    struct Payment {
        bytes32 linkId;
        address payer;
        uint256 amountWei;
        uint64 priceUsdCents;
        uint64 paidAt;
        uint256 feedUsdPrice;
        int8 feedUsdDecimals;
        uint8 asset;
    }

    /// Every settled payment, oldest first.
    Payment[] private payments;

    event PaymentLinkCreated(
        bytes32 indexed linkId,
        address indexed merchant,
        string slug,
        string title,
        uint64 priceUsdCents,
        uint64 expiresAt
    );

    event PaymentReceived(
        bytes32 indexed linkId,
        address indexed merchant,
        address indexed payer,
        uint256 amountWei,
        uint64 priceUsdCents,
        uint256 feedUsdPrice,
        int8 feedUsdDecimals,
        uint64 feedTimestamp,
        uint8 asset
    );

    event PaymentLinkClosed(bytes32 indexed linkId, address indexed merchant);

    error SlugRequired();
    error SlugTooLong();
    error SlugTaken();
    error TitleRequired();
    error TitleTooLong();
    error PriceRequired();
    error ExpiryInPast();
    error UnknownLink();
    error LinkInactive();
    error LinkExpired();
    error NotMerchant();
    error Underpaid(uint256 required, uint256 provided);
    error FeedUnavailable();
    error FeedStale(uint64 feedTimestamp, uint256 blockTimestamp);
    error TransferFailed();
    error FxrpRequired();

    /**
     * Publishes a payment request.
     * @param slug The public path segment the customer will visit.
     * @param title Human-readable label shown at checkout.
     * @param priceUsdCents Price in US cents, so $84.00 is 8400.
     * @param expiresAt Unix time after which the link stops accepting payment,
     *        or 0 for a link that does not expire.
     */
    function createPaymentLink(
        string calldata slug,
        string calldata title,
        uint64 priceUsdCents,
        uint64 expiresAt
    ) external returns (bytes32 linkId) {
        if (bytes(slug).length == 0) revert SlugRequired();
        if (bytes(slug).length > MAX_SLUG_LENGTH) revert SlugTooLong();
        if (bytes(title).length == 0) revert TitleRequired();
        if (bytes(title).length > MAX_TITLE_LENGTH) revert TitleTooLong();
        if (priceUsdCents == 0) revert PriceRequired();
        if (expiresAt != 0 && expiresAt <= block.timestamp) revert ExpiryInPast();

        linkId = keccak256(bytes(slug));
        if (links[linkId].merchant != address(0)) revert SlugTaken();

        links[linkId] = PaymentLink({
            merchant: msg.sender,
            priceUsdCents: priceUsdCents,
            createdAt: uint64(block.timestamp),
            expiresAt: expiresAt,
            active: true,
            paymentCount: 0,
            totalReceivedWei: 0,
            totalReceivedUsdCents: 0,
            title: title,
            slug: slug
        });

        linkIds.push(linkId);
        merchantLinkIds[msg.sender].push(linkId);

        emit PaymentLinkCreated(linkId, msg.sender, slug, title, priceUsdCents, expiresAt);
    }

    /**
     * Pays a link in the network's native coin (C2FLR). Send at least the
     * amount reported by `quote`.
     *
     * The conversion is done here rather than trusted from the caller, so a
     * customer cannot pay a stale or self-chosen rate. Anything sent above the
     * converted price is returned to the customer.
     */
    function pay(string calldata slug) external payable {
        bytes32 linkId = keccak256(bytes(slug));
        PaymentLink storage link = links[linkId];

        _assertPayable(link);

        (uint256 requiredWei, uint256 feedValue, int8 feedDecimals, uint64 feedTimestamp) =
            _requiredAmount(link.priceUsdCents, FLR_USD_FEED_ID, 1e18);

        if (msg.value < requiredWei) revert Underpaid(requiredWei, msg.value);

        _settle(
            link,
            linkId,
            msg.sender,
            requiredWei,
            feedValue,
            feedDecimals,
            feedTimestamp,
            ASSET_NATIVE
        );

        uint256 refund = msg.value - requiredWei;

        (bool merchantPaid, ) = payable(link.merchant).call{value: requiredWei}("");
        if (!merchantPaid) revert TransferFailed();

        if (refund > 0) {
            (bool refunded, ) = payable(msg.sender).call{value: refund}("");
            if (!refunded) revert TransferFailed();
        }
    }

    /**
     * Pays a link in FXRP, the FAsset representation of XRP. The payer must
     * first approve this contract to spend their FXRP.
     *
     * @param slug The link to pay.
     * @param amount The total FXRP the contract pulls from the payer. Send at
     *        least the amount reported by `quoteFxrp`. The converted price is
     *        forwarded to the merchant and the surplus is refunded to the
     *        payer in FXRP in the same transaction.
     */
    function payFxrp(string calldata slug, uint256 amount) external {
        bytes32 linkId = keccak256(bytes(slug));
        PaymentLink storage link = links[linkId];

        _assertPayable(link);

        (uint256 requiredFxrp, uint256 feedValue, int8 feedDecimals, uint64 feedTimestamp) =
            _requiredAmount(link.priceUsdCents, XRP_USD_FEED_ID, 10 ** uint256(fxrpDecimals));

        if (amount < requiredFxrp) revert Underpaid(requiredFxrp, amount);

        _settle(
            link,
            linkId,
            msg.sender,
            requiredFxrp,
            feedValue,
            feedDecimals,
            feedTimestamp,
            ASSET_FXRP
        );

        if (!fxrp.transferFrom(msg.sender, address(this), amount)) revert TransferFailed();

        // The merchant receives exactly the dollar value they asked for, and
        // the customer gets the rest back. Customers are expected to send a
        // little extra to absorb rate movement between the quote and mining,
        // so keeping that surplus would make every customer overpay.
        uint256 refund = amount - requiredFxrp;

        if (!fxrp.transfer(link.merchant, requiredFxrp)) revert TransferFailed();

        if (refund > 0) {
            if (!fxrp.transfer(msg.sender, refund)) revert TransferFailed();
        }
    }

    /// Stops a link from accepting further payment. Merchant only.
    function closePaymentLink(string calldata slug) external {
        bytes32 linkId = keccak256(bytes(slug));
        PaymentLink storage link = links[linkId];

        if (link.merchant == address(0)) revert UnknownLink();
        if (link.merchant != msg.sender) revert NotMerchant();

        link.active = false;
        emit PaymentLinkClosed(linkId, msg.sender);
    }

    /**
     * Reports what a customer must send right now to pay a link in C2FLR.
     * The checkout screen calls this to show the native coin amount due.
     */
    function quote(string calldata slug)
        external
        view
        returns (
            uint256 requiredWei,
            uint256 flrUsdPrice,
            int8 flrUsdDecimals,
            uint64 feedTimestamp
        )
    {
        PaymentLink storage link = links[keccak256(bytes(slug))];
        _assertQuoteable(link);

        (requiredWei, flrUsdPrice, flrUsdDecimals, feedTimestamp) =
            _requiredAmount(link.priceUsdCents, FLR_USD_FEED_ID, 1e18);
    }

    /**
     * Reports what a customer must send right now to pay a link in FXRP.
     * The amount is in FXRP base units (6 decimals on Coston2).
     */
    function quoteFxrp(string calldata slug)
        external
        view
        returns (
            uint256 requiredFxrp,
            uint256 xrpUsdPrice,
            int8 xrpUsdDecimals,
            uint64 feedTimestamp
        )
    {
        PaymentLink storage link = links[keccak256(bytes(slug))];
        _assertQuoteable(link);

        (requiredFxrp, xrpUsdPrice, xrpUsdDecimals, feedTimestamp) =
            _requiredAmount(link.priceUsdCents, XRP_USD_FEED_ID, 10 ** uint256(fxrpDecimals));
    }

    /// Converts a US cent amount to C2FLR at the current FLR/USD feed rate.
    function quoteUsdCents(uint64 priceUsdCents)
        external
        view
        returns (
            uint256 requiredWei,
            uint256 flrUsdPrice,
            int8 flrUsdDecimals,
            uint64 feedTimestamp
        )
    {
        if (priceUsdCents == 0) revert PriceRequired();
        (requiredWei, flrUsdPrice, flrUsdDecimals, feedTimestamp) =
            _requiredAmount(priceUsdCents, FLR_USD_FEED_ID, 1e18);
    }

    /// Converts a US cent amount to FXRP at the current XRP/USD feed rate.
    function quoteUsdCentsFxrp(uint64 priceUsdCents)
        external
        view
        returns (
            uint256 requiredFxrp,
            uint256 xrpUsdPrice,
            int8 xrpUsdDecimals,
            uint64 feedTimestamp
        )
    {
        if (priceUsdCents == 0) revert PriceRequired();
        (requiredFxrp, xrpUsdPrice, xrpUsdDecimals, feedTimestamp) =
            _requiredAmount(priceUsdCents, XRP_USD_FEED_ID, 10 ** uint256(fxrpDecimals));
    }

    function getPaymentLink(string calldata slug)
        external
        view
        returns (PaymentLink memory)
    {
        PaymentLink storage link = links[keccak256(bytes(slug))];
        if (link.merchant == address(0)) revert UnknownLink();
        return link;
    }

    function getPaymentLinkById(bytes32 linkId)
        external
        view
        returns (PaymentLink memory)
    {
        PaymentLink storage link = links[linkId];
        if (link.merchant == address(0)) revert UnknownLink();
        return link;
    }

    function linkCount() external view returns (uint256) {
        return linkIds.length;
    }

    /**
     * Returns a page of links, newest first.
     *
     * This is what the merchant view calls. One request returns everything it
     * needs, so the reader never has to scan event logs, which public RPC
     * nodes only serve in narrow block ranges.
     *
     * @param offset How many of the newest links to skip.
     * @param limit Largest number of links to return.
     */
    function getLinks(uint256 offset, uint256 limit)
        external
        view
        returns (PaymentLink[] memory page, uint256 total)
    {
        total = linkIds.length;

        if (offset >= total || limit == 0) {
            return (new PaymentLink[](0), total);
        }

        uint256 remaining = total - offset;
        uint256 size = remaining < limit ? remaining : limit;

        page = new PaymentLink[](size);

        for (uint256 i = 0; i < size; i++) {
            // Walk backwards so the newest link comes first.
            page[i] = links[linkIds[total - 1 - offset - i]];
        }
    }

    function linkIdAt(uint256 index) external view returns (bytes32) {
        return linkIds[index];
    }

    function paymentCount() external view returns (uint256) {
        return payments.length;
    }

    /**
     * Returns a page of settled payments, newest first, each paired with the
     * slug of the link it paid.
     *
     * @param offset How many of the newest payments to skip.
     * @param limit Largest number of payments to return.
     */
    function getPayments(uint256 offset, uint256 limit)
        external
        view
        returns (Payment[] memory page, string[] memory slugs, uint256 total)
    {
        total = payments.length;

        if (offset >= total || limit == 0) {
            return (new Payment[](0), new string[](0), total);
        }

        uint256 remaining = total - offset;
        uint256 size = remaining < limit ? remaining : limit;

        page = new Payment[](size);
        slugs = new string[](size);

        for (uint256 i = 0; i < size; i++) {
            Payment storage payment = payments[total - 1 - offset - i];
            page[i] = payment;
            slugs[i] = links[payment.linkId].slug;
        }
    }

    function merchantLinkCount(address merchant) external view returns (uint256) {
        return merchantLinkIds[merchant].length;
    }

    function merchantLinkIdAt(address merchant, uint256 index)
        external
        view
        returns (bytes32)
    {
        return merchantLinkIds[merchant][index];
    }

    /// Reads the live FTSOv2 FLR/USD feed.
    function flrUsdFeed()
        external
        view
        returns (uint256 value, int8 decimals, uint64 timestamp)
    {
        return ftsoV2.getFeedById(FLR_USD_FEED_ID);
    }

    /// Reads the live FTSOv2 XRP/USD feed.
    function xrpUsdFeed()
        external
        view
        returns (uint256 value, int8 decimals, uint64 timestamp)
    {
        return ftsoV2.getFeedById(XRP_USD_FEED_ID);
    }

    function _assertPayable(PaymentLink storage link) private view {
        if (link.merchant == address(0)) revert UnknownLink();
        if (!link.active) revert LinkInactive();
        if (link.expiresAt != 0 && block.timestamp > link.expiresAt) revert LinkExpired();
    }

    function _assertQuoteable(PaymentLink storage link) private view {
        if (link.merchant == address(0)) revert UnknownLink();
        if (!link.active) revert LinkInactive();
        if (link.expiresAt != 0 && block.timestamp > link.expiresAt) revert LinkExpired();
    }

    /**
     * Records a settlement on a link and emits its event, before any external
     * call. The link is already inactive, so a re-entering caller cannot pay
     * it again, but keeping the record write ahead of the transfers makes the
     * state change structural rather than incidental.
     */
    function _settle(
        PaymentLink storage link,
        bytes32 linkId,
        address payer,
        uint256 amount,
        uint256 feedValue,
        int8 feedDecimals,
        uint64 feedTimestamp,
        uint8 asset
    ) private {
        link.paymentCount += 1;
        link.totalReceivedWei += amount;
        link.totalReceivedUsdCents += link.priceUsdCents;
        link.active = false;
        emit PaymentLinkClosed(linkId, link.merchant);

        payments.push(
            Payment({
                linkId: linkId,
                payer: payer,
                amountWei: amount,
                priceUsdCents: link.priceUsdCents,
                paidAt: uint64(block.timestamp),
                feedUsdPrice: feedValue,
                feedUsdDecimals: feedDecimals,
                asset: asset
            })
        );

        emit PaymentReceived(
            linkId,
            link.merchant,
            payer,
            amount,
            link.priceUsdCents,
            feedValue,
            feedDecimals,
            feedTimestamp,
            asset
        );
    }

    /**
     * Converts US cents to an asset amount using the FTSOv2 feed.
     *
     * The feed reports how many US dollars one unit is worth, scaled by
     * 10**decimals. To find the coin amount for a dollar price:
     *
     *   amount = cents * 10**16 * 10**decimals / feedValue
     *
     * The 10**16 term converts cents to a unit-scaled dollar figure for the
     * native coin (10**18 units per coin). For FXRP the unit scale is
     * 10**fxrpDecimals (6 on Coston2), so the caller passes it in.
     *
     * @param unitScale 10**tokenDecimals for the asset being quoted.
     */
    function _requiredAmount(uint64 priceUsdCents, bytes21 feedId, uint256 unitScale)
        private
        view
        returns (
            uint256 required,
            uint256 feedValue,
            int8 feedDecimals,
            uint64 feedTimestamp
        )
    {
        (feedValue, feedDecimals, feedTimestamp) = ftsoV2.getFeedById(feedId);

        if (feedValue == 0) revert FeedUnavailable();

        // A feed timestamp far behind the block means the oracle has stalled.
        if (
            feedTimestamp != 0 &&
            block.timestamp > feedTimestamp &&
            block.timestamp - feedTimestamp > MAX_QUOTE_AGE
        ) {
            revert FeedStale(feedTimestamp, block.timestamp);
        }

        uint256 scaledCents = uint256(priceUsdCents) * (unitScale / 100);

        // Ceiling division so a price that does not split evenly into base
        // units is rounded up, never down. Rounding down would quietly short
        // the merchant by a fraction of a unit on every payment; rounding up
        // costs the customer at most one unit, which the surplus refund
        // absorbs.
        if (feedDecimals >= 0) {
            uint256 scale = 10 ** uint256(uint8(feedDecimals));
            required = (scaledCents * scale + feedValue - 1) / feedValue;
        } else {
            // A negative decimals value means the feed is scaled up, not down.
            uint256 scale = 10 ** uint256(uint8(-feedDecimals));
            required = (scaledCents + feedValue * scale - 1) / (feedValue * scale);
        }
    }
}
