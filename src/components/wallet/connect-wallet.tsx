"use client";

import { WalletConnectionCard } from "@/components/wallet/wallet-connection-card";

/** Connects a browser wallet for the Coston2 payment rail. */
export function ConnectWallet({ compact = false }: { compact?: boolean }) {
  return <WalletConnectionCard railKey="coston2" compact={compact} />;
}
