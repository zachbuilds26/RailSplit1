"use client";

import { useBalance } from "wagmi";
import { formatUnits } from "viem";
import { getRail, shortenAddress, type RailKey } from "@/lib/chain";
import { ConnectWallet } from "@/components/wallet/connect-wallet";
import { useWalletController } from "@/components/wallet/wallet-controller";

/**
 * Shows the connected wallet identity in the sidebar account section.
 * Falls back to a neutral prompt when no wallet is connected.
 */
export function DashboardSidebarAccount({ railKey }: { railKey: RailKey }) {
  const rail = getRail(railKey);
  const { wallet } = useWalletController();
  const address = wallet.address;
  const { data: balance } = useBalance({
    address,
    chainId: rail.chain.id,
    query: { enabled: Boolean(address) },
  });

  if (!wallet.isReady && wallet.phase !== "disconnected") {
    return (
      <div>
        <p className="text-[10px] font-semibold tracking-[0.14em] text-faint uppercase">Account</p>
        <p role="status" aria-live="polite" className="mt-2 text-sm text-muted">Restoring wallet…</p>
      </div>
    );
  }

  if (!wallet.isReady || !address) {
    return (
      <div>
        <p className="text-[10px] font-semibold tracking-[0.14em] text-faint uppercase">
          Account
        </p>
        <p className="mt-2 text-sm text-muted">Not connected</p>
        <div className="mt-3">
          <ConnectWallet compact />
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-[10px] font-semibold tracking-[0.14em] text-faint uppercase">
        Account
      </p>
      <p className="mt-2 text-sm text-ink font-mono">{shortenAddress(address)}</p>
      {balance !== undefined && (
        <p className="mt-1 text-[10px] text-muted tabular-nums">
          {Number(formatUnits(balance.value, balance.decimals)).toLocaleString("en-US", {
            maximumFractionDigits: 2,
          })} {balance.symbol}
        </p>
      )}
    </div>
  );
}