"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useAccount, useBalance } from "wagmi";
import { Icon } from "@/components/ui/icon";
import { RailsplitLogo } from "@/components/ui/railsplit-logo";
import { XrpConnectWallet } from "@/components/xrp/xrp-connect-wallet";
import { buildExplorerTxUrl, getRail } from "@/lib/chain";
import { formatReadError } from "@/lib/railsplit-errors";
import { formatCoin, formatUsdCents, isExpired, useNow } from "@/lib/use-railsplit";
import { useXrpPayLink, useXrpPaymentLink, useXrpPaymentQuote, type XrpAccountMode, type XrpPaymentLink } from "@/lib/use-xrp-railsplit";

const rail = getRail("xrpl-evm-testnet");

export function XrpCheckoutExperience({ slug }: { slug: string }) {
  const { link, isLoading, error, notFound, refetch } = useXrpPaymentLink(slug);
  const now = useNow();
  const [paidHash, setPaidHash] = useState<`0x${string}` | undefined>();

  if (paidHash && link) {
    return (
      <CheckoutShell>
        <PaidReceipt link={link} hash={paidHash} />
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
  link: XrpPaymentLink;
  onPaid: (hash: `0x${string}`) => void;
}) {
  const { isConnected, chainId, address } = useAccount();
  const onCorrectChain = isConnected && chainId === rail.chain.id;
  const [mode, setMode] = useState<XrpAccountMode>("eoa");
  const [failure, setFailure] = useState("");
  const quote = useXrpPaymentQuote(slug, onCorrectChain);
  const payment = useXrpPayLink(slug, mode);
  const now = useNow();
  const { refetch: refetchLink } = useXrpPaymentLink(slug);
  const { data: balance, isLoading: balanceLoading, error: balanceError, refetch: refetchBalance } = useBalance({
    address,
    chainId: rail.chain.id,
    query: { enabled: Boolean(address) },
  });

  useEffect(() => {
    if (payment.isConfirmed && payment.hash) {
      onPaid(payment.hash);
    }
  }, [payment.isConfirmed, payment.hash, onPaid]);

  if (payment.isConfirmed && payment.hash) {
    return <PaidReceipt link={link} hash={payment.hash} />;
  }

  const requiredWei = quote.quote?.requiredWei;
  const balanceReady = Boolean(balance) && !balanceLoading && !balanceError;
  const insufficient = requiredWei !== undefined && balanceReady && balance!.value < requiredWei;
  const canPay =
    onCorrectChain &&
    requiredWei !== undefined &&
    balanceReady &&
    !insufficient &&
    !quote.error &&
    !quote.isFetching;

  async function handlePay() {
    if (!quote.quote || quote.error || quote.isFetching) return;

    setFailure("");

    const latestLink = await refetchLink();
    if (latestLink.error || !latestLink.data) {
      setFailure(formatReadError(latestLink.error, "RailSplit could not refresh this payment link. Try again."));
      return;
    }
    if (!latestLink.data.active) {
      setFailure(latestLink.data.paymentCount > 0 ? "This payment link has already been completed." : "The merchant closed this payment link.");
      return;
    }
    if (isExpired(latestLink.data.expiresAt, now)) {
      setFailure("This payment link expired before payment could be confirmed.");
      return;
    }

    const refreshedQuote = await quote.refetch();
    if (refreshedQuote.error || !refreshedQuote.data) {
      return;
    }

    try {
      await payment.pay(refreshedQuote.data);
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
          {rail.chain.name}
        </span>
      </div>

      <div className="p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-medium tracking-[-0.045em]">{link.title}</h1>
            <p className="mt-1 text-xs text-muted">Smart accounts are available when your wallet supports them.</p>
          </div>
          <div className="inline-flex border border-line bg-background-deep p-1 text-[10px] font-semibold uppercase tracking-[0.14em]">
            <button
              type="button"
              onClick={() => setMode("eoa")}
              className={`px-3 py-1.5 ${mode === "eoa" ? "bg-accent text-accent-ink" : "text-muted"}`}
            >
              EOA
            </button>
            <button
              type="button"
              onClick={() => setMode("smart-account")}
              className={`px-3 py-1.5 ${mode === "smart-account" ? "bg-accent text-accent-ink" : "text-muted"}`}
            >
              Smart account
            </button>
          </div>
        </div>

        <div className="mt-7 border-y border-line py-5">
          <p className="text-[10px] font-semibold tracking-[0.14em] text-faint uppercase">Amount due</p>
          <p className="price-figure mt-2 text-xl sm:text-2xl">{formatUsdCents(link.priceUsdCents)}</p>

          <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-line pt-4">
            <span className="text-xs text-muted">Estimated in XRP</span>
            <span className="text-right text-base font-semibold tabular-nums">
              {onCorrectChain ? (
                quote.error ? (
                  <span className="text-sm text-muted">Current quote unavailable</span>
                ) : quote.isLoading || requiredWei === undefined ? (
                  <span className="text-sm text-muted">Updating live quote…</span>
                ) : (
                  <>
                    {formatCoin(requiredWei)} <span className="text-xs text-muted">{rail.nativeSymbol}</span>
                  </>
                )
              ) : (
                <span className="text-sm text-muted">Connect a wallet to view the current amount</span>
              )}
            </span>
          </div>
        </div>

        {onCorrectChain && quote.quote && !quote.error && (
          <div className="mt-5 border border-line bg-background-deep px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-semibold tracking-[0.14em] text-faint uppercase">Current quote</p>
              <span className="text-[10px] text-muted tabular-nums">{Number(quote.quote.quoteDecimals)} decimals</span>
            </div>
            <p className="mt-2 text-sm font-semibold tabular-nums">
              1 {rail.nativeSymbol} = ${(Number(quote.quote.xrpUsdPrice) / 10 ** quote.quote.quoteDecimals).toFixed(6)} USD
            </p>
            <p className="mt-2 text-xs leading-5 text-muted">The signed quote expires quickly and is checked again onchain.</p>
          </div>
        )}

        {onCorrectChain && quote.error && (
          <ReadFailure
            className="mt-5"
            title="The current quote is unavailable right now."
            copy={formatReadError(quote.error)}
            onRetry={() => quote.refetch()}
          />
        )}

        <div className="mt-7">
          <XrpConnectWallet />
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

            {insufficient && requiredWei !== undefined && (
              <p className="mt-4 text-xs leading-5 text-warning">
                This wallet holds {formatCoin(balance?.value)} {rail.nativeSymbol}. The checkout needs {formatCoin(requiredWei)} plus gas.
              </p>
            )}

            <button
              type="button"
              disabled={busy || !canPay}
              onClick={() => void handlePay()}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 bg-accent px-5 py-3.5 text-sm font-semibold text-accent-ink hover:bg-white disabled:opacity-60"
            >
              {payment.isSubmitting && mode === "smart-account" && "Sending smart account call…"}
              {payment.isSubmitting && mode !== "smart-account" && "Approve in your wallet…"}
              {payment.isConfirming && "Processing payment…"}
              {!busy && (
                <>
                  Pay <span className="price-figure">{formatUsdCents(link.priceUsdCents)}</span>
                  <Icon name="arrow-up-right" className="size-4" />
                </>
              )}
            </button>

            {payment.hash && payment.isConfirming && mode !== "smart-account" && (
              <a
                href={buildExplorerTxUrl(rail.key, payment.hash)}
                target="_blank"
                rel="noreferrer"
                className="mt-3 block text-center text-xs text-accent underline underline-offset-2 hover:text-white"
              >
                Track the transaction
              </a>
            )}

            {payment.isConfirming && mode === "smart-account" && (
              <p className="mt-3 text-center text-xs text-muted">
                Smart account call submitted{payment.smartAccountId ? ` (${payment.smartAccountId})` : ""}. Waiting for the transaction receipt…
              </p>
            )}

            {!quote.error && (failure || payment.error) && (
              <ReadFailure
                className="mt-4"
                title="The payment could not be completed."
                copy={failure || readableError(payment.error)}
              />
            )}
          </>
        )}
      </div>
    </section>
  );
}

