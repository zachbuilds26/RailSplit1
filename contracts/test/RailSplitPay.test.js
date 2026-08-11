// Contract tests for RailSplitPay.
//
// The contract prices payments from the live FTSOv2 FLR/USD feed, so these
// run against a Coston2 fork (see networks.hardhat.forking in hardhat.config.js).
//   npm test
const assert = require("node:assert");
const { resolveFtsoV2Address } = require("../scripts/resolve-ftso-v2");

const DEFAULT_PRICE_USD_CENTS = 2500n;

async function deploy() {
  const [merchant, customer] = await ethers.getSigners();
  const factory = await ethers.getContractFactory("RailSplitPay");

  // The fork mirrors Coston2 state, so the registered FLR/USD feed address is
  // read from the on-chain registry rather than hardcoded. EDR refuses to run
  // a call at the fork block itself, so mine one local block to move "latest"
  // past it first.
  await ethers.provider.send("evm_mine", []);
  const ftsoV2Address = await resolveFtsoV2Address(ethers.provider);
  const contract = await factory.deploy(ftsoV2Address);
  await contract.waitForDeployment();

  // The fork is shared across every test in this file, so signer balances
  // persist between them. Tests 1-2 each move thousands of C2FLR out of the
  // customer wallet, and a drained wallet would mask the revert tests with an
  // "insufficient funds" error. Top both signers up so each test starts with
  // the same fresh budget.
  const budget = "0x" + (10000n * 10n ** 18n).toString(16);
  await ethers.provider.send("hardhat_setBalance", [await merchant.getAddress(), budget]);
  await ethers.provider.send("hardhat_setBalance", [await customer.getAddress(), budget]);

  return { contract, merchant, customer };
}

/** Pulls the PaymentReceived event out of a receipt. */
function paymentEvent(contract, receipt) {
  const parsed = receipt.logs
    .map((log) => {
      try {
        return contract.interface.parseLog(log);
      } catch {
        return undefined;
      }
    })
    .find((entry) => entry?.name === "PaymentReceived");

  assert.ok(parsed, "receipt should carry a PaymentReceived event");
  return parsed.args;
}

/** Asserts a transaction reverts with a named custom error. */
async function expectRevert(promise, errorName) {
  await assert.rejects(promise, (error) => {
    const text = [
      error?.message,
      error?.errorName,
      error?.info?.error?.name,
      error?.name,
    ]
      .filter(Boolean)
      .join(" ");
    return text.includes(errorName);
  }, `expected revert with ${errorName}`);
}

async function currentBlockTime() {
  return BigInt((await ethers.provider.getBlock("latest")).timestamp);
}

