"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { PaymentLinkQr } from "@/components/ui/payment-link-qr";
import { buildCheckoutPath } from "@/lib/chain";

/**
 * Lets a merchant share an invoice: a scannable QR code plus the copyable
 * checkout URL for a single payment link.
 */
export function ShareInvoiceDialog({
  slug,
  title,
  onClose,
}: {
  slug: string;
  title: string;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const url = `${window.location.origin}${buildCheckoutPath(slug)}`;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    dialog.showModal();
    window.setTimeout(() => dialog.focus(), 0);

    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setCopyFailed(false);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopyFailed(true);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="share-invoice-title"
      aria-describedby="share-invoice-description"
      aria-modal="true"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      tabIndex={-1}
      className="m-auto w-[calc(100%-2.5rem)] max-w-md border border-line bg-background p-0 text-ink backdrop:bg-black/70"
    >
      <div className="border-b border-line bg-background-deep px-5 py-4 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.15em] text-faint uppercase">
              Share invoice
            </p>
            <h2 id="share-invoice-title" className="font-display mt-2 text-2xl tracking-[-0.04em]">
              {title}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close share dialog"
            onClick={onClose}
            className="grid size-8 place-items-center border border-line text-lg text-muted hover:border-line-strong hover:text-ink"
          >
            ×
          </button>
        </div>
        <p id="share-invoice-description" className="mt-3 text-sm leading-6 text-muted">
          Scan this QR code or use the checkout link to complete payment.
        </p>
      </div>

      <div className="p-5 sm:p-6">
        <div className="grid gap-5 sm:grid-cols-[auto_minmax(0,1fr)]">
          <div className="mx-auto w-fit sm:mx-0">
            <PaymentLinkQr url={url} size={168} />
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-[10px] font-semibold tracking-[0.15em] text-faint uppercase">
              Checkout link
            </p>
            <p className="mt-3 break-all text-xs leading-5 text-muted">{url}</p>
            <button
              type="button"
              onClick={() => void copyUrl()}
              className="mt-4 inline-flex items-center justify-center gap-2 border border-line px-4 py-2.5 text-sm font-semibold hover:border-line-strong hover:bg-surface-raised"
            >
              <Icon name={copied ? "check" : "copy"} className="size-4" />
              {copied ? "Link copied" : "Copy invoice link"}
            </button>
            {copyFailed && (
              <p role="alert" className="mt-3 border border-danger/40 bg-danger/10 p-3 text-xs leading-5 text-danger">
                Could not copy the link. Copy it manually from above.
              </p>
            )}
          </div>
        </div>
      </div>
    </dialog>
  );
}
