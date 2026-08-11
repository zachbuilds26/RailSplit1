"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { RailsplitLogo } from "@/components/ui/railsplit-logo";
import { formatUsdCents } from "@/lib/use-railsplit";
import {
  clearStoredReceipts,
  useStoredReceipts,
} from "@/lib/receipt-history";

/**
 * Receipts confirmed on this device, kept in local storage so a receipt stays
 * reachable after the checkout tab is closed. The transaction hash is not
 * stored on-chain, so this list is the only way back to a past receipt.
 */
export function ReceiptsHistory() {
  const receipts = useStoredReceipts();

  function removeAll() {
    clearStoredReceipts();
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background-deep px-5 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <RailsplitLogo />
        </div>

        <section className="border border-line bg-surface">
          <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.15em] text-faint uppercase">
                On this device
              </p>
              <h1 className="font-display mt-2 text-2xl tracking-[-0.04em]">My receipts</h1>
            </div>
            {receipts.length > 0 && (
              <button
                type="button"
                onClick={removeAll}
                className="text-xs font-semibold text-muted underline underline-offset-2 hover:text-ink"
              >
                Clear all
              </button>
            )}
          </div>

          {receipts.length === 0 && (
            <div className="p-6 text-center">
              <span className="mx-auto grid size-11 place-items-center border border-line text-muted">
                <Icon name="check" className="size-5" />
              </span>
              <h2 className="font-display mt-5 text-lg tracking-[-0.03em]">
                No receipts yet
              </h2>
              <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-muted">
                Complete a payment on this device and it will be stored here, so you can always
                find your way back to the receipt.
              </p>
            </div>
          )}

          {receipts.length > 0 && (
            <ul className="divide-y divide-line">
              {receipts.map((receipt) => (
                <li key={receipt.hash} className="flex items-start justify-between gap-4 p-5 sm:px-6">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{receipt.title}</p>
                    <p className="mt-1 text-xs text-muted tabular-nums">
                      {new Date(receipt.paidAt * 1000).toLocaleString()}
                    </p>
                    <p className="mt-1 truncate font-mono text-[10px] text-faint">
                      {receipt.slug}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <p className="price-figure text-sm">
                      {formatUsdCents(BigInt(receipt.priceUsdCents))}
                    </p>
                    <Link
                      href={`/pay/${receipt.slug}/receipt?tx=${receipt.hash}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-accent underline underline-offset-2 hover:text-white"
                    >
                      View receipt
                      <Icon name="arrow-up-right" className="size-3" />
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <Link
          href="/dashboard"
          className="mt-7 inline-flex w-full items-center justify-center border border-line py-3 text-sm font-semibold hover:border-line-strong hover:bg-surface-raised"
        >
          Return home
        </Link>
      </div>
    </main>
  );
}
