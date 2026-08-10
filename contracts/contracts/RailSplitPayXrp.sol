// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/**
 * RailSplitPayXrp lets a merchant publish a USD-priced payment link and be
 * paid in the XRPL EVM Testnet native coin, XRP.
 *
 * The contract does not depend on a Flare feed. Instead, the checkout obtains
 * a short-lived signed XRP/USD quote from the server, and the contract verifies
 * that signature before accepting payment.
 */
contract RailSplitPayXrp {
    bytes32 private constant EIP712_DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
    bytes32 private constant QUOTE_TYPEHASH =
        keccak256("PaymentQuote(bytes32 linkId,uint64 priceUsdCents,uint256 xrpUsdPrice,uint64 issuedAt,uint64 validUntil)");

    uint8 public constant QUOTE_PRICE_DECIMALS = 8;
    uint64 public constant MAX_QUOTE_AGE = 60;

    address public immutable quoteSigner;
    bytes32 private immutable DOMAIN_SEPARATOR;

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
        string slug;
    }

    struct Payment {
        bytes32 linkId;
        address payer;
        uint256 amountWei;
        uint64 priceUsdCents;
        uint256 xrpUsdPrice;
        uint64 quoteIssuedAt;
        uint64 quoteValidUntil;
        uint64 paidAt;
    }

    mapping(bytes32 => PaymentLink) private links;
    bytes32[] private linkIds;
    mapping(address => bytes32[]) private merchantLinkIds;
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
        uint256 xrpUsdPrice,
        uint64 quoteIssuedAt,
        uint64 quoteValidUntil,
        uint64 paidAt
    );

    event PaymentLinkClosed(bytes32 indexed linkId, address indexed merchant);

    error SlugRequired();
    error SlugTaken();
    error TitleRequired();
    error PriceRequired();
    error ExpiryInPast();
    error UnknownLink();
    error LinkInactive();
    error LinkExpired();
    error InvalidQuoteSignature();
    error QuoteExpired();
    error QuoteInvalidWindow();
    error Underpaid(uint256 required, uint256 provided);
    error TransferFailed();
    error QuoteSignerRequired();

    constructor(address quoteSigner_) {
        if (quoteSigner_ == address(0)) revert QuoteSignerRequired();

        quoteSigner = quoteSigner_;
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                EIP712_DOMAIN_TYPEHASH,
                keccak256(bytes("RailSplit XRP Quote")),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
    }

    function createPaymentLink(
        string calldata slug,
        string calldata title,
        uint64 priceUsdCents,
        uint64 expiresAt
    ) external returns (bytes32 linkId) {
        if (bytes(slug).length == 0) revert SlugRequired();
        if (bytes(title).length == 0) revert TitleRequired();
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

    function pay(
        string calldata slug,
        uint256 xrpUsdPrice,
        uint64 quoteIssuedAt,
        uint64 quoteValidUntil,
        bytes calldata signature
    ) external payable {
        bytes32 linkId = keccak256(bytes(slug));
        PaymentLink storage link = links[linkId];

        if (link.merchant == address(0)) revert UnknownLink();
        if (!link.active) revert LinkInactive();
        if (link.expiresAt != 0 && block.timestamp > link.expiresAt) revert LinkExpired();

        _validateQuote(linkId, link.priceUsdCents, xrpUsdPrice, quoteIssuedAt, quoteValidUntil, signature);

        uint256 requiredWei = quoteUsdCentsToWei(link.priceUsdCents, xrpUsdPrice);
        if (msg.value < requiredWei) revert Underpaid(requiredWei, msg.value);

        link.paymentCount += 1;
        link.totalReceivedWei += requiredWei;
        link.totalReceivedUsdCents += link.priceUsdCents;
        link.active = false;
        emit PaymentLinkClosed(linkId, link.merchant);

        uint256 refund = msg.value - requiredWei;

        (bool merchantPaid, ) = payable(link.merchant).call{value: requiredWei}("");
        if (!merchantPaid) revert TransferFailed();

        if (refund > 0) {
            (bool refunded, ) = payable(msg.sender).call{value: refund}("");
            if (!refunded) revert TransferFailed();
        }

        payments.push(
            Payment({
                linkId: linkId,
                payer: msg.sender,
                amountWei: requiredWei,
                priceUsdCents: link.priceUsdCents,
                xrpUsdPrice: xrpUsdPrice,
                quoteIssuedAt: quoteIssuedAt,
                quoteValidUntil: quoteValidUntil,
                paidAt: uint64(block.timestamp)
            })
        );

        emit PaymentReceived(
            linkId,
            link.merchant,
            msg.sender,
            requiredWei,
            link.priceUsdCents,
            xrpUsdPrice,
            quoteIssuedAt,
            quoteValidUntil,
            uint64(block.timestamp)
        );
    }

    function quote(string calldata slug, uint256 xrpUsdPrice) external view returns (uint256 requiredWei) {
        PaymentLink storage link = links[keccak256(bytes(slug))];
        if (link.merchant == address(0)) revert UnknownLink();

        return quoteUsdCentsToWei(link.priceUsdCents, xrpUsdPrice);
    }

    function quoteUsdCents(uint64 priceUsdCents, uint256 xrpUsdPrice)
        external
        pure
        returns (uint256 requiredWei)
    {
        if (priceUsdCents == 0) revert PriceRequired();
        return quoteUsdCentsToWei(priceUsdCents, xrpUsdPrice);
    }

    function getPaymentLink(string calldata slug) external view returns (PaymentLink memory) {
        PaymentLink storage link = links[keccak256(bytes(slug))];
        if (link.merchant == address(0)) revert UnknownLink();
        return link;
    }

    function getPaymentLinkById(bytes32 linkId) external view returns (PaymentLink memory) {
        PaymentLink storage link = links[linkId];
        if (link.merchant == address(0)) revert UnknownLink();
        return link;
    }

    function linkCount() external view returns (uint256) {
        return linkIds.length;
    }

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
            page[i] = links[linkIds[total - 1 - offset - i]];
        }
    }

    function paymentCount() external view returns (uint256) {
        return payments.length;
    }

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

    function _validateQuote(
        bytes32 linkId,
        uint64 priceUsdCents,
        uint256 xrpUsdPrice,
        uint64 quoteIssuedAt,
        uint64 quoteValidUntil,
        bytes calldata signature
    ) private view {
        if (xrpUsdPrice == 0) revert QuoteInvalidWindow();
        if (quoteValidUntil <= quoteIssuedAt) revert QuoteInvalidWindow();
        if (quoteValidUntil - quoteIssuedAt > MAX_QUOTE_AGE) revert QuoteInvalidWindow();
        if (block.timestamp < quoteIssuedAt) revert QuoteInvalidWindow();
        if (block.timestamp > quoteValidUntil) revert QuoteExpired();
        if (block.timestamp > quoteIssuedAt + MAX_QUOTE_AGE) revert QuoteExpired();

        bytes32 structHash = keccak256(
            abi.encode(QUOTE_TYPEHASH, linkId, priceUsdCents, xrpUsdPrice, quoteIssuedAt, quoteValidUntil)
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));
        address recovered = _recover(digest, signature);

        if (recovered != quoteSigner) revert InvalidQuoteSignature();
    }

    function _recover(bytes32 digest, bytes calldata signature) private pure returns (address) {
        if (signature.length != 65) return address(0);

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }

        if (v < 27) v += 27;
        if (v != 27 && v != 28) return address(0);

        return ecrecover(digest, v, r, s);
    }

    function quoteUsdCentsToWei(uint64 priceUsdCents, uint256 xrpUsdPrice)
        public
        pure
        returns (uint256 requiredWei)
    {
        uint256 scaledCents = uint256(priceUsdCents) * 1e16;
        requiredWei = (scaledCents * (10 ** uint256(QUOTE_PRICE_DECIMALS))) / xrpUsdPrice;
    }
}
