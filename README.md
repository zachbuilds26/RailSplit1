# RailSplit

RailSplit is a Next.js app for Flare Testnet Coston2. A merchant can publish one payment link in US dollars. A customer opens the link, connects a wallet, and pays in FLR at the live FTSOv2 rate onchain.

## What the app has

- Public home page
- Docs page
- Merchant dashboard
- Payment link creation page
- Public checkout page

## Stack

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

## Chain data

RailSplit runs on Flare Testnet Coston2 (chain 114).

- RPC: `https://coston2-api.flare.network/ext/C/rpc`
- Explorer: `https://coston2-explorer.flare.network`
- Faucet: `https://faucet.flare.network/coston2`

The deployed contract address and deploy block are written to `src/lib/contract-address.ts` by the deploy script.

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

## XRP EVM Testnet deployment

RailSplit also has a separate XRP testnet rail. The deploy script reads env values from either `contracts/.env` or the repo-root `.env`, so use whichever one you already keep your testnet keys in.

### Suggested env values

- `DEPLOYER_PRIVATE_KEY` — used by the existing C2FLR deploy script
- `XRP_DEPLOYER_PRIVATE_KEY` — optional, used only for the XRP deploy script
- `XRP_QUOTE_SIGNER_PRIVATE_KEY` — optional, used by the XRP deploy script and the XRP quote API
- `XRP_RPC_URL` — optional, defaults to `https://rpc.testnet.xrplevm.org`
- `XRP_EXPLORER_URL` — optional, defaults to `https://explorer.testnet.xrplevm.org`
- `XRP_QUOTE_TTL_SECONDS` — optional, defaults to `60` and is capped at the contract's 60-second maximum
- XRP/USD prices always use 8 decimal places to match the deployed XRP contract
- XRP/USD is read live from CoinGecko, then Coinbase, then Bitstamp if a source is unavailable

### Deploy XRP

```bash
cd contracts
npm run deploy:xrplevm
```

That writes `src/lib/xrp-contract-address.ts` for the app and prints the deployed testnet address.

### Run the XRP quote API

Set `XRP_QUOTE_SIGNER_PRIVATE_KEY` in the app runtime environment so `/api/xrp/quote` can sign checkout quotes. The public `/api/xrp/rate` dashboard endpoint does not require this key.

## Deploy the app

Build the root app with `npm run build`, then deploy it to any host that supports Next.js 16.

If the contract address changes, rerun the contract deploy script, rewrite the ABI, and rebuild the app.
