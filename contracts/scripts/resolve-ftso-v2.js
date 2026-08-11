// Resolves the registered FTSOv2 feed contract address for any Flare network
// from its contract registry. Both Coston2 and mainnet Flare use the same
// registry address and register the feed under the name "FtsoV2".
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

async function resolveFtsoV2Address(provider) {
  const registry = new Contract(FLARE_CONTRACT_REGISTRY_ADDRESS, REGISTRY_ABI, provider);
  const address = await registry.getContractAddressByName("FtsoV2");

  if (!address || /^0x0+$/.test(address)) {
    throw new Error("FTSOv2 feed is not registered on this network");
  }

  return address;
}

module.exports = { resolveFtsoV2Address };
