// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {TestFtsoV2Interface} from "@flarenetwork/flare-periphery-contracts/coston2/TestFtsoV2Interface.sol";
import {ContractRegistry} from "@flarenetwork/flare-periphery-contracts/coston2/ContractRegistry.sol";

/**
 * RailSplitPay lets a merchant publish a payment request priced in US dollars
 * and be paid in the network's native coin.
 *
 * The merchant never has to quote a coin amount. The contract reads the
 * FTSOv2 FLR/USD feed when the customer pays, converts the dollar price to
 * the coin amount at that moment, and forwards the coin to the merchant.
 * A payment is accepted only if it covers the converted price, so the
 * merchant receives the dollar value they asked for.
 */
contract RailSplitPay {
    /// FTSOv2 feed id for FLR/USD. The bytes hold "FLR/USD" behind a 0x01 category byte.
    bytes21 public constant FLR_USD_FEED_ID =
        bytes21(0x01464c522f55534400000000000000000000000000);

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
        uint256 flrUsdPrice;
        int8 flrUsdDecimals;
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
        uint256 flrUsdPrice,
        int8 flrUsdDecimals,
        uint64 feedTimestamp
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
     * Pays a link. Send at least the amount reported by `quote`.
     *
     * The conversion is done here rather than trusted from the caller, so a
     * customer cannot pay a stale or self-chosen rate. Anything sent above the
     * converted price is returned to the customer.
     */
    function pay(string calldata slug) external payable {
        bytes32 linkId = keccak256(bytes(slug));
        PaymentLink storage link = links[linkId];

        if (link.merchant == address(0)) revert UnknownLink();
        if (!link.active) revert LinkInactive();
        if (link.expiresAt != 0 && block.timestamp > link.expiresAt) revert LinkExpired();

        (uint256 requiredWei, uint256 feedValue, int8 feedDecimals, uint64 feedTimestamp) =
            _requiredWei(link.priceUsdCents);

        if (msg.value < requiredWei) revert Underpaid(requiredWei, msg.value);

        link.paymentCount += 1;
        link.totalReceivedWei += requiredWei;
        link.totalReceivedUsdCents += link.priceUsdCents;
        link.active = false;
        emit PaymentLinkClosed(linkId, link.merchant);

        // Record the payment and surface its event before any external call.
        // The link is already inactive, so a re-entering caller cannot pay it
        // again, but keeping the record write ahead of the transfers makes
        // the state change structural rather than incidental.
        payments.push(
            Payment({
                linkId: linkId,
                payer: msg.sender,
                amountWei: requiredWei,
                priceUsdCents: link.priceUsdCents,
                paidAt: uint64(block.timestamp),
                flrUsdPrice: feedValue,
                flrUsdDecimals: feedDecimals
            })
        );

        emit PaymentReceived(
            linkId,
            link.merchant,
            msg.sender,
            requiredWei,
            link.priceUsdCents,
            feedValue,
            feedDecimals,
            feedTimestamp
        );

        // The merchant receives exactly the dollar value they asked for, and
        // the customer gets the rest back. Customers are expected to send a
        // little extra to absorb rate movement between the quote and mining,
        // so keeping that surplus would make every customer overpay.
        uint256 refund = msg.value - requiredWei;

        (bool merchantPaid, ) = payable(link.merchant).call{value: requiredWei}("");
        if (!merchantPaid) revert TransferFailed();

        if (refund > 0) {
            (bool refunded, ) = payable(msg.sender).call{value: refund}("");
            if (!refunded) revert TransferFailed();
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
     * Reports what a customer must send right now to pay a link.
     * The checkout screen calls this to show the coin amount due.
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
        if (link.merchant == address(0)) revert UnknownLink();

        return _requiredWei(link.priceUsdCents);
    }

    /// Converts a US cent amount to wei at the current feed rate.
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
        return _requiredWei(priceUsdCents);
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
        TestFtsoV2Interface ftsoV2 = ContractRegistry.getTestFtsoV2();
        return ftsoV2.getFeedById(FLR_USD_FEED_ID);
    }

    /**
     * Converts US cents to wei using the FTSOv2 FLR/USD feed.
     *
     * The feed reports how many US dollars one FLR is worth, scaled by
     * 10**decimals. To find the coin amount for a dollar price:
     *
     *   wei = cents * 10**16 * 10**decimals / feedValue
     *
     * The 10**16 term converts cents to a wei-scaled dollar figure, since
     * 1 dollar is 100 cents and 1 coin is 10**18 wei.
     */
    function _requiredWei(uint64 priceUsdCents)
        private
        view
        returns (
            uint256 requiredWei,
            uint256 feedValue,
            int8 feedDecimals,
            uint64 feedTimestamp
        )
    {
        TestFtsoV2Interface ftsoV2 = ContractRegistry.getTestFtsoV2();
        (feedValue, feedDecimals, feedTimestamp) = ftsoV2.getFeedById(FLR_USD_FEED_ID);

        if (feedValue == 0) revert FeedUnavailable();

        // A feed timestamp far behind the block means the oracle has stalled.
        if (
            feedTimestamp != 0 &&
            block.timestamp > feedTimestamp &&
            block.timestamp - feedTimestamp > MAX_QUOTE_AGE
        ) {
            revert FeedStale(feedTimestamp, block.timestamp);
        }

        uint256 scaledCents = uint256(priceUsdCents) * 1e16;

        if (feedDecimals >= 0) {
            requiredWei = (scaledCents * (10 ** uint256(uint8(feedDecimals)))) / feedValue;
        } else {
            // A negative decimals value means the feed is scaled up, not down.
            requiredWei = scaledCents / (feedValue * (10 ** uint256(uint8(-feedDecimals))));
        }
    }
}
