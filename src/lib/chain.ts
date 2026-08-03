import { createConfig, http } from "wagmi";
import { flareTestnet } from "wagmi/chains";
import { injected } from "wagmi/connectors";

/**
 * RailSplit runs on Flare Testnet Coston2 (chain 114, native coin C2FLR).
 * viem ships the chain definition, so the RPC and explorer come from there.
 */
export const railsplitChain = flareTestnet;

export const wagmiConfig = createConfig({
  chains: [railsplitChain],
  connectors: [injected({ shimDisconnect: false })],
  transports: {
    [railsplitChain.id]: http("https://coston2-api.flare.network/ext/C/rpc"),
  },
  ssr: true,
});

export const EXPLORER_URL = "https://coston2-explorer.flare.network";
export const FAUCET_URL = "https://faucet.flare.network/coston2";

export function explorerTx(hash: string) {
  return `${EXPLORER_URL}/tx/${hash}`;
}

export function explorerAddress(address: string) {
  return `${EXPLORER_URL}/address/${address}`;
}

export function shortenAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
