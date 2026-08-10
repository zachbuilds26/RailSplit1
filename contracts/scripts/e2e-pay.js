// End-to-end check of the payment path against the deployed contract.
//
// Pays a live link, then asserts the merchant balance rose, the counters
// advanced, and a PaymentReceived event carried the oracle rate used.
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { JsonRpcProvider, Wallet, Contract, formatEther } = require("ethers");
const { readEnvValue } = require("./read-env");

const RPC_URL = "https://coston2-api.flare.network/ext/C/rpc";
const EXPLORER = "https://coston2-explorer.flare.network";
const SLUG = process.argv[2] || "archive-print-release";

function readAddress() {
  const generated = join(__dirname, "..", "..", "src", "lib", "contract-address.ts");
  const match = /RAILSPLIT_PAY_ADDRESS =\s*\n?\s*"(0x[0-9a-fA-F]{40})"/.exec(
    readFileSync(generated, "utf8"),
  );

  if (!match) throw new Error("No address in src/lib/contract-address.ts");
  return match[1];
}

async function main() {
  const key = readEnvValue("DEPLOYER_PRIVATE_KEY");
  if (!key) throw new Error("No DEPLOYER_PRIVATE_KEY");

  const address = readAddress();
  const abi = JSON.parse(
    readFileSync(
      join(__dirname, "..", "artifacts", "contracts", "RailSplitPay.sol", "RailSplitPay.json"),
      "utf8",
    ),
  ).abi;

  const provider = new JsonRpcProvider(RPC_URL, 114);
  const wallet = new Wallet(key, provider);
  const contract = new Contract(address, abi, wallet);

  console.log("Contract: " + address);
  console.log("Payer:    " + wallet.address);
  console.log("Slug:     " + SLUG);
  console.log("");

  const before = await contract.getPaymentLink(SLUG);
  const merchant = before.merchant;

  console.log("Link:     " + before.title);
  console.log("Price:    $" + (Number(before.priceUsdCents) / 100).toFixed(2));
  console.log("Payments before: " + before.paymentCount.toString());

  const [requiredWei, feedValue, feedDecimals] = await contract.quote(SLUG);
  const rate = Number(feedValue) / 10 ** Number(feedDecimals);

  console.log("");
  console.log("Oracle rate:  " + rate.toFixed(8) + " USD per FLR");
  console.log("Required:     " + formatEther(requiredWei) + " C2FLR");

  // Confirm the contract's conversion matches an independent calculation.
  const expected = (Number(before.priceUsdCents) / 100) / rate;
  const actual = Number(formatEther(requiredWei));
  const drift = Math.abs(expected - actual) / expected;

  console.log("Independent:  " + expected.toFixed(6) + " C2FLR");
  console.log("Drift:        " + (drift * 100).toFixed(6) + "%");

  if (drift > 0.0001) {
    throw new Error("Conversion mismatch between contract and expected value");
  }

  // A buffer covers rate movement between the quote and mining. The contract
  // refunds anything above the rate it actually charges.
  const value = requiredWei + requiredWei / 100n;

  const merchantBefore = await provider.getBalance(merchant);

  console.log("");
  console.log("Paying with " + formatEther(value) + " C2FLR sent...");

  // The FTSO read reaches the registry and the feed, and whether those slots
  // are cold or warm depends on what else touched the feed in the same block.
  // A bare estimate can land just under the real cost, so raise it by a third.
  const estimated = await contract.pay.estimateGas(SLUG, { value });
  const gasLimit = (estimated * 4n) / 3n;

  console.log("Gas estimate " + estimated + ", sending limit " + gasLimit);

  const tx = await contract.pay(SLUG, { value, gasLimit });
  const receipt = await tx.wait();

  console.log("Mined in block " + receipt.blockNumber);
  console.log("Tx: " + EXPLORER + "/tx/" + receipt.hash);
  console.log("Gas used: " + receipt.gasUsed.toString());

  const paidEvent = receipt.logs
    .map((log) => {
      try {
        return contract.interface.parseLog(log);
      } catch {
        return undefined;
      }
    })
    .find((parsed) => parsed?.name === "PaymentReceived");

  if (!paidEvent) throw new Error("No PaymentReceived event in the receipt");

  console.log("");
  console.log("PaymentReceived:");
  console.log("  payer:      " + paidEvent.args.payer);
  console.log("  amountWei:  " + formatEther(paidEvent.args.amountWei) + " C2FLR");
  console.log("  priceCents: " + paidEvent.args.priceUsdCents.toString());
  console.log("  feedValue:  " + paidEvent.args.flrUsdPrice.toString());
  console.log("  feedTime:   " + paidEvent.args.feedTimestamp.toString());

  const after = await contract.getPaymentLink(SLUG);
  const merchantAfter = await provider.getBalance(merchant);
  const gained = merchantAfter - merchantBefore;

  console.log("");
  console.log("Payments after:  " + after.paymentCount.toString());
  console.log("Collected cents: " + after.totalReceivedUsdCents.toString());
  console.log("Merchant gained: " + formatEther(gained) + " C2FLR");

  const checks = [
    [after.paymentCount === before.paymentCount + 1n, "payment counter advanced by one"],
    [
      after.totalReceivedUsdCents === before.totalReceivedUsdCents + before.priceUsdCents,
      "dollar total advanced by the link price",
    ],
    [after.totalReceivedWei > before.totalReceivedWei, "coin total advanced"],
    [paidEvent.args.flrUsdPrice > 0n, "event carried a non-zero oracle rate"],
  ];

  console.log("");

  let failed = 0;

  for (const [ok, label] of checks) {
    console.log((ok ? "  PASS  " : "  FAIL  ") + label);
    if (!ok) failed += 1;
  }

  // The payer is also the merchant on the seeded links, so a balance rise is
  // only meaningful when they differ.
  if (merchant.toLowerCase() !== wallet.address.toLowerCase()) {
    const ok = gained > 0n;
    console.log((ok ? "  PASS  " : "  FAIL  ") + "merchant balance rose");
    if (!ok) failed += 1;
  } else {
    console.log("  SKIP  merchant balance (payer is the merchant on this link)");
  }

  console.log("");

  if (failed > 0) throw new Error(failed + " check(s) failed");

  console.log("End-to-end payment verified.");
}

main().catch((error) => {
  console.error("");
  console.error("FAILED: " + (error.message || error));
  process.exitCode = 1;
});
