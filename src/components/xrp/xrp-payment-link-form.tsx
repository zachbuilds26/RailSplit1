"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { Icon } from "@/components/ui/icon";
import { XrpConnectWallet } from "@/components/xrp/xrp-connect-wallet";
import { buildCheckoutPath, buildExplorerTxUrl, getRail } from "@/lib/chain";
import { formatWriteError } from "@/lib/railsplit-errors";
import { formatUsdCents } from "@/lib/use-railsplit";
import { XRPL_EVM_PAY_ADDRESS } from "@/lib/xrp-contract-address";
import { RAILSPLIT_PAY_XRP_ABI } from "@/lib/railsplit-pay-xrp-abi";

const rail = getRail("xrpl-evm-testnet");
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_PRICE_USD_CENTS = (1n << 64n) - 1n;

function parseUsdAmountToCents(value: string) {
  const normalized = value.trim().replace(/,/g, "");

  if (!normalized) {
    return { error: "Enter an amount greater than zero." };
  }

  if (!/^\d+(?:\.\d{0,2})?$/.test(normalized)) {
    return { error: "Use a dollar amount with up to two decimal places." };
  }

  const [wholePart, fractionalPart = ""] = normalized.split(".");
  const cents = BigInt(wholePart) * 100n + BigInt((fractionalPart + "00").slice(0, 2));

  if (cents <= 0n) {
    return { error: "Enter an amount greater than zero." };
  }

  if (cents > MAX_PRICE_USD_CENTS) {
    return { error: "That amount is too large." };
  }

  return { cents };
}

