const { readEnvValue } = require("./scripts/read-env");

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
};
