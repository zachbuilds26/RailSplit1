import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import {
  buildCheckoutPath,
  buildExplorerAddressUrl,
  buildExplorerTxUrl,
  buildFaucetUrl,
  getRail,
  isRailKey,
  rails,
  type RailConfig,
  type RailKey,
} from "@/lib/rails";

export const railsplitChain = rails.coston2.chain;

export const EXPLORER_URL = rails.coston2.explorerUrl;
export const FAUCET_URL = rails.coston2.faucetUrl;

export const wagmiConfig = createConfig({
  chains: [railsplitChain],
  connectors: [injected({ shimDisconnect: false })],
  multiInjectedProviderDiscovery: true,
  transports: {
    [railsplitChain.id]: http(
      railsplitChain.rpcUrls.default.http[0] ?? "https://coston2-api.flare.network/ext/C/rpc",
    ),
  },
  ssr: true,
});

export function explorerTx(hash: string) {
  return buildExplorerTxUrl("coston2", hash);
}

export function explorerAddress(address: string) {
  return buildExplorerAddressUrl("coston2", address);
}

export function shortenAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export {
  buildCheckoutPath,
  buildExplorerAddressUrl,
  buildExplorerTxUrl,
  buildFaucetUrl,
  getRail,
  isRailKey,
  rails,
  type RailConfig,
  type RailKey,
};

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
