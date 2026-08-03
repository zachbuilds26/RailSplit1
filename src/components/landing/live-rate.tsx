"use client";

import { railsplitChain } from "@/lib/chain";
import { formatReadError } from "@/lib/railsplit-errors";
import {
  formatCoin,
  formatFeedPrice,
  quoteUsdCentsToWei,
  useFeedAge,
  useFlrUsdFeed,
} from "@/lib/use-railsplit";

const SAMPLE_USD_CENTS = 25n;

/**
 * Hero panel showing the current settlement rate and what a sample dollar price
 * converts to right now. It uses the same live feed the checkout uses, so the
 * landing page stays aligned with settlement.
 */
export function LiveRate() {
  const feed = useFlrUsdFeed();
  const age = useFeedAge(feed.timestamp);

  const sampleWei = quoteUsdCentsToWei(SAMPLE_USD_CENTS, feed.value, feed.decimals);
  const isStale = age !== undefined && age > 300;

  return (
    <div className="relative border border-line bg-background-deep p-4 shadow-2xl shadow-black/30 sm:p-5">
      <div className="flex items-center justify-between border-b border-line pb-4 text-[10px] font-semibold tracking-[0.14em] text-faint uppercase">
        <span>Live settlement rate</span>
        <span className="inline-flex items-center gap-1.5 text-accent">
          <span className="size-1.5 bg-accent" />
          {feed.error ? "Unavailable" : feed.isLoading ? "Updating" : isStale ? "Stale" : "Live"}
        </span>
      </div>

      {feed.error ? (
        <div className="py-7">
          <p className="text-xs text-muted">USD to C2FLR</p>
          <p className="price-figure mt-2 text-xl sm:text-2xl">Live rate unavailable</p>
          <p className="mt-2 text-sm leading-6 text-muted">
            {formatReadError(feed.error, "RailSplit could not read the live rate right now. Try again in a moment.")}
          </p>
          <button
            type="button"
            onClick={() => feed.refetch()}
            className="mt-4 inline-flex border border-line px-4 py-2 text-xs font-semibold hover:border-line-strong hover:bg-surface"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          <div className="py-7">
            <p className="text-xs text-muted">USD to C2FLR</p>
            <p className="price-figure mt-2 text-xl sm:text-2xl">
              {formatFeedPrice(feed.value, feed.decimals)}
            </p>
            <p className="mt-2 text-sm text-muted tabular-nums">
              {age === undefined
                ? "Reading the feed…"
                : isStale
                  ? `Updated ${age}s ago · refresh required`
                  : `Updated ${age}s ago`}
            </p>
          </div>

          <div className="border-y border-line py-4">
            <p className="text-[10px] font-semibold tracking-[0.14em] text-faint uppercase">
              Sample payment amount
            </p>
            <p className="price-figure mt-3 text-lg sm:text-xl">
              {isStale ? (
                <span className="text-base text-warning">Feed too old to quote</span>
              ) : sampleWei === undefined ? (
                <span className="text-base text-muted">—</span>
              ) : (
                <>
                  {formatCoin(sampleWei, 2)}{" "}
                  <span className="text-sm text-muted">{railsplitChain.nativeCurrency.symbol}</span>
                </>
              )}
            </p>
          </div>

          <p className="mt-5 text-xs leading-5 text-muted">
            {isStale
              ? "The live rate is older than 300 seconds. Refresh before paying."
              : "This preview uses the same live rate the checkout uses at confirmation."}
          </p>
        </>
      )}
    </div>
  );
}
