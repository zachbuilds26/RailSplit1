const assert = require("node:assert/strict");
const hre = require("hardhat");
const { ethers } = require("ethers");
const artifact = require("../artifacts/contracts/RailSplitPayXrp.sol/RailSplitPayXrp.json");

const QUOTE_DECIMALS = 8n;
const MAX_QUOTE_AGE = 60n;

async function deployFixture() {
  const provider = new ethers.BrowserProvider(hre.network.provider);
  const deployer = await provider.getSigner(0);
  const merchant = await provider.getSigner(1);
  const customer = await provider.getSigner(2);
  const quoteSigner = await provider.getSigner(3);
  const wrongSigner = await provider.getSigner(4);

  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, deployer);
  const contract = await factory.deploy(await quoteSigner.getAddress());
  await contract.waitForDeployment();

  return { provider, contract, merchant, customer, quoteSigner, wrongSigner };
}

function linkId(slug) {
  return ethers.keccak256(ethers.toUtf8Bytes(slug));
}

function requiredWei(priceUsdCents, xrpUsdPrice) {
  return (priceUsdCents * (10n ** 16n) * (10n ** QUOTE_DECIMALS)) / xrpUsdPrice;
}

async function latestTimestamp() {
  const block = await hre.network.provider.send("eth_getBlockByNumber", ["latest", false]);
  return BigInt(block.timestamp);
}

async function signQuote({
  quoteSigner,
  chainId,
  contractAddress,
  slug,
  priceUsdCents,
  xrpUsdPrice,
  issuedAt,
  validUntil,
}) {
  return quoteSigner.signTypedData(
    {
      name: "RailSplit XRP Quote",
      version: "1",
      chainId,
      verifyingContract: contractAddress,
    },
    {
      PaymentQuote: [
        { name: "linkId", type: "bytes32" },
        { name: "priceUsdCents", type: "uint64" },
        { name: "xrpUsdPrice", type: "uint256" },
        { name: "issuedAt", type: "uint64" },
        { name: "validUntil", type: "uint64" },
      ],
    },
    {
      linkId: linkId(slug),
      priceUsdCents,
      xrpUsdPrice,
      issuedAt,
      validUntil,
    },
  );
}

describe("RailSplitPayXrp", function () {
  it("creates links and pays them with a signed XRP quote", async function () {
    const { provider, contract, merchant, customer, quoteSigner } = await deployFixture();
    const slug = "arcade-run-001";
    const priceUsdCents = 25n;
    const xrpUsdPrice = 100000000n;
    const expectedWei = requiredWei(priceUsdCents, xrpUsdPrice);

    await contract.connect(merchant).createPaymentLink(slug, "Arcade Run 001", priceUsdCents, 0);

    const before = await contract.getPaymentLink(slug);
    assert.equal(before.active, true);
    assert.equal(before.paymentCount, 0n);

    const network = await provider.getNetwork();
    const issuedAt = await latestTimestamp();
    const validUntil = issuedAt + MAX_QUOTE_AGE;
    const signature = await signQuote({
      quoteSigner,
      chainId: Number(network.chainId),
      contractAddress: await contract.getAddress(),
      slug,
      priceUsdCents,
      xrpUsdPrice,
      issuedAt,
      validUntil,
    });

    const tx = await contract.connect(customer).pay(slug, xrpUsdPrice, issuedAt, validUntil, signature, {
      value: expectedWei,
    });
    const receipt = await tx.wait();

    const paidEvent = receipt.logs
      .map((log) => {
        try {
          return contract.interface.parseLog(log);
        } catch {
          return undefined;
        }
      })
      .find((parsed) => parsed && parsed.name === "PaymentReceived");

    assert.ok(paidEvent);
    assert.equal(paidEvent.args.linkId, linkId(slug));
    assert.equal(paidEvent.args.payer, await customer.getAddress());
    assert.equal(paidEvent.args.amountWei, expectedWei);
    assert.equal(paidEvent.args.priceUsdCents, priceUsdCents);
    assert.equal(paidEvent.args.xrpUsdPrice, xrpUsdPrice);
    assert.equal(paidEvent.args.quoteIssuedAt, issuedAt);
    assert.equal(paidEvent.args.quoteValidUntil, validUntil);

    const after = await contract.getPaymentLink(slug);
    assert.equal(after.active, false);
    assert.equal(after.paymentCount, 1n);
    assert.equal(after.totalReceivedUsdCents, priceUsdCents);
    assert.equal(after.totalReceivedWei, expectedWei);
  });

  it("rejects invalid quote signatures", async function () {
    const { contract, customer, merchant, wrongSigner } = await deployFixture();
    const slug = "studio-retainer-july";
    const priceUsdCents = 10n;
    const xrpUsdPrice = 100000000n;
    const expectedWei = requiredWei(priceUsdCents, xrpUsdPrice);

    await contract.connect(merchant).createPaymentLink(slug, "July studio retainer", priceUsdCents, 0);

    const chainId = Number((await (new ethers.BrowserProvider(hre.network.provider)).getNetwork()).chainId);
    const issuedAt = await latestTimestamp();
    const validUntil = issuedAt + MAX_QUOTE_AGE;
    const signature = await signQuote({
      quoteSigner: wrongSigner,
      chainId,
      contractAddress: await contract.getAddress(),
      slug,
      priceUsdCents,
      xrpUsdPrice,
      issuedAt,
      validUntil,
    });

    await assert.rejects(
      contract.connect(customer).pay(slug, xrpUsdPrice, issuedAt, validUntil, signature, { value: expectedWei }),
      (error) => error?.data === "0x9c584f54",
    );
  });

  it("rejects expired quotes", async function () {
    const { contract, customer, merchant, quoteSigner } = await deployFixture();
    const slug = "archive-print-release";
    const priceUsdCents = 5n;
    const xrpUsdPrice = 100000000n;
    const expectedWei = requiredWei(priceUsdCents, xrpUsdPrice);

    await contract.connect(merchant).createPaymentLink(slug, "Archive print release", priceUsdCents, 0);

    const chainId = Number((await (new ethers.BrowserProvider(hre.network.provider)).getNetwork()).chainId);
    const issuedAt = (await latestTimestamp()) - (MAX_QUOTE_AGE + 1n);
    const validUntil = issuedAt + MAX_QUOTE_AGE;
    const signature = await signQuote({
      quoteSigner,
      chainId,
      contractAddress: await contract.getAddress(),
      slug,
      priceUsdCents,
      xrpUsdPrice,
      issuedAt,
      validUntil,
    });

    await assert.rejects(
      contract.connect(customer).pay(slug, xrpUsdPrice, issuedAt, validUntil, signature, { value: expectedWei }),
      (error) => error?.data === "0x8727a7f9",
    );
  });
});
