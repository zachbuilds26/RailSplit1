import { privateKeyToAccount } from "viem/accounts";
import { createPublicClient, http, keccak256, stringToHex } from "viem";
import { xrplevmTestnet } from "viem/chains";
import { RAILSPLIT_PAY_XRP_ABI } from "@/lib/railsplit-pay-xrp-abi";
import { XRPL_EVM_PAY_ADDRESS } from "@/lib/xrp-contract-address";
import { fetchXrpUsdRate, XRP_USD_PRICE_DECIMALS } from "@/lib/xrp-rate";

export const dynamic = "force-dynamic";

const RPC_URL = process.env.XRP_RPC_URL || "https://rpc.testnet.xrplevm.org";
const QUOTE_TTL_SECONDS = BigInt(Math.min(readPositiveInteger(process.env.XRP_QUOTE_TTL_SECONDS, 60), 60));
const MAX_RATE_AGE_SECONDS = 15n;

function readPositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug")?.trim();

  if (!slug) {
    return Response.json({ error: "Missing slug." }, { status: 400 });
  }

  if (!XRPL_EVM_PAY_ADDRESS) {
    return Response.json({ error: "The XRP contract has not been deployed yet." }, { status: 503 });
  }

  const quoteSignerKey = process.env.XRP_QUOTE_SIGNER_PRIVATE_KEY;
  if (!quoteSignerKey) {
    return Response.json({ error: "The XRP quote signer is not configured." }, { status: 503 });
  }

  const client = createPublicClient({
    chain: xrplevmTestnet,
    transport: http(RPC_URL),
  });

  let link:
    | {
        merchant: `0x${string}`;
        priceUsdCents: bigint;
        createdAt: bigint;
        expiresAt: bigint;
        active: boolean;
        paymentCount: number;
        totalReceivedWei: bigint;
        totalReceivedUsdCents: bigint;
        title: string;
        slug: string;
      }
    | undefined;

  try {
    link = (await client.readContract({
      address: XRPL_EVM_PAY_ADDRESS as `0x${string}`,
      abi: RAILSPLIT_PAY_XRP_ABI,
      functionName: "getPaymentLink",
      args: [slug],
    })) as typeof link;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/UnknownLink/i.test(message)) {
      return Response.json({ error: "This XRP checkout link could not be found." }, { status: 404 });
    }

    return Response.json({ error: "The XRP checkout could not be read." }, { status: 502 });
  }

  if (!link) {
    return Response.json({ error: "This XRP checkout link could not be found." }, { status: 404 });
  }

  let rate: Awaited<ReturnType<typeof fetchXrpUsdRate>>;
  try {
    rate = await fetchXrpUsdRate();
  } catch {
    return Response.json({ error: "The XRP quote service is temporarily unavailable. Try again in a moment." }, { status: 502 });
  }

  const xrpUsdPrice = rate.xrpUsdPrice;
  const linkId = keccak256(stringToHex(slug));
  let requiredWei: bigint;
  try {
    requiredWei = (await client.readContract({
      address: XRPL_EVM_PAY_ADDRESS as `0x${string}`,
      abi: RAILSPLIT_PAY_XRP_ABI,
      functionName: "quote",
      args: [slug, xrpUsdPrice],
    })) as bigint;
  } catch {
    return Response.json({ error: "The XRP payment amount could not be calculated. Try again in a moment." }, { status: 502 });
  }

  const issuedAt = BigInt(Math.floor(Date.now() / 1000));
  if (issuedAt - rate.updatedAt > MAX_RATE_AGE_SECONDS) {
    return Response.json({ error: "The XRP quote service is temporarily unavailable. Try again in a moment." }, { status: 502 });
  }
  const validUntil = issuedAt + QUOTE_TTL_SECONDS;

  let signature: `0x${string}`;
  try {
    const account = privateKeyToAccount(quoteSignerKey as `0x${string}`);
    signature = await account.signTypedData({
      domain: {
        name: "RailSplit XRP Quote",
        version: "1",
        chainId: xrplevmTestnet.id,
        verifyingContract: XRPL_EVM_PAY_ADDRESS as `0x${string}`,
      },
      types: {
        PaymentQuote: [
          { name: "linkId", type: "bytes32" },
          { name: "priceUsdCents", type: "uint64" },
          { name: "xrpUsdPrice", type: "uint256" },
          { name: "issuedAt", type: "uint64" },
          { name: "validUntil", type: "uint64" },
        ],
      },
      primaryType: "PaymentQuote",
      message: {
        linkId,
        priceUsdCents: link.priceUsdCents,
        xrpUsdPrice,
        issuedAt,
        validUntil,
      },
    });
  } catch {
    return Response.json({ error: "The XRP quote service is temporarily unavailable. Try again in a moment." }, { status: 503 });
  }

  return Response.json({
    railKey: "xrpl-evm-testnet",
    slug,
    title: link.title,
    linkId,
    merchant: link.merchant,
    priceUsdCents: link.priceUsdCents.toString(),
    xrpUsdPrice: xrpUsdPrice.toString(),
    requiredWei: requiredWei.toString(),
    issuedAt: issuedAt.toString(),
    validUntil: validUntil.toString(),
    signature,
    quoteDecimals: XRP_USD_PRICE_DECIMALS,
    chainId: xrplevmTestnet.id,
    contractAddress: XRPL_EVM_PAY_ADDRESS,
  });
}