export function XrpPaymentLinkForm() {
  const router = useRouter();
  const { isConnected, chainId } = useAccount();
  const onCorrectChain = isConnected && chainId === rail.chain.id;

  const [title, setTitle] = useState("Arcade Run 002");
  const [amount, setAmount] = useState("0.25");
  const [slug, setSlug] = useState("arcade-run-002");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState("");
  const [submittedLink, setSubmittedLink] = useState<{ title: string; slug: string; cents: bigint } | null>(null);

  const { writeContractAsync, isPending } = useWriteContract();
  const [hash, setHash] = useState<`0x${string}` | undefined>();
  const receipt = useWaitForTransactionReceipt({ hash, chainId: rail.chain.id });

  const receiptFailure = hash && receipt.isError ? formatWriteError(receipt.error) : "";
  const publishFailure = failure || receiptFailure;

  const parsedAmount = parseUsdAmountToCents(amount);
  const priceUsdCents = parsedAmount.cents ?? 0n;
  const validAmount = parsedAmount.cents !== undefined;

  const preview = {
    title: title.trim() || "Untitled payment",
    cents: priceUsdCents,
    slug: slug || "your-payment-link",
  };

  if (receipt.isSuccess && hash) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 text-center sm:px-8">
        <span className="mx-auto grid size-12 place-items-center bg-success text-background">
          <Icon name="check" className="size-6" />
        </span>
        <h1 className="font-display mt-6 text-3xl tracking-[-0.045em]">Your XRP payment link is live.</h1>
        <p className="mt-3 text-sm text-muted">
          {(submittedLink?.title ?? preview.title) + " at "}
          <span className="price-figure">${Number(submittedLink?.cents ?? preview.cents) / 100}</span>
        </p>
        <a
          href={buildExplorerTxUrl(rail.key, hash)}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-block font-mono text-xs text-accent underline underline-offset-2 hover:text-white"
        >
          {hash.slice(0, 12)}…{hash.slice(-10)}
        </a>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => router.push(buildCheckoutPath(rail.key, submittedLink?.slug ?? slug))}
            className="bg-accent px-5 py-3 text-sm font-semibold text-accent-ink hover:bg-white"
          >
            View checkout
          </button>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="border border-line px-5 py-3 text-sm font-semibold hover:border-line-strong hover:bg-surface"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  function validate() {
    const next: Record<string, string> = {};

    if (!title.trim()) next.title = "Enter a title your customer will recognise.";
    if (!validAmount) next.amount = parsedAmount.error ?? "Enter an amount greater than zero.";
    if (!slugPattern.test(slug)) {
      next.slug = "Use lowercase letters, numbers, and single hyphens only.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFailure("");

    if (!validate()) return;
    if (!XRPL_EVM_PAY_ADDRESS) {
      setFailure("Deploy the XRP contract first.");
      return;
    }

    const nextLink = {
      title: title.trim(),
      slug,
      cents: priceUsdCents,
    };

    try {
      const txHash = await writeContractAsync({
        address: XRPL_EVM_PAY_ADDRESS as `0x${string}`,
        abi: RAILSPLIT_PAY_XRP_ABI,
        chainId: rail.chain.id,
        functionName: "createPaymentLink",
        args: [slug, title.trim(), priceUsdCents, 0n],
      });

      setSubmittedLink(nextLink);
      setHash(txHash);
    } catch (error) {
      setSubmittedLink(null);
      setFailure(formatWriteError(error));
    }
  }

  const busy = isPending || receipt.isLoading;

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-10">
      <div className="max-w-2xl">
        <p className="text-[10px] font-semibold tracking-[0.16em] text-faint uppercase">Payment links / publish</p>
        <h1 className="font-display mt-3 text-4xl tracking-[-0.045em]">Publish an XRP payment link.</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Choose a dollar price, then publish a link customers can pay on XRPL EVM Testnet.
        </p>
      </div>

      <div className="mt-9 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <form onSubmit={submit} noValidate className="border border-line bg-surface p-5 sm:p-7">
          <div className="grid gap-6">
            <label className="grid gap-2 text-sm">
              <span>Payment title</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="border border-line bg-background px-3.5 py-3 text-sm outline-none placeholder:text-faint focus:border-accent"
                placeholder="e.g. July retainer"
                aria-invalid={Boolean(errors.title)}
                aria-describedby={errors.title ? "title-error" : undefined}
                disabled={busy}
              />
              {errors.title && (
                <span id="title-error" className="text-xs text-danger">
                  {errors.title}
                </span>
              )}
            </label>

            <label className="grid gap-2 text-sm">
              <span>Price in US dollars</span>
              <div className="flex border border-line bg-background focus-within:border-accent">
                <span className="shrink-0 border-r border-line px-3.5 py-3 text-sm text-muted">$</span>
                <input
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  inputMode="decimal"
                  className="min-w-0 flex-1 bg-transparent px-3.5 py-3 text-sm outline-none tabular-nums"
                  aria-invalid={Boolean(errors.amount)}
                  aria-describedby={errors.amount ? "amount-error" : "amount-hint"}
                  disabled={busy}
                />
              </div>
              {errors.amount ? (
                <span id="amount-error" className="text-xs text-danger">
                  {errors.amount}
                </span>
              ) : (
                <span id="amount-hint" className="text-xs leading-5 text-muted">
                  Stored onchain as {priceUsdCents.toString()} cents. Keep testnet amounts small so a faucet balance can cover them.
                </span>
              )}
            </label>

            <div className="border-y border-line py-5">
              <p className="text-[10px] font-semibold tracking-[0.14em] text-faint uppercase">Payout destination</p>
              <p className="mt-2 text-sm">
                {rail.nativeSymbol} on {rail.chain.name}
              </p>
              <p className="mt-2 text-xs leading-5 text-muted">
                The payment settles directly to your connected wallet. RailSplit never holds funds.
              </p>
            </div>

            <label className="grid gap-2 text-sm">
              <span>Payment URL</span>
              <div className="flex border border-line bg-background focus-within:border-accent">
                <span className="shrink-0 border-r border-line px-3.5 py-3 text-xs text-muted">/pay/xrpl-evm-testnet/</span>
                <input
                  value={slug}
                  onChange={(event) =>
                    setSlug(event.target.value.toLowerCase().replace(/\s+/g, "-"))
                  }
                  className="min-w-0 flex-1 bg-transparent px-3.5 py-3 text-sm outline-none"
                  aria-invalid={Boolean(errors.slug)}
                  aria-describedby={errors.slug ? "slug-error" : undefined}
                  disabled={busy}
                />
              </div>
              {errors.slug && (
                <span id="slug-error" className="text-xs text-danger">
                  {errors.slug}
                </span>
              )}
            </label>
          </div>

          {!onCorrectChain && (
            <div className="mt-7 border border-line bg-background-deep p-4">
              <p className="text-sm">
                {isConnected ? `Switch to ${rail.chain.name} to publish the link.` : "Connect a wallet to publish the link."}
              </p>
              <p className="mt-2 text-xs leading-5 text-muted">
                Publishing a link is a transaction, so it needs wallet approval and a little {rail.nativeSymbol} for gas.
              </p>
              <div className="mt-4">
                <XrpConnectWallet />
              </div>
            </div>
          )}

          {publishFailure && (
            <p
              role="alert"
              className="mt-5 border border-danger/40 bg-danger/10 p-3 text-sm leading-5 text-danger"
            >
              {publishFailure}
            </p>
          )}

          {hash && (
            <p className="mt-3 text-xs leading-5 text-muted">
              Waiting for the network to confirm the transaction. {" "}
              <a
                href={buildExplorerTxUrl(rail.key, hash)}
                target="_blank"
                rel="noreferrer"
                className="text-accent underline underline-offset-2 hover:text-white"
              >
                Track it on the explorer
              </a>
              .
            </p>
          )}

          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="px-4 py-3 text-sm text-muted hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || !onCorrectChain}
              className="inline-flex items-center justify-center gap-2 bg-accent px-5 py-3 text-sm font-semibold text-accent-ink hover:bg-white disabled:opacity-60"
            >
              <Icon name="link" className="size-4" />
              {isPending && "Approve in your wallet…"}
              {receipt.isLoading && "Publishing…"}
              {!busy && "Publish payment link"}
            </button>
          </div>
        </form>

        <aside className="h-fit border border-line bg-background-deep p-5 sm:p-6">
          <p className="text-[10px] font-semibold tracking-[0.15em] text-faint uppercase">Live preview</p>
          <div className="mt-5 border border-line bg-surface p-5">
            <h2 className="text-lg font-medium">{preview.title}</h2>
            <div className="mt-6 border-y border-line py-4">
              <p className="text-[10px] font-semibold tracking-[0.14em] text-faint uppercase">Amount due</p>
              <p className="price-figure mt-2 text-xl sm:text-2xl">{formatUsdCents(preview.cents)}</p>
              <p className="mt-2 text-xs text-muted tabular-nums">
                XRP quote will be signed at checkout time.
              </p>
            </div>
            <div className="mt-5 flex items-center justify-between text-xs">
              <span className="text-muted">Network</span>
              <span>{rail.chain.name}</span>
            </div>
            <div className="mt-5 bg-accent py-3 text-center text-sm font-semibold text-accent-ink">
              Pay <span className="price-figure">{formatUsdCents(preview.cents)}</span>
            </div>
          </div>
          <p className="mt-4 break-all text-xs leading-5 text-muted">{buildCheckoutPath(rail.key, preview.slug)}</p>
        </aside>
      </div>
    </div>
  );
}
