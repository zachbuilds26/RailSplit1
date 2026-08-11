"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useAccount, useBalance } from "wagmi";
import { Icon } from "@/components/ui/icon";
import { RailsplitLogo } from "@/components/ui/railsplit-logo";
import { ConnectWallet } from "@/components/wallet/connect-wallet";
import { explorerTx, railsplitChain } from "@/lib/chain";
import { formatReadError, withQuoteBuffer } from "@/lib/railsplit-errors";
import { saveStoredReceipt } from "@/lib/receipt-history";
import {
  formatCoin,
  formatFeedPrice,
  formatUsdCents,
  isExpired,
  useFeedAge,
  useNow,
  usePaymentLink,
  usePaymentQuote,
  usePayLink,
  type OnchainLink,
} from "@/lib/use-railsplit";

export function CheckoutExperience({ slug }: { slug: string }) {
  const { link, isLoading, error, notFound, refetch } = usePaymentLink(slug);
  const now = useNow();
  const [paidHash, setPaidHash] = useState<`0x${string}` | undefined>();

  if (paidHash && link) {
    return (
      <CheckoutShell>
        <PaidReceipt link={link} slug={slug} hash={paidHash} />
      </CheckoutShell>
    );
  }

  if (isLoading) {
    return (
      <CheckoutShell>
        <div role="status" aria-live="polite" className="border border-line bg-surface p-8 text-center text-sm text-muted">
          Loading payment link…
        </div>
      </CheckoutShell>
    );
  }

  if (error && !notFound) {
    return (
      <CheckoutShell>
        <ReadFailure
          title="We could not load this checkout."
          copy={formatReadError(error)}
          onRetry={() => refetch()}
        />
      </CheckoutShell>
    );
  }

  if (notFound || !link) {
    return <Unavailable reason="missing" />;
  }

  if (!link.active && link.paymentCount > 0) return <Unavailable reason="paid" />;
  if (!link.active) return <Unavailable reason="closed" />;
  if (isExpired(link.expiresAt, now)) return <Unavailable reason="expired" />;

  return (
    <CheckoutShell>
      <CheckoutCard slug={slug} link={link} onPaid={setPaidHash} />
    </CheckoutShell>
  );
}

