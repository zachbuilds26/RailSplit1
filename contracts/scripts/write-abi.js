const { readFileSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");
const artifact = JSON.parse(readFileSync(join(__dirname,"..","artifacts","contracts","RailSplitPay.sol","RailSplitPay.json"), "utf8"));
const out = join(__dirname,"..","..","src","lib","railsplit-pay-abi.ts");
writeFileSync(out,
  "// Generated from the compiled RailSplitPay artifact. Do not edit by hand.\n" +
  "// Regenerate with: node contracts/scripts/write-abi.js\n\n" +
  "export const RAILSPLIT_PAY_ABI = " + JSON.stringify(artifact.abi, null, 2) + " as const;\n",
  "utf8");
console.log("wrote", out, "-", artifact.abi.length, "entries");
