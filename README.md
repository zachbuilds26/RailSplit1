# RailSplit

RailSplit is a Next.js app for Flare Testnet Coston2. A merchant publishes a payment link priced in US dollars, and a customer pays it in the network's native coin (C2FLR) at the live FTSOv2 FLR/USD rate, all onchain.

- A merchant sets a dollar price, publishes one link, and the settlement lands directly in their connected wallet.
- The conversion happens inside the contract against the live feed at payment time, so no one can pay at a stale or self-chosen rate.
- Customers send the quoted coin amount plus a small buffer; the contract refunds the surplus in the same transaction.
- A link is single use and closes itself once a payment settles. If the feed is more than 300 seconds old, the payment is rejected rather than settled at an old rate.
- Settlement history is stored onchain (not just emitted) and read back in pages, so the dashboard works on public RPC infrastructure.

Live demo: https://railsplit.vercel.app

## What the app has

- Public home page
- Docs page
- Merchant dashboard with settlement metrics, payment links, and a live onchain ledger
- Payment link creation page with live quote preview and QR/share after publishing
- Public checkout page with live quoting and readable contract errors
- Customer receipt page (download as JPEG, view on explorer)
- "My receipts" history on the payer's device
- QR share dialog for existing links

## Stack

- Solidity 0.8.25 with FTSOv2 through `@flarenetwork/flare-periphery-contracts`
- Next.js 16
- React 19
- Tailwind CSS 4
- Wagmi
- Viem
- Flare Testnet Coston2

## Run the app

1. Install packages at the repo root:

   ```bash
   npm install
   ```

2. Start the app:

   ```bash
   npm run dev
   ```

3. Open `http://localhost:3000`.

## Check the app

```bash
npm run lint
npm run build
```

## Main routes

- `/` - public home page
- `/docs` - product docs
- `/dashboard` - merchant dashboard
- `/dashboard/links/new` - new payment link form
- `/pay/[slug]` - public checkout page
- `/pay/[slug]/receipt?tx=<hash>` - customer receipt for a settled payment
- `/receipts` - receipts history saved on this device

## Chain data

RailSplit runs on Flare Testnet Coston2 (chain 114).

- RPC: `https://coston2-api.flare.network/ext/C/rpc`
- Explorer: `https://coston2-explorer.flare.network`
- Faucet: `https://faucet.flare.network/coston2`

The deployed contract address is written to `src/lib/contract-address.ts` by the deploy script.

## Contract workspace

The contract code is in `contracts/`. It is a separate Hardhat project.

1. Install contract packages:

   ```bash
   cd contracts
   npm install
   ```

2. Compile the contract:

   ```bash
   npm run compile
   ```

3. Write the ABI file used by the app:

   ```bash
   node scripts/write-abi.js
   ```

4. Set `DEPLOYER_PRIVATE_KEY` in your shell, then deploy:

   ```bash
   npm run deploy:coston2
   ```

The deploy script deploys `RailSplitPay`, seeds sample links, and writes the new contract address into the Next.js app.

## Deploy the app

Build the root app with `npm run build`, then deploy it to any host that supports Next.js 16.

If the contract address changes, rerun the contract deploy script, rewrite the ABI, and rebuild the app.
