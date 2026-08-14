// Resolves the FXRP (FAsset XRP) ERC-20 token address for any Flare network
// from its contract registry. The registry maps "AssetManagerFXRP" to the
// FAsset system's asset manager for XRP; the token itself is returned by
// calling `fAsset()` on that manager.
const { Contract } = require("ethers");

const FLARE_CONTRACT_REGISTRY_ADDRESS = "0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019";
const REGISTRY_ABI = [
  {
    name: "getContractAddressByName",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_name", type: "string" }],
    outputs: [{ name: "", type: "address" }],
  },
];
const ASSET_MANAGER_ABI = [
  {
    name: "fAsset",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
];

async function resolveFxrpAddress(provider) {
  const registry = new Contract(FLARE_CONTRACT_REGISTRY_ADDRESS, REGISTRY_ABI, provider);
  const assetManagerAddress = await registry.getContractAddressByName("AssetManagerFXRP");

  if (!assetManagerAddress || /^0x0+$/.test(assetManagerAddress)) {
    throw new Error("AssetManagerFXRP is not registered on this network");
  }

  const assetManager = new Contract(assetManagerAddress, ASSET_MANAGER_ABI, provider);
  const tokenAddress = await assetManager.fAsset();

  if (!tokenAddress || /^0x0+$/.test(tokenAddress)) {
    throw new Error("FXRP token address could not be resolved from the AssetManager");
  }

  return tokenAddress;
}

module.exports = { resolveFxrpAddress };