// Verifies the money movement in pay(), using a customer wallet that is not
// the merchant. Asserts the merchant receives exactly the converted dollar
// price and the customer is refunded the surplus.
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { JsonRpcProvider, Wallet, Contract, formatEther } = require("ethers");
const { readEnvValue } = require("./read-env");

const RPC_URL = "https://coston2-api.flare.network/ext/C/rpc";
const EXPLORER = "https://coston2-explorer.flare.network";
const SLUG = process.argv[2] || "studio-retainer-july";

function readAddress() {
  const generated = join(__dirname, "..", "..", "src", "lib", "contract-address.ts");
  const match = /RAILSPLIT_PAY_ADDRESS =\s*\n?\s*"(0x[0-9a-fA-F]{40})"/.exec(
    readFileSync(generated, "utf8"),
  );

  if (!match) throw new Error("No address in src/lib/contract-address.ts");
  return match[1];
}

async function main() {
  // A distinct payer is required for the balance assertions: when the payer
  // and merchant are the same wallet, the money just moves out and back in
  // and the refund cannot be told apart. For a quick smoke run the script
  // falls back to the deployer key and skips those checks, printing a warning.
  const distinctPayer = readEnvValue("PAYER_PRIVATE_KEY", [".payer.env"]);
  const payerKey =
    distinctPayer ??
    readEnvValue("DEPLOYER_PRIVATE_KEY") ??
    (() => {
      throw new Error(
        "No PAYER_PRIVATE_KEY. Run: node scripts/new-wallet.js, fund it with C2FLR," +
          " then save the key as PAYER_PRIVATE_KEY in contracts/.payer.env",
      );
    })();

  const address = readAddress();
  const abi = JSON.parse(
    readFileSync(
      join(__dirname, "..", "artifacts", "contracts", "RailSplitPay.sol", "RailSplitPay.json"),
      "utf8",
    ),
  ).abi;

  const provider = new JsonRpcProvider(RPC_URL, 114);
  const customer = new Wallet(payerKey, provider);
  const contract = new Contract(address, abi, customer);

  const link = await contract.getPaymentLink(SLUG);
  const merchant = link.merchant;

  const isDistinct = merchant.toLowerCase() !== customer.address.toLowerCase();

  if (!isDistinct) {
    console.log(
      "WARNING: no distinct payer configured; using the deployer wallet, so the",
    );
    console.log(
      "balance-based refund checks are skipped and only the on-chain event is verified.",
    );
    console.log("");
  }

  console.log("Contract: " + address);
  console.log("Merchant: " + merchant);
  console.log("Customer: " + customer.address);
  console.log("Link:     " + link.title + " at $" + (Number(link.priceUsdCents) / 100).toFixed(2));
  console.log("");

  const [requiredWei] = await contract.quote(SLUG);

  // Deliberately overpay by 5% to prove the surplus comes back.
  const overpayment = requiredWei / 20n;
  const value = requiredWei + overpayment;

  console.log("Quoted required: " + formatEther(requiredWei) + " C2FLR");
  console.log("Sending:         " + formatEther(value) + " C2FLR (5% over)");
  console.log("Expected refund: " + formatEther(overpayment) + " C2FLR (approximately)");

  const merchantBefore = await provider.getBalance(merchant);
  const customerBefore = await provider.getBalance(customer.address);

  const estimated = await contract.pay.estimateGas(SLUG, { value });
  const tx = await contract.pay(SLUG, { value, gasLimit: (estimated * 4n) / 3n });
  const receipt = await tx.wait();

  const gasCost = receipt.gasUsed * receipt.gasPrice;

  console.log("");
  console.log("Tx: " + EXPLORER + "/tx/" + receipt.hash);
  console.log("Gas cost: " + formatEther(gasCost) + " C2FLR");

  const merchantAfter = await provider.getBalance(merchant);
  const customerAfter = await provider.getBalance(customer.address);

  const merchantGained = merchantAfter - merchantBefore;
  const customerSpent = customerBefore - customerAfter;
  const customerPaidNet = customerSpent - gasCost;

  const paidEvent = receipt.logs
    .map((log) => {
      try {
        return contract.interface.parseLog(log);
      } catch {
        return undefined;
      }
    })
    .find((parsed) => parsed?.name === "PaymentReceived");

  if (!paidEvent) throw new Error("No PaymentReceived event");

  const chargedWei = paidEvent.args.amountWei;

  console.log("");
  console.log("Merchant gained:      " + formatEther(merchantGained) + " C2FLR");
  console.log("Customer paid (net):  " + formatEther(customerPaidNet) + " C2FLR");
  console.log("Event amountWei:      " + formatEther(chargedWei) + " C2FLR");
  console.log("");

  // The rate can shift between the quote and mining, so compare against the
  // amount the contract actually charged rather than the earlier quote.
  const checks = [
    [chargedWei > 0n, "charged amount is non-zero"],
    [merchantGained < value, "merchant did not receive the overpayment"],
  ];

  if (isDistinct) {
    checks.push(
      [merchantGained === chargedWei, "merchant received exactly the charged amount"],
      [customerPaidNet === chargedWei, "customer paid exactly the charged amount, surplus refunded"],
    );
  }

  let failed = 0;

  for (const [ok, label] of checks) {
    console.log((ok ? "  PASS  " : "  FAIL  ") + label);
    if (!ok) failed += 1;
  }

  console.log("");

  if (failed > 0) throw new Error(failed + " check(s) failed");

  if (isDistinct) {
    console.log("Refund behaviour verified. The merchant is paid the dollar price and");
    console.log("the customer keeps the difference.");
  } else {
    console.log("Payment executed. Add a distinct PAYER_PRIVATE_KEY in contracts/.payer.env to");
    console.log("also verify the merchant/customer balance split.");
  }
}

main().catch((error) => {
  console.error("");
  console.error("FAILED: " + (error.message || error));
  process.exitCode = 1;
});
