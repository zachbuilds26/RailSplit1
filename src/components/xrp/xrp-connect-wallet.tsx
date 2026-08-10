"use client";

import { WalletConnectionCard } from "@/components/wallet/wallet-connection-card";

/** Connects a browser wallet for the XRPL EVM Testnet payment rail. */
export function XrpConnectWallet({ compact = false }: { compact?: boolean }) {
  return <WalletConnectionCard railKey="xrpl-evm-testnet" compact={compact} />;
}
