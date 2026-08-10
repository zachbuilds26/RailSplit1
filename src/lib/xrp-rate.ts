const DEFAULT_XRP_PRICE_SOURCE_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=ripple&vs_currencies=usd";

/** Matches RailSplitPayXrp.QUOTE_PRICE_DECIMALS on the deployed contract. */
export const XRP_USD_PRICE_DECIMALS = 8;

export class XrpRateSourceError extends Error {
  constructor(message = "The XRP price source is unavailable.") {
    super(message);
    this.name = "XrpRateSourceError";
  }
}

export async function fetchXrpUsdRate() {
  const sourceUrl = process.env.XRP_PRICE_SOURCE_URL || DEFAULT_XRP_PRICE_SOURCE_URL;

  let response: Response;
  try {
    response = await fetch(sourceUrl, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    throw new XrpRateSourceError();
  }

  if (!response.ok) {
    throw new XrpRateSourceError();
  }

  let data: { ripple?: { usd?: number } };
  try {
    data = (await response.json()) as { ripple?: { usd?: number } };
  } catch {
    throw new XrpRateSourceError("The XRP price source returned an invalid value.");
  }

  const xrpUsd = data.ripple?.usd;
  if (typeof xrpUsd !== "number" || !Number.isFinite(xrpUsd) || xrpUsd <= 0) {
    throw new XrpRateSourceError("The XRP price source returned an invalid value.");
  }

  return {
    xrpUsdPrice: BigInt(Math.max(1, Math.round(xrpUsd * 10 ** XRP_USD_PRICE_DECIMALS))),
    updatedAt: BigInt(Math.floor(Date.now() / 1000)),
  };
}
