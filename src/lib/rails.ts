import { flareTestnet, xrplevmTestnet } from "wagmi/chains";
import type { Chain } from "viem";
import { RAILSPLIT_PAY_ADDRESS } from "@/lib/contract-address";
import { XRPL_EVM_PAY_ADDRESS } from "@/lib/xrp-contract-address";

export type RailKey = "coston2" | "xrpl-evm-testnet";
export type RailPricingMode = "ftso" | "signed-quote";

export type RailConfig = {
  key: RailKey;
  label: string;
  routeSegment: string;
  checkoutSegment: "flare" | "xrpl";
  chain: Chain;
  nativeSymbol: string;
  explorerUrl: string;
  faucetUrl: string;
  contractAddress: `0x${string}` | "";
  pricingMode: RailPricingMode;
};

export const rails = {
  coston2: {
    key: "coston2",
    label: flareTestnet.name,
    routeSegment: "coston2",
    checkoutSegment: "flare",
    chain: flareTestnet,
    nativeSymbol: flareTestnet.nativeCurrency.symbol,
    explorerUrl: "https://coston2-explorer.flare.network",
    faucetUrl: "https://faucet.flare.network/coston2",
    contractAddress: RAILSPLIT_PAY_ADDRESS,
    pricingMode: "ftso",
  },
  "xrpl-evm-testnet": {
    key: "xrpl-evm-testnet",
    label: xrplevmTestnet.name,
    routeSegment: "xrpl-evm-testnet",
    checkoutSegment: "xrpl",
    chain: xrplevmTestnet,
    nativeSymbol: xrplevmTestnet.nativeCurrency.symbol,
    explorerUrl: xrplevmTestnet.blockExplorers?.default?.url ?? "https://explorer.testnet.xrplevm.org",
    faucetUrl: "https://faucet.xrplevm.org",
    contractAddress: XRPL_EVM_PAY_ADDRESS,
    pricingMode: "signed-quote",
  },
} as const satisfies Record<RailKey, RailConfig>;

export function isRailKey(value: string | null | undefined): value is RailKey {
  return value === "coston2" || value === "xrpl-evm-testnet";
}

export function getRail(railKey: string | null | undefined = "coston2") {
  return isRailKey(railKey) ? rails[railKey] : rails.coston2;
}

export function getRailByChainId(chainId: number | undefined) {
  if (chainId === rails.coston2.chain.id) return rails.coston2;
  if (chainId === rails["xrpl-evm-testnet"].chain.id) return rails["xrpl-evm-testnet"];
  return rails.coston2;
}

export function buildCheckoutPath(railKey: RailKey, slug: string) {
  return `/pay/${rails[railKey].checkoutSegment}/${slug}`;
}

export function getRailByCheckoutSegment(segment: string | null | undefined) {
  if (segment === "flare" || segment === "coston2") return rails.coston2;
  if (segment === "xrpl" || segment === "xrpl-evm-testnet") return rails["xrpl-evm-testnet"];
  return undefined;
}

export function buildExplorerTxUrl(railKey: RailKey, hash: string) {
  return `${getRail(railKey).explorerUrl}/tx/${hash}`;
}

export function buildExplorerAddressUrl(railKey: RailKey, address: string) {
  return `${getRail(railKey).explorerUrl}/address/${address}`;
}

export function buildFaucetUrl(railKey: RailKey) {
  return getRail(railKey).faucetUrl;
}
