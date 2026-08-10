/** Matches RailSplitPayXrp.QUOTE_PRICE_DECIMALS on the deployed contract. */
export const XRP_USD_PRICE_DECIMALS = 8;

const PRICE_SCALE = 10n ** BigInt(XRP_USD_PRICE_DECIMALS);
const PROVIDER_TIMEOUT_MS = 3000;

/** How long the last good XRP price stays usable after every live feed fails. */
export const XRP_RATE_CACHE_MAX_AGE_MS = 45_000;

let cachedRate: XrpUsdRateCacheEntry | undefined;

type XrpUsdRateCacheEntry = {
  xrpUsdPrice: bigint;
  fetchedAtMs: number;
};

type PriceProvider = {
  name: string;
  url: string;
  getPrice: (data: unknown) => unknown;
};

const PROVIDERS: readonly PriceProvider[] = [
  {
    name: "CoinGecko",
    url: "https://api.coingecko.com/api/v3/simple/price?ids=ripple&vs_currencies=usd",
    getPrice: (data) => (data as { ripple?: { usd?: unknown } })?.ripple?.usd,
  },
  {
    name: "Coinbase",
    url: "https://api.coinbase.com/v2/prices/XRP-USD/spot",
    getPrice: (data) => (data as { data?: { amount?: unknown } })?.data?.amount,
  },
  {
    name: "Bitstamp",
    url: "https://www.bitstamp.net/api/v2/ticker/xrpusd/",
    getPrice: (data) => (data as { last?: unknown })?.last,
  },
];

export class XrpRateSourceError extends Error {
  constructor() {
    super("The XRP quote service is temporarily unavailable. Try again in a moment.");
    this.name = "XrpRateSourceError";
  }
}

function parseScaledUsdPrice(value: unknown) {
  const raw = typeof value === "number" ? String(value) : typeof value === "string" ? value.trim() : "";
  if (!/^\d+(?:\.\d+)?$/.test(raw)) return undefined;

  const [whole, fraction = ""] = raw.split(".");
  const scaledFraction = `${fraction}${"0".repeat(XRP_USD_PRICE_DECIMALS)}`.slice(0, XRP_USD_PRICE_DECIMALS);
  const scaled = BigInt(whole) * PRICE_SCALE + BigInt(scaledFraction);

  return scaled > 0n ? scaled : undefined;
}

async function fetchProviderPrice(provider: PriceProvider) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);

  try {
    const response = await fetch(provider.url, {
      headers: { accept: "application/json" },
      cache: "no-store",
      redirect: "error",
      signal: controller.signal,
    });

    if (!response.ok) return undefined;

    const data = await response.json() as unknown;
    return parseScaledUsdPrice(provider.getPrice(data));
  } catch {
    return undefined;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchXrpUsdRate() {
  for (const provider of PROVIDERS) {
    const xrpUsdPrice = await fetchProviderPrice(provider);
    if (xrpUsdPrice !== undefined) {
      cachedRate = { xrpUsdPrice, fetchedAtMs: Date.now() };
      return {
        xrpUsdPrice,
        updatedAt: BigInt(Math.floor(cachedRate.fetchedAtMs / 1000)),
      };
    }
  }

  if (cachedRate && Date.now() - cachedRate.fetchedAtMs <= XRP_RATE_CACHE_MAX_AGE_MS) {
    return {
      xrpUsdPrice: cachedRate.xrpUsdPrice,
      updatedAt: BigInt(Math.floor(Date.now() / 1000)),
    };
  }

  throw new XrpRateSourceError();
}