function CheckoutCard({
  slug,
  link,
  onPaid,
}: {
  slug: string;
  link: OnchainLink;
  onPaid: (hash: `0x${string}`) => void;
}) {
  const { isConnected, chainId, address } = useAccount();
  const onCorrectChain = isConnected && chainId === railsplitChain.id;

  const quote = usePaymentQuote(slug, onCorrectChain);
  const feedAge = useFeedAge(quote.feedTimestamp);
  const now = useNow();
  const payment = usePayLink(slug);
  const { refetch: refetchLink } = usePaymentLink(slug);
  const {
    data: balance,
    isLoading: balanceLoading,
    error: balanceError,
    refetch: refetchBalance,
  } = useBalance({
    address,
    chainId: railsplitChain.id,
    query: { enabled: Boolean(address) },
  });

  const [failure, setFailure] = useState<string | undefined>();

  useEffect(() => {
    if (payment.isConfirmed && payment.hash) {
      saveStoredReceipt({
        slug,
        title: link.title,
        hash: payment.hash,
        priceUsdCents: link.priceUsdCents.toString(),
        paidAt: Math.floor(Date.now() / 1000),
      });
      onPaid(payment.hash);
    }
  }, [payment.isConfirmed, payment.hash, onPaid, slug, link.title, link.priceUsdCents]);

  if (payment.isConfirmed && payment.hash) {
    return <PaidReceipt link={link} slug={slug} hash={payment.hash} />;
  }

  const required = quote.requiredWei;
  const bufferedRequired = required === undefined ? undefined : withQuoteBuffer(required);
  const balanceReady = Boolean(balance) && !balanceLoading && !balanceError;
  const insufficient =
    bufferedRequired !== undefined && balanceReady && balance!.value < bufferedRequired;
  const canPay =
    onCorrectChain &&
    bufferedRequired !== undefined &&
    balanceReady &&
    !insufficient &&
    !quote.error &&
    !quote.isFetching;

  async function handlePay() {
    if (required === undefined || quote.error || quote.isFetching) return;

    setFailure(undefined);

    const latestLink = await refetchLink();
    if (latestLink.error || !latestLink.data) {
      setFailure(
        formatReadError(
          latestLink.error,
          "RailSplit could not verify this checkout right now. Try again in a moment.",
        ),
      );
      return;
    }

    if (!latestLink.data.active || isExpired(latestLink.data.expiresAt, now)) {
      setFailure("This checkout is no longer available.");
      return;
    }

    const refreshedQuote = await quote.refetch();
    const freshRequired = refreshedQuote.data?.[0];
    if (refreshedQuote.error || freshRequired === undefined) {
      setFailure(
        formatReadError(
          refreshedQuote.error ?? quote.error,
          "RailSplit could not refresh the checkout quote right now. Try again in a moment.",
        ),
      );
      return;
    }

    try {
      await payment.pay(freshRequired);
    } catch (error) {
      setFailure(readableError(error));
    }
  }

  const busy = payment.isSubmitting || payment.isConfirming;

  return (
    <section className="border border-line bg-surface">
      <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-7">
        <span className="truncate text-xs text-muted">Checkout</span>
        <span className="inline-flex shrink-0 items-center gap-1.5 text-[10px] font-semibold tracking-[0.12em] text-accent uppercase">
          <span className="size-1.5 bg-accent" />
          {railsplitChain.name}
        </span>
      </div>

      <div className="p-5 sm:p-7">
        <h1 className="text-2xl font-medium tracking-[-0.045em]">{link.title}</h1>

        <div className="mt-7 border-y border-line py-5">
          <p className="text-[10px] font-semibold tracking-[0.14em] text-faint uppercase">
            Amount due
          </p>
          <p className="price-figure mt-2 text-xl sm:text-2xl">
            {formatUsdCents(link.priceUsdCents)}
          </p>

          <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-line pt-4">
            <span className="text-xs text-muted">Estimated in C2FLR</span>
            <span className="text-right text-base font-semibold tabular-nums">
              {onCorrectChain ? (
                quote.error ? (
                  <span className="text-sm text-muted">Current rate unavailable</span>
                ) : quote.isLoading || bufferedRequired === undefined ? (
                  <span className="text-sm text-muted">Updating live rate…</span>
                ) : (
                  <>
                    {formatCoin(bufferedRequired)}{" "}
                    <span className="text-xs text-muted">
                      {railsplitChain.nativeCurrency.symbol}
                    </span>
                  </>
                )
              ) : (
                <span className="text-sm text-muted">Connect a wallet to view the current amount</span>
              )}
            </span>
          </div>
        </div>

        {onCorrectChain && quote.flrUsdPrice !== undefined && !quote.error && (
          <div className="mt-5 border border-line bg-background-deep px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-semibold tracking-[0.14em] text-faint uppercase">
                Current settlement rate
              </p>
              {feedAge !== undefined && (
                <span className="text-[10px] text-muted tabular-nums">{feedAge}s ago</span>
              )}
            </div>
            <p className="mt-2 text-sm font-semibold tabular-nums">
              1 {railsplitChain.nativeCurrency.symbol} = {formatFeedPrice(quote.flrUsdPrice, quote.flrUsdDecimals)} USD
            </p>
            <p className="mt-2 text-xs leading-5 text-muted">
              The final amount is set when payment is confirmed.
            </p>
          </div>
        )}

        {onCorrectChain && quote.error && (
          <ReadFailure
            className="mt-5"
            title="The current rate is unavailable right now."
            copy={formatReadError(quote.error)}
            onRetry={() => quote.refetch()}
          />
        )}

        <div className="mt-7">
          <ConnectWallet />
        </div>

        {onCorrectChain && (
          <>
            {!balanceLoading && balanceError && (
              <ReadFailure
                className="mt-4"
                title="We could not read your wallet balance right now."
                copy={formatReadError(balanceError, "RailSplit could not read your wallet balance right now. Try again.")}
                onRetry={() => refetchBalance()}
              />
            )}

            {balanceLoading && <p role="status" aria-live="polite" className="mt-4 text-xs leading-5 text-muted">Checking your balance…</p>}

            {insufficient && bufferedRequired !== undefined && (
              <p className="mt-4 text-xs leading-5 text-warning">
                This wallet holds {formatCoin(balance?.value)} {railsplitChain.nativeCurrency.symbol}.
                The checkout needs {formatCoin(bufferedRequired)} plus gas.
              </p>
            )}

            <button
              type="button"
              disabled={busy || !canPay}
              onClick={handlePay}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 bg-accent px-5 py-3.5 text-sm font-semibold text-accent-ink hover:bg-white disabled:opacity-60"
            >
              {payment.isSubmitting && "Approve in your wallet…"}
              {payment.isConfirming && "Processing payment…"}
              {!busy && (
                <>
                  Pay <span className="price-figure">{formatUsdCents(link.priceUsdCents)}</span>
                  <Icon name="arrow-up-right" className="size-4" />
                </>
              )}
            </button>

            {payment.hash && payment.isConfirming && (
              <a
                href={explorerTx(payment.hash)}
                target="_blank"
                rel="noreferrer"
                className="mt-3 block text-center text-xs text-accent underline underline-offset-2 hover:text-white"
              >
                Track the transaction
              </a>
            )}

            {(failure || payment.error) && (
              <ReadFailure
                className="mt-4"
                title="The payment could not be completed."
                copy={failure ?? readableError(payment.error)}
              />
            )}
          </>
        )}
      </div>
    </section>
  );
}

