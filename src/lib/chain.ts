import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import {
  buildCheckoutPath,
  buildExplorerAddressUrl,
  buildExplorerTxUrl,
  buildFaucetUrl,
  getRail,
  getRailByChainId,
  isRailKey,
  rails,
  type RailConfig,
  type RailKey,
  type RailPricingMode,
} from "@/lib/rails";

export const railsplitChain = rails.coston2.chain;
export const xrplEvmTestnetChain = rails["xrpl-evm-testnet"].chain;

/**
 * RailSplit defaults to Flare Testnet Coston2.
 * The rail registry keeps the current flow intact while allowing XRP to be
 * added as a separate EVM-compatible rail.
 */
export const EXPLORER_URL = rails.coston2.explorerUrl;
export const FAUCET_URL = rails.coston2.faucetUrl;

export const wagmiConfig = createConfig({
  chains: [rails.coston2.chain, rails["xrpl-evm-testnet"].chain],
  connectors: [injected({ shimDisconnect: false })],
  transports: {
    [rails.coston2.chain.id]: http(
      rails.coston2.chain.rpcUrls.default.http[0] ?? "https://coston2-api.flare.network/ext/C/rpc",
    ),
    [rails["xrpl-evm-testnet"].chain.id]: http(
      rails["xrpl-evm-testnet"].chain.rpcUrls.default.http[0] ?? "https://rpc.testnet.xrplevm.org",
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

export function explorerTxForRail(railKey: RailKey, hash: string) {
  return buildExplorerTxUrl(railKey, hash);
}

export function explorerAddressForRail(railKey: RailKey, address: string) {
  return buildExplorerAddressUrl(railKey, address);
}

export function faucetForRail(railKey: RailKey) {
  return buildFaucetUrl(railKey);
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
  getRailByChainId,
  isRailKey,
  rails,
  type RailConfig,
  type RailKey,
  type RailPricingMode,
};

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
