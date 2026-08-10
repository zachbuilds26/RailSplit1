const { readEnvValue } = require("./scripts/read-env");

const deployerKey = readEnvValue("DEPLOYER_PRIVATE_KEY");
const xrplevmDeployerKey = readEnvValue("XRP_DEPLOYER_PRIVATE_KEY") || deployerKey;
const xrplevmRpcUrl = readEnvValue("XRP_RPC_URL") || readEnvValue("XRPL_EVM_RPC_URL") || "https://rpc.testnet.xrplevm.org";
const coston2Accounts = deployerKey ? [deployerKey] : [];
const xrplevmAccounts = xrplevmDeployerKey ? [xrplevmDeployerKey] : coston2Accounts;

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
    xrplevmTestnet: {
      url: xrplevmRpcUrl,
      chainId: 1449000,
      accounts: xrplevmAccounts,
    },
    flare: {
      url: "https://flare-api.flare.network/ext/C/rpc",
      chainId: 14,
      accounts: coston2Accounts,
    },
  },
};
