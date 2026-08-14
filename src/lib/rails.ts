import { flareTestnet } from "wagmi/chains";
import type { Chain } from "viem";
import { RAILSPLIT_PAY_ADDRESS } from "@/lib/contract-address";

export type RailKey = "coston2";

export type RailConfig = {
  key: RailKey;
  label: string;
  chain: Chain;
  nativeSymbol: string;
  explorerUrl: string;
  faucetUrl: string;
  contractAddress: `0x${string}` | "";
};

/**
 * FXRP is the FAsset representation of XRP on Flare: an ERC-20 token backed
 * 1:1 by XRP locked through the FAssets system. On Coston2 it is dispensed by
 * the testnet faucet. Payments in FXRP move through approve + transferFrom
 * instead of the native coin's msg.value.
 */
export const FXRP = {
  address: "0x0b6A3645c240605887a5532109323A3E12273dc7" as `0x${string}`,
  symbol: "FXRP",
  name: "FTestXRP",
  decimals: 6,
};

export const rails = {
  coston2: {
    key: "coston2",
    label: flareTestnet.name,
    chain: flareTestnet,
    nativeSymbol: flareTestnet.nativeCurrency.symbol,
    explorerUrl: "https://coston2-explorer.flare.network",
    faucetUrl: "https://faucet.flare.network/coston2",
    contractAddress: RAILSPLIT_PAY_ADDRESS,
  },
} as const satisfies Record<RailKey, RailConfig>;

export function isRailKey(value: string | null | undefined): value is RailKey {
  return value === "coston2";
}

export function getRail(railKey: string | null | undefined = "coston2") {
  return isRailKey(railKey) ? rails[railKey] : rails.coston2;
}

export function buildCheckoutPath(slug: string) {
  return `/pay/${slug}`;
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