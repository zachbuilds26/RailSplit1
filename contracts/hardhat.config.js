const { readEnvValue } = require("./scripts/read-env");
require("@nomicfoundation/hardhat-ethers");

const deployerKey = readEnvValue("DEPLOYER_PRIVATE_KEY");
const coston2Accounts = deployerKey ? [deployerKey] : [];

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "cancun",
    },
  },
  networks: {
    // Tests read the live FTSOv2 feed, so they run against a Coston2 fork.
    hardhat: {
      forking: { url: "https://coston2-api.flare.network/ext/C/rpc" },
      // EDR needs an explicit hardfork to simulate calls at the fork block;
      // without it the first eth_call on the fork fails with a hardfork
      // activation error for chain 114.
      hardfork: "cancun",
    },
    coston2: {
      url: "https://coston2-api.flare.network/ext/C/rpc",
      chainId: 114,
      accounts: coston2Accounts,
    },
    flare: {
      url: "https://flare-api.flare.network/ext/C/rpc",
      chainId: 14,
      accounts: coston2Accounts,
    },
  },
  // The fork answers the live FTSO feeds over the public Coston2 RPC, which
  // is slow enough to blow past mocha's 40s default for the network-heavy
  // tests. Give the whole suite a generous ceiling.
  mocha: { timeout: 180000 },
};
