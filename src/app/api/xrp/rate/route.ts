import { fetchXrpUsdRate, XRP_USD_PRICE_DECIMALS } from "@/lib/xrp-rate";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rate = await fetchXrpUsdRate();

    return Response.json(
      {
        xrpUsdPrice: rate.xrpUsdPrice.toString(),
        quoteDecimals: XRP_USD_PRICE_DECIMALS,
        updatedAt: rate.updatedAt.toString(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "The XRP price source is unavailable.";
    return Response.json({ error: message }, { status: 502 });
  }
}
