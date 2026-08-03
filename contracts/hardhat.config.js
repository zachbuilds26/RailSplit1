const { existsSync, readFileSync } = require("node:fs");
const { join } = require("node:path");

// Reads DEPLOYER_PRIVATE_KEY from .env without pulling in a dependency.
function readEnvKey() {
  if (process.env.DEPLOYER_PRIVATE_KEY) return process.env.DEPLOYER_PRIVATE_KEY;

  const envPath = join(__dirname, ".env");
  if (!existsSync(envPath)) return undefined;

  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = /^\s*DEPLOYER_PRIVATE_KEY\s*=\s*(.+?)\s*$/.exec(line);
    if (match) return match[1].replace(/^["']|["']$/g, "");
  }

  return undefined;
}

const deployerKey = readEnvKey();
const accounts = deployerKey ? [deployerKey] : [];

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
      accounts,
    },
    flare: {
      url: "https://flare-api.flare.network/ext/C/rpc",
      chainId: 14,
      accounts,
    },
  },
};
