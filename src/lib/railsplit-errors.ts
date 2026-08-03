const QUOTE_BUFFER_BPS = 150n;
const BPS = 10000n;

function collectErrorText(value: unknown, seen = new Set<unknown>(), out: string[] = []): string[] {
  if (!value || typeof value !== "object" || seen.has(value)) return out;
  seen.add(value);

  const record = value as Record<string, unknown>;
  for (const key of ["shortMessage", "message", "details", "errorName", "name"]) {
    const entry = record[key];
    if (typeof entry === "string") out.push(entry);
  }

  const metaMessages = record.metaMessages;
  if (Array.isArray(metaMessages)) {
    for (const item of metaMessages) {
      if (typeof item === "string") out.push(item);
    }
  }

  for (const key of ["cause", "data", "error", "origin"] as const) {
    collectErrorText(record[key], seen, out);
  }

  return out;
}

export function isUnknownLinkError(error: unknown) {
  return collectErrorText(error).some((entry) => /\bUnknownLink\b/.test(entry));
}

export function formatReadError(error: unknown, fallback = "RailSplit could not load the network right now. Try again in a moment.") {
  if (isUnknownLinkError(error)) return "This checkout link could not be found.";

  const text = collectErrorText(error).join(" ").replace(/\s+/g, " ").trim();
  if (/http request failed|failed to fetch|fetch failed/i.test(text)) {
    return "The network is unavailable right now. Try again in a moment.";
  }
  if (/429|rate limit|too many requests/i.test(text)) {
    return "The network is busy right now. Try again in a moment.";
  }
  if (/timeout|timed out/i.test(text)) {
    return "The network timed out. Try again in a moment.";
  }
  if (/execution reverted/i.test(text)) {
    return "The ledger is unavailable right now. Try again in a moment.";
  }

  return fallback;
}

export function formatWriteError(
  error: unknown,
  fallback = "The payment link could not be published. Try again in a moment.",
) {
  const text = collectErrorText(error).join(" ").replace(/\s+/g, " ").trim();

  if (/user rejected|user denied/i.test(text)) {
    return "You cancelled the transaction in your wallet.";
  }
  if (/insufficient funds/i.test(text)) {
    return "This wallet needs more testnet funds for gas.";
  }
  if (/SlugTaken/i.test(text)) {
    return "That URL is already taken onchain. Choose another.";
  }
  if (/TitleRequired/i.test(text)) {
    return "Enter a title your customer will recognise.";
  }
  if (/PriceRequired/i.test(text)) {
    return "Enter an amount greater than zero.";
  }
  if (/ExpiryInPast/i.test(text)) {
    return "Choose an expiry in the future.";
  }
  if (/execution reverted/i.test(text)) {
    return "The transaction was reverted onchain. Try again in a moment.";
  }

  return fallback;
}

export function withQuoteBuffer(requiredWei: bigint) {
  return requiredWei + (requiredWei * QUOTE_BUFFER_BPS) / BPS;
}
