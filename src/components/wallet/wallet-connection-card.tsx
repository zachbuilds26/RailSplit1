"use client";

import { useState } from "react";
import { formatUnits } from "viem";
import { useBalance, useDisconnect, useSwitchChain } from "wagmi";
import { Icon } from "@/components/ui/icon";
import { buildFaucetUrl, getRail, shortenAddress, type RailKey } from "@/lib/chain";
import { useWalletController } from "@/components/wallet/wallet-controller";

export function WalletConnectionCard({ railKey, compact = false }: { railKey: RailKey; compact?: boolean }) {
  const rail = getRail(railKey);
  const { wallet, openWalletModal } = useWalletController();
  const { disconnect } = useDisconnect();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();
  const [switchFailure, setSwitchFailure] = useState("");
  const { data: balance } = useBalance({
    address: wallet.address,
    chainId: rail.chain.id,
    query: { enabled: wallet.isReady && Boolean(wallet.address), refetchInterval: 15000 },
  });

  const wrongChain = wallet.isReady && wallet.chainId !== rail.chain.id;

  async function handleSwitchNetwork() {
    setSwitchFailure("");

    try {
      await switchChainAsync({ chainId: rail.chain.id });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setSwitchFailure(
        /user rejected|user denied/i.test(message)
          ? "You cancelled the network switch."
          : message || `RailSplit could not switch to ${rail.label}.`,
      );
    }
  }

  if (wallet.phase === "bootstrapping" || wallet.phase === "reconnecting" || wallet.phase === "connecting") {
    return (
      <div className={compact ? "" : "w-full"}>
        <p role="status" aria-live="polite" className="text-xs leading-5 text-muted">
          Restoring wallet connection…
        </p>
      </div>
    );
  }

  if (!wallet.isReady) {
    return (
      <div className={compact ? "" : "w-full"}>
        <button
          type="button"
          onClick={(event) => openWalletModal(railKey, event.currentTarget)}
          className={`inline-flex items-center justify-center gap-2 bg-accent text-sm font-semibold text-accent-ink hover:bg-white ${compact ? "px-3.5 py-2 text-xs" : "w-full px-5 py-3.5"}`}
        >
          <Icon name="wallet" className={compact ? "size-3.5" : "size-4"} />
          Connect wallet
        </button>
      </div>
    );
  }

  if (wrongChain) {
    return (
      <div className={compact ? "" : "w-full"}>
        <div className="border border-warning/30 bg-warning/10 p-4">
          <p className="text-sm text-warning">Switch network</p>
          <p className="mt-2 text-xs leading-5 text-muted">
            RailSplit runs on {rail.label}. Switch networks to continue.
          </p>
          <button
            type="button"
            disabled={isSwitching}
            onClick={() => void handleSwitchNetwork()}
            className="mt-4 w-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink hover:bg-white disabled:opacity-60"
          >
            {isSwitching ? "Switching…" : `Switch to ${rail.label}`}
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
            <span className="font-mono">{wallet.address && shortenAddress(wallet.address)}</span>
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
          This wallet does not hold any {rail.nativeSymbol} yet. {" "}
          <a
            href={buildFaucetUrl(rail.key)}
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