function PaidReceipt({ link, hash }: { link: XrpPaymentLink; hash: `0x${string}` }) {
  return (
    <section className="border border-line bg-surface p-5 text-center sm:p-7">
      <span className="mx-auto grid size-12 place-items-center bg-success text-background">
        <Icon name="check" className="size-6" />
      </span>
      <p className="mt-6 text-[10px] font-semibold tracking-[0.15em] text-success uppercase">Payment complete</p>
      <h1 className="mt-3 text-xl sm:text-2xl">{link.title} confirmed.</h1>
      <p className="mt-3 text-sm text-muted">{formatUsdCents(link.priceUsdCents)} settled in XRP onchain.</p>

      <div className="mt-7 border-y border-line py-4 text-left text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted">Transaction hash</span>
          <a
            href={buildExplorerTxUrl(rail.key, hash)}
            target="_blank"
            rel="noreferrer"
            className="truncate font-mono text-xs text-accent underline underline-offset-2 hover:text-white"
          >
            {hash.slice(0, 10)}…{hash.slice(-8)}
          </a>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-muted">Network</span>
          <span>{rail.chain.name}</span>
        </div>
      </div>

      <Link
        href="/dashboard?rail=xrpl-evm-testnet"
        className="mt-7 inline-flex w-full items-center justify-center border border-line py-3 text-sm font-semibold hover:border-line-strong hover:bg-surface-raised"
      >
        Back to dashboard
      </Link>
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
        <p className="mt-6 text-[10px] font-semibold tracking-[0.15em] text-faint uppercase">Checkout unavailable</p>
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

function readableError(error: unknown): string {
  if (!error) return "";

  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";

  if (/user rejected|user denied/i.test(message)) {
    return "You cancelled the payment.";
  }

  if (/insufficient funds/i.test(message)) {
    return `This wallet needs more ${rail.nativeSymbol} to cover the payment and gas.`;
  }

  if (/QuoteExpired/i.test(message)) return "This XRP quote expired before payment was confirmed.";
  if (/QuoteInvalidWindow/i.test(message)) return "The quote window is not valid right now. Try again.";
  if (/InvalidQuoteSignature/i.test(message)) return "RailSplit could not verify the XRP quote.";
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
