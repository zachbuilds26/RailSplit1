"use client";

import { useState } from "react";
import { formatUnits } from "viem";
import { useAccount, useBalance, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { Icon } from "@/components/ui/icon";
import { FAUCET_URL, railsplitChain, shortenAddress } from "@/lib/chain";

/**
 * Connects an injected wallet and keeps it on Coston2.
 * Shows the live C2FLR balance so a customer can tell whether they can pay.
 */
export function ConnectWallet({ compact = false }: { compact?: boolean }) {
  const { address, isConnected, chainId } = useAccount();
  const { connectAsync, connectors, isPending, error, reset } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();
  const { data: balance } = useBalance({
    address,
    chainId: railsplitChain.id,
    query: { enabled: Boolean(address), refetchInterval: 15000 },
  });

  const [hasInjectedWallet] = useState(
    () => typeof window !== "undefined" && Boolean((window as Window & { ethereum?: unknown }).ethereum),
  );
  const [switchFailure, setSwitchFailure] = useState("");
  const injectedConnector = connectors.find((connector) => connector.type === "injected");
  const wrongChain = isConnected && chainId !== railsplitChain.id;

  async function handleConnect(connector: (typeof connectors)[number] | undefined) {
    if (!connector) return;

    reset();

    try {
      await connectAsync({ connector });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (/user rejected|user denied/i.test(message)) {
        reset();
      }
    }
  }

  async function handleSwitchNetwork() {
    setSwitchFailure("");

    try {
      await switchChainAsync({ chainId: railsplitChain.id });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setSwitchFailure(
        /user rejected|user denied/i.test(message)
          ? "You cancelled the network switch."
          : message || `RailSplit could not switch to ${railsplitChain.name}.`,
      );
    }
  }

  if (!isConnected) {
    return (
      <div className={compact ? "" : "w-full"}>
        <button
          type="button"
          disabled={isPending || !hasInjectedWallet || !injectedConnector}
          onClick={() => void handleConnect(injectedConnector)}
          className={`inline-flex items-center justify-center gap-2 bg-accent text-sm font-semibold text-accent-ink hover:bg-white disabled:opacity-60 ${compact ? "px-3.5 py-2 text-xs" : "w-full px-5 py-3.5"}`}
        >
          <Icon name="wallet" className={compact ? "size-3.5" : "size-4"} />
          {isPending ? "Approve in your wallet…" : "Connect wallet"}
        </button>

        {!hasInjectedWallet && (
          <p className="mt-3 text-xs leading-5 text-muted">
            No injected wallet was detected. Install a browser wallet to continue.
          </p>
        )}

        {error && (
          <p role="alert" aria-live="assertive" className="mt-3 text-xs leading-5 text-danger">
            {error.message}
          </p>
        )}
      </div>
    );
  }

  if (wrongChain) {
    return (
      <div className={compact ? "" : "w-full"}>
        <div className="border border-warning/30 bg-warning/10 p-4">
          <p className="text-sm text-warning">Switch network</p>
          <p className="mt-2 text-xs leading-5 text-muted">
            RailSplit runs on {railsplitChain.name}. Switch networks to continue.
          </p>
          <button
            type="button"
            disabled={isSwitching}
            onClick={() => void handleSwitchNetwork()}
            className="mt-4 w-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink hover:bg-white disabled:opacity-60"
          >
            {isSwitching ? "Switching…" : `Switch to ${railsplitChain.name}`}
          </button>
          {switchFailure && (
            <p role="alert" aria-live="assertive" className="mt-3 text-xs leading-5 text-danger">
              {switchFailure}
            </p>
          )}
        </div>
      </div>
    );
  }

  const zeroBalance = balance?.value === 0n;

  return (
    <div className={compact ? "" : "w-full"}>
      <div className="flex items-center justify-between gap-3 border border-line bg-background-deep px-3.5 py-2.5">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs">
            <span className="size-1.5 shrink-0 bg-success" />
            <span className="font-mono">{address && shortenAddress(address)}</span>
          </p>
          {balance && (
            <p className="mt-1 text-[10px] text-muted tabular-nums">
              {Number(formatUnits(balance.value, balance.decimals)).toLocaleString("en-US", {
                maximumFractionDigits: 2,
              })} {balance.symbol}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => disconnect()}
          className="shrink-0 border border-line px-2.5 py-1.5 text-[10px] text-muted uppercase hover:border-line-strong hover:text-ink"
        >
          Disconnect
        </button>
      </div>

      {zeroBalance && (
        <p className="mt-3 text-xs leading-5 text-muted">
          This wallet does not hold any {railsplitChain.nativeCurrency.symbol} yet. {" "}
          <a
            href={FAUCET_URL}
            target="_blank"
            rel="noreferrer"
            className="text-accent underline underline-offset-2 hover:text-white"
          >
            Get testnet funds
          </a>
          .
        </p>
      )}
    </div>
  );
}