function PaidReceipt({ link, slug, hash }: { link: OnchainLink; slug: string; hash: `0x${string}` }) {
  const receiptHref = `/pay/${slug}/receipt?tx=${hash}`;

  return (
    <section className="border border-line bg-surface p-5 text-center sm:p-7">
        <span className="mx-auto grid size-12 place-items-center bg-success text-background">
          <Icon name="check" className="size-6" />
        </span>
        <p className="mt-6 text-[10px] font-semibold tracking-[0.15em] text-success uppercase">
          Payment complete
        </p>
        <h1 className="price-figure mt-3 text-xl sm:text-2xl">
          {formatUsdCents(link.priceUsdCents)} confirmed.
        </h1>
        <p className="mt-3 text-sm text-muted">{link.title}</p>

        <div className="mt-7 border-y border-line py-4 text-left text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted">Transaction hash</span>
            <a
              href={explorerTx(hash)}
              target="_blank"
              rel="noreferrer"
              className="truncate font-mono text-xs text-accent underline underline-offset-2 hover:text-white"
            >
              {hash.slice(0, 10)}…{hash.slice(-8)}
            </a>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-muted">Network</span>
            <span>{railsplitChain.name}</span>
          </div>
        </div>

        <div className="mt-7 flex flex-col gap-3">
          <Link
            href={receiptHref}
            className="inline-flex w-full items-center justify-center bg-accent py-3 text-sm font-semibold text-accent-ink hover:bg-white"
          >
            View receipt
            <Icon name="arrow-up-right" className="ml-2 size-4" />
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex w-full items-center justify-center border border-line py-3 text-sm font-semibold hover:border-line-strong hover:bg-surface-raised"
          >
            Back to dashboard
          </Link>
        </div>
      </section>
  );
}

function Unavailable({ reason }: { reason: "missing" | "expired" | "closed" | "paid" }) {
  const copy = {
    missing: {
      heading: "This payment link was not found.",
      body: "We could not find a record for this URL. Check the link or ask the merchant to send a new one.",
    },
    expired: {
      heading: "This payment link has expired.",
      body: "The merchant set an end date that has passed. Ask for a new link.",
    },
    closed: {
      heading: "This payment link is closed.",
      body: "The merchant is no longer accepting payments through this link.",
    },
    paid: {
      heading: "This payment link has already been completed.",
      body: "The merchant has already closed it after payment was confirmed.",
    },
  }[reason];

  return (
    <CheckoutShell>
      <section className="border border-line bg-surface p-8 text-center sm:p-10">
        <span className="mx-auto grid size-11 place-items-center border border-line text-muted">
          <Icon name="link" className="size-5" />
        </span>
        <p className="mt-6 text-[10px] font-semibold tracking-[0.15em] text-faint uppercase">
          Checkout unavailable
        </p>
        <h1 className="font-display mt-3 text-3xl tracking-[-0.045em]">{copy.heading}</h1>
        <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-muted">{copy.body}</p>
        <Link
          href="/dashboard"
          className="mt-7 inline-flex border border-line px-4 py-2.5 text-sm font-semibold hover:border-line-strong hover:bg-surface-raised"
        >
          Return home
        </Link>
      </section>
    </CheckoutShell>
  );
}

function CheckoutShell({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center bg-background-deep px-5 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <RailsplitLogo />
        </div>
        {children}
      </div>
    </main>
  );
}

/** Turns wallet and contract errors into something a customer can act on. */
function readableError(error: unknown): string {
  if (!error) return "";

  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : "";

  if (/user rejected|user denied/i.test(message)) {
    return "You cancelled the payment.";
  }

  if (/insufficient funds/i.test(message)) {
    return `This wallet needs more ${railsplitChain.nativeCurrency.symbol} to cover the payment and gas.`;
  }

  if (/Underpaid/i.test(message)) {
    return "The rate changed before payment was confirmed. Try again at the current amount.";
  }

  if (/FeedStale/i.test(message)) {
    return "The current rate is too old to use. Try again in a moment.";
  }

  if (/LinkExpired/i.test(message)) return "This link expired before payment was confirmed.";
  if (/LinkInactive/i.test(message)) return "The merchant closed this link.";

  return formatReadError(error, message.split("\n")[0] || "The payment could not be completed.");
}

function ReadFailure({
  title,
  copy,
  onRetry,
  className = "",
}: {
  title: string;
  copy: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <section className={`border border-line bg-background-deep p-5 sm:p-6 ${className}`} role="alert">
      <p className="text-[10px] font-semibold tracking-[0.15em] text-faint uppercase">Issue</p>
      <h2 className="mt-2 text-lg font-medium tracking-[-0.03em]">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted">{copy}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex border border-line px-4 py-2 text-sm font-semibold hover:border-line-strong hover:bg-surface-raised"
        >
          Try again
        </button>
      )}
    </section>
  );
}