describe("RailSplitPay", function () {
  it("creates a link, quotes it at the live feed, and pays it", async function () {
    const { contract, merchant, customer } = await deploy();
    const merchantAddress = await merchant.getAddress();

    await contract.createPaymentLink("demo-check", "Demo check", DEFAULT_PRICE_USD_CENTS, 0n);

    const before = await contract.getPaymentLink("demo-check");
    assert.equal(before.title, "Demo check");
    assert.equal(before.active, true);
    assert.equal(before.paymentCount, 0n);

    const [requiredWei, feedValue, , feedTimestamp] = await contract.quote("demo-check");
    assert.ok(requiredWei > 0n, "quote should produce a non-zero amount");
    assert.ok(feedValue > 0n, "feed should return a non-zero FLR/USD value");
    assert.ok(feedTimestamp > 0n, "feed should carry a timestamp");

    const value = requiredWei + requiredWei / 20n;
    const merchantBefore = await ethers.provider.getBalance(merchantAddress);

    const tx = await contract.connect(customer).pay("demo-check", { value });
    const receipt = await tx.wait();
    assert.equal(receipt.status, 1, "payment transaction should succeed");

    // All money assertions derive from the mining-time amount, so a live feed
    // tick between the quote and the block cannot make the test flaky.
    const paid = paymentEvent(contract, receipt);
    const chargedWei = paid.amountWei;
    assert.ok(chargedWei > 0n);
    assert.ok(chargedWei <= value, "charged amount should not exceed what was sent");

    const after = await contract.getPaymentLink("demo-check");
    const merchantAfter = await ethers.provider.getBalance(merchantAddress);

    assert.equal(after.active, false, "link should close after payment");
    assert.equal(after.paymentCount, 1n, "payment counter should advance");
    assert.equal(after.totalReceivedUsdCents, DEFAULT_PRICE_USD_CENTS);
    assert.equal(after.totalReceivedWei, chargedWei);
    assert.equal(merchantAfter - merchantBefore, chargedWei, "merchant should gain the charged amount");
    assert.equal(paid.priceUsdCents, DEFAULT_PRICE_USD_CENTS);

    assert.equal(await contract.paymentCount(), 1n);
    const [payments] = await contract.getPayments(0n, 10n);
    assert.equal(payments.length, 1);
    assert.equal(payments[0].amountWei, chargedWei);
  });

  it("refunds the surplus to the customer", async function () {
    const { contract, merchant, customer } = await deploy();
    const customerAddress = await customer.getAddress();

    await contract.createPaymentLink("refund-check", "Refund check", DEFAULT_PRICE_USD_CENTS, 0n);

    const [requiredWei] = await contract.quote("refund-check");
    const value = requiredWei + requiredWei / 20n;

    const customerBefore = await ethers.provider.getBalance(customerAddress);
    const tx = await contract.connect(customer).pay("refund-check", { value });
    const receipt = await tx.wait();

    const gasCost = receipt.gasUsed * receipt.gasPrice;
    const paid = paymentEvent(contract, receipt);
    const chargedWei = paid.amountWei;
    const customerNetSpend =
      customerBefore - (await ethers.provider.getBalance(customerAddress)) - gasCost;

    // Customer pays exactly the charged amount after gas; the surplus returns.
    assert.equal(customerNetSpend, chargedWei, "customer should not pay the surplus");
    assert.ok(chargedWei < value, "surplus should have been refunded");
    assert.ok(merchant.address, "merchant references a real address");
  });

  it("reverts when the payment is under the quoted amount", async function () {
    const { contract, customer } = await deploy();

    await contract.createPaymentLink("underpaid", "Underpaid", DEFAULT_PRICE_USD_CENTS, 0n);
    const [requiredWei] = await contract.quote("underpaid");

    await expectRevert(
      contract.connect(customer).pay("underpaid", { value: requiredWei - 1n }),
      "Underpaid",
    );
  });

  it("rejects a duplicate slug", async function () {
    const { contract } = await deploy();

    await contract.createPaymentLink("taken", "First", DEFAULT_PRICE_USD_CENTS, 0n);

    await expectRevert(
      contract.createPaymentLink("taken", "Second", DEFAULT_PRICE_USD_CENTS, 0n),
      "SlugTaken",
    );
  });

  it("rejects slugs and titles that are too long", async function () {
    const { contract } = await deploy();

    await expectRevert(
      contract.createPaymentLink("a".repeat(65), "Title", DEFAULT_PRICE_USD_CENTS, 0n),
      "SlugTooLong",
    );

    await expectRevert(
      contract.createPaymentLink("ok-slug", "t".repeat(201), DEFAULT_PRICE_USD_CENTS, 0n),
      "TitleTooLong",
    );
  });

  it("rejects an expiry in the past", async function () {
    const { contract } = await deploy();
    const past = (await currentBlockTime()) - 100n;

    await expectRevert(
      contract.createPaymentLink("expired", "Expired", DEFAULT_PRICE_USD_CENTS, past),
      "ExpiryInPast",
    );
  });

  it("rejects payment after the link expires", async function () {
    const { contract, customer } = await deploy();
    const expiresAt = (await currentBlockTime()) + 3n;

    await contract.createPaymentLink("short-lived", "Short lived", DEFAULT_PRICE_USD_CENTS, expiresAt);
    const [requiredWei] = await contract.quote("short-lived");

    await ethers.provider.send("evm_increaseTime", [6]);
    await ethers.provider.send("evm_mine", []);

    await expectRevert(
      contract.connect(customer).pay("short-lived", { value: requiredWei }),
      "LinkExpired",
    );
  });

  it("quote refuses an inactive link", async function () {
    const { contract } = await deploy();

    await contract.createPaymentLink("quote-inactive", "Quote inactive", DEFAULT_PRICE_USD_CENTS, 0n);
    await contract.closePaymentLink("quote-inactive");

    await expectRevert(contract.quote("quote-inactive"), "LinkInactive");
  });

  it("quote refuses an expired link", async function () {
    const { contract } = await deploy();
    const expiresAt = (await currentBlockTime()) + 3n;

    await contract.createPaymentLink("quote-expired", "Quote expired", DEFAULT_PRICE_USD_CENTS, expiresAt);
    await ethers.provider.send("evm_increaseTime", [6]);
    await ethers.provider.send("evm_mine", []);

    await expectRevert(contract.quote("quote-expired"), "LinkExpired");
  });

  it("only the merchant can close a link", async function () {
    const { contract, merchant, customer } = await deploy();

    await contract.createPaymentLink("closable", "Closable", DEFAULT_PRICE_USD_CENTS, 0n);

    await expectRevert(
      contract.connect(customer).closePaymentLink("closable"),
      "NotMerchant",
    );

    await contract.connect(merchant).closePaymentLink("closable");
    const link = await contract.getPaymentLink("closable");
    assert.equal(link.active, false);
  });
});