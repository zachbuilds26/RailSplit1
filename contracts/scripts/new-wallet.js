// Creates a throwaway deployer wallet for Coston2 and prints the address.
// The private key is written to .env, which git ignores.
const { writeFileSync } = require("node:fs");
const { join } = require("node:path");
const { Wallet } = require("ethers");
const { readEnvValue } = require("./read-env");

const envPath = join(__dirname, "..", ".env");

if (readEnvValue("DEPLOYER_PRIVATE_KEY")) {
  console.log(".env already holds a deployer key. Delete it first to make a new one.");
  process.exit(0);
}

const wallet = Wallet.createRandom();

writeFileSync(envPath, `DEPLOYER_PRIVATE_KEY=${wallet.privateKey}\n`, "utf8");

console.log("Deployer wallet created.");
console.log("");
console.log("  Address: " + wallet.address);
console.log("");
console.log("Fund it with C2FLR at https://faucet.flare.network/coston2");
console.log("The key is in contracts/.env and is a testnet-only throwaway.");
