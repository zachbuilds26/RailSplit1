"use client";

import Link from "next/link";
import Image from "next/image";
import { toJpeg } from "html-to-image";
import { useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import { RailsplitLogo } from "@/components/ui/railsplit-logo";
import { explorerTx, railsplitChain, shortenAddress } from "@/lib/chain";
import { formatReadError } from "@/lib/railsplit-errors";
import {
  assetSymbol,
  formatAssetAmount,
  formatFeedPrice,
  formatUsdCents,
  usePaymentLink,
  usePaymentReceipt,
  type SettlementAsset,
} from "@/lib/use-railsplit";

export function ReceiptExperience({
  slug,
  txHash,
}: {
  slug: string;
  txHash?: `0x${string}`;
}) {
  const { link, isLoading, error, notFound } = usePaymentLink(slug);
  const receipt = usePaymentReceipt(slug, txHash);

  if (!txHash) {
    return (
      <ReceiptShell>
        <Issue
          title="No transaction was provided."
          body="Open the receipt link with its ?tx= transaction hash, or ask the merchant to resend it."
        />
      </ReceiptShell>
    );
  }

  if (receipt.payment) {
    return (
      <ReceiptShell>
        <ReceiptCard
          title={link?.title ?? "Payment"}
          priceUsdCents={receipt.payment.priceUsdCents}
          amountWei={receipt.payment.amountWei}
          flrUsdPrice={receipt.payment.flrUsdPrice}
          flrUsdDecimals={receipt.payment.flrUsdDecimals}
          asset={receipt.payment.asset}
          paidAt={receipt.payment.paidAt}
          merchant={receipt.payment.merchant}
          payer={receipt.payment.payer}
          hash={receipt.payment.hash}
        />
      </ReceiptShell>
    );
  }

  if (isLoading || receipt.isLoading) {
    return (
      <ReceiptShell>
        <section className="border border-line bg-surface p-8 text-center text-sm text-muted" role="status" aria-live="polite">
          Looking up your payment…
        </section>
      </ReceiptShell>
    );
  }

  if ((error && !notFound) || receipt.error) {
    return (
      <ReceiptShell>
        <Issue
          title="We could not load this receipt."
          body={formatReadError(
            receipt.error ?? error,
            "RailSplit could not verify this transaction right now. Try again in a moment.",
          )}
        />
      </ReceiptShell>
    );
  }

  if (notFound || !link) {
    return (
      <ReceiptShell>
        <Issue
          title="This payment link was not found."
          body="Check the URL or ask the merchant to send a new one."
        />
      </ReceiptShell>
    );
  }

  return (
    <ReceiptShell>
      <Issue
        title="This payment has not been confirmed yet."
        body="If you just paid, wait a moment and refresh. If you were sent a receipt link, check the transaction hash."
      />
    </ReceiptShell>
  );
}

function ReceiptCard({
  title,
  priceUsdCents,
  amountWei,
  flrUsdPrice,
  flrUsdDecimals,
  asset,
  paidAt,
  merchant,
  payer,
  hash,
}: {
  title: string;
  priceUsdCents: bigint;
  amountWei: bigint;
  flrUsdPrice: bigint;
  flrUsdDecimals: number;
  asset: SettlementAsset;
  paidAt: bigint;
  merchant: `0x${string}`;
  payer: `0x${string}`;
  hash: `0x${string}`;
}) {
  const printRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadFailed, setDownloadFailed] = useState(false);

  const paidAtLabel = paidAt > 0n ? new Date(Number(paidAt) * 1000).toLocaleString() : undefined;
  const rateLabel = `${formatFeedPrice(flrUsdPrice, flrUsdDecimals)} USD`;
  const symbol = assetSymbol(asset);
  const amountLabel = formatAssetAmount(amountWei, asset);

  async function downloadJpeg() {
    const node = printRef.current;
    if (!node) return;

    try {
      setDownloadFailed(false);
      setDownloading(true);
      const dataUrl = await toJpeg(node, {
        backgroundColor: "#000000",
        pixelRatio: 2,
        cacheBust: true,
        quality: 0.92,
        width: node.offsetWidth,
        height: node.offsetHeight,
        style: {
          position: "static",
          left: "0",
          top: "0",
        },
      });
      const fileName = `railsplit-receipt-${
        title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "") || hash.slice(0, 10)
      }.jpg`;
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = fileName;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      setDownloadFailed(true);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      <section className="border border-line bg-surface">
        <div className="border-b border-line px-5 py-5 text-center sm:px-7 sm:py-6">
          <span className="mx-auto grid size-12 place-items-center bg-success text-background">
            <Icon name="check" className="size-6" />
          </span>
          <p className="mt-5 text-[10px] font-semibold tracking-[0.15em] text-success uppercase">
            Payment receipt
          </p>
          <h1 className="font-display mt-3 text-2xl tracking-[-0.045em]">{title}</h1>
          <p className="price-figure mt-4 text-2xl sm:text-3xl">
            {formatUsdCents(priceUsdCents)}
          </p>
          <p className="mt-2 text-sm text-muted">
            settled in {symbol}
          </p>
        </div>

        <dl className="divide-y divide-line px-5 text-sm sm:px-7">
          <div className="flex items-center justify-between gap-4 py-4">
            <dt className="text-muted">Amount paid</dt>
            <dd className="font-semibold tabular-nums">
              {amountLabel} {symbol}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-4">
            <dt className="text-muted">Settlement rate</dt>
            <dd className="font-semibold tabular-nums">
              1 {symbol} = {rateLabel}
            </dd>
          </div>
          {paidAtLabel && (
            <div className="flex items-center justify-between gap-4 py-4">
              <dt className="text-muted">Paid at</dt>
              <dd className="font-semibold tabular-nums">{paidAtLabel}</dd>
            </div>
          )}
          <div className="flex items-center justify-between gap-4 py-4">
            <dt className="text-muted">Merchant</dt>
            <dd className="font-mono text-xs">{shortenAddress(merchant)}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-4">
            <dt className="text-muted">Payer</dt>
            <dd className="font-mono text-xs">{shortenAddress(payer)}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-4">
            <dt className="text-muted">Network</dt>
            <dd className="font-semibold">{railsplitChain.name}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-4">
            <dt className="text-muted">Transaction</dt>
            <dd>
              <a
                href={explorerTx(hash)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-mono text-xs text-accent underline underline-offset-2 hover:text-white"
              >
                {hash.slice(0, 10)}…{hash.slice(-8)}
                <Icon name="arrow-up-right" className="size-3" />
              </a>
            </dd>
          </div>
        </dl>

        <div className="flex flex-col gap-3 border-t border-line p-5 sm:p-7">
          <button
            type="button"
            disabled={downloading}
            onClick={() => void downloadJpeg()}
            className="inline-flex flex-1 items-center justify-center gap-2 bg-accent px-4 py-3 text-sm font-semibold text-accent-ink hover:bg-white disabled:opacity-60"
          >
            <Icon name="check" className="size-4" />
            {downloading ? "Preparing image…" : "Download receipt as JPEG"}
          </button>
          {downloadFailed && (
            <p role="alert" className="border border-danger/40 bg-danger/10 p-3 text-xs leading-5 text-danger">
              Could not render the image. Try again in a moment.
            </p>
          )}
          <a
            href={explorerTx(hash)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex flex-1 items-center justify-center border border-line px-4 py-3 text-sm font-semibold hover:border-line-strong hover:bg-surface-raised"
          >
            View on explorer
          </a>
          <Link
            href="/dashboard"
            className="inline-flex flex-1 items-center justify-center border border-line px-4 py-3 text-sm font-semibold hover:border-line-strong hover:bg-surface-raised"
          >
            Done
          </Link>
          <Link
            href="/receipts"
            className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-muted underline underline-offset-2 hover:text-ink"
          >
            <Icon name="grid" className="size-3" />
            View all my receipts
          </Link>
        </div>
      </section>

      <ReceiptPrintLayout printRef={printRef} title={title} priceUsdCents={priceUsdCents} symbol={symbol} amountLabel={amountLabel} rateLabel={rateLabel} paidAtLabel={paidAtLabel} merchant={merchant} payer={payer} hash={hash} />
    </>
  );
}

const ReceiptPrintLayout = ({
  printRef,
  title,
  priceUsdCents,
  symbol,
  amountLabel,
  rateLabel,
  paidAtLabel,
  merchant,
  payer,
  hash,
}: {
  printRef: React.Ref<HTMLDivElement>;
  title: string;
  priceUsdCents: bigint;
  symbol: string;
  amountLabel: string;
  rateLabel: string;
  paidAtLabel?: string;
  merchant: `0x${string}`;
  payer: `0x${string}`;
  hash: `0x${string}`;
}) => {
  const row = (name: string, value: React.ReactNode) => (
    <div className="flex items-center justify-between gap-4 py-4">
      <dt className="text-muted">{name}</dt>
      <dd className="text-right font-semibold tabular-nums">{value}</dd>
    </div>
  );

  return (
    <div
      ref={printRef}
      aria-hidden="true"
      className="fixed top-0 left-[-9999px] w-[420px]"
    >
      <div className="border border-line bg-surface text-ink">
        <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4 sm:px-7">
          <span className="inline-flex items-center gap-2">
            <Image
              src="/railsplit-logo-mark.webp"
              alt=""
              width={24}
              height={24}
              unoptimized
              className="object-contain"
            />
            <span className="font-display text-base font-semibold tracking-[-0.03em] text-ink">
              RailSplit
            </span>
          </span>
          <span className="border border-line px-2 py-1 text-[10px] font-semibold tracking-[0.14em] text-muted uppercase">
            Receipt
          </span>
        </div>

        <div className="border-b border-line px-5 py-5 text-center sm:px-7 sm:py-6">
          <span className="mx-auto grid size-12 place-items-center bg-success text-background">
            <Icon name="check" className="size-6" />
          </span>
          <p className="mt-5 text-[10px] font-semibold tracking-[0.15em] text-success uppercase">
            Payment receipt
          </p>
          <p className="font-display mt-3 text-2xl tracking-[-0.045em]">{title}</p>
          <p className="price-figure mt-4 text-2xl sm:text-3xl">
            {formatUsdCents(priceUsdCents)}
          </p>
          <p className="mt-2 text-sm text-muted">
            settled in {symbol}
          </p>
        </div>

        <dl className="divide-y divide-line px-5 text-sm sm:px-7">
          {row("Amount paid", `${amountLabel} ${symbol}`)}
          {row("Settlement rate", `1 ${symbol} = ${rateLabel}`)}
          {paidAtLabel && row("Paid at", paidAtLabel)}
          {row("Merchant", <span className="font-mono text-xs">{shortenAddress(merchant)}</span>)}
          {row("Payer", <span className="font-mono text-xs">{shortenAddress(payer)}</span>)}
          {row("Network", railsplitChain.name)}
        </dl>

        <div className="px-5 py-5 sm:px-7">
          <p className="text-[10px] font-semibold tracking-[0.15em] text-faint uppercase">
            Transaction
          </p>
          <p className="mt-2 break-all font-mono text-xs text-muted">{hash}</p>
          <p className="mt-4 text-[10px] leading-5 text-faint">
            Verified on {railsplitChain.name}. Amounts and rate are set onchain at payment time.
          </p>
        </div>
      </div>
    </div>
  );
};

function Issue({ title, body }: { title: string; body: string }) {
  return (
    <section className="border border-line bg-surface p-8 text-center sm:p-10" role="alert">
      <span className="mx-auto grid size-11 place-items-center border border-line text-muted">
        <Icon name="link" className="size-5" />
      </span>
      <p className="mt-6 text-[10px] font-semibold tracking-[0.15em] text-faint uppercase">
        Receipt unavailable
      </p>
      <h1 className="font-display mt-3 text-3xl tracking-[-0.045em]">{title}</h1>
      <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-muted">{body}</p>
      <Link
        href="/"
        className="mt-7 inline-flex border border-line px-4 py-2.5 text-sm font-semibold hover:border-line-strong hover:bg-surface-raised"
      >
        Return home
      </Link>
    </section>
  );
}

function ReceiptShell({ children }: { children: ReactNode }) {
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
