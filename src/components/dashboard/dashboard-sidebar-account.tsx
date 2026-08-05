"use client";

import { useAccount, useBalance } from "wagmi";
import { formatUnits } from "viem";
import { railsplitChain, shortenAddress } from "@/lib/chain";
import { ConnectWallet } from "@/components/wallet/connect-wallet";

/**
 * Shows the connected wallet identity in the sidebar account section.
 * Falls back to a neutral prompt when no wallet is connected.
 */
export function DashboardSidebarAccount() {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({
    address,
    chainId: railsplitChain.id,
    query: { enabled: Boolean(address) },
  });

  if (!isConnected || !address) {
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