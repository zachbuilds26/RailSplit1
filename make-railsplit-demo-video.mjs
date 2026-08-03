import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { encodeAbiParameters, encodeEventTopics, encodeFunctionData, parseAbi, toHex } from 'viem';

const execFileAsync = promisify(execFile);

const ROOT = 'C:/Users/Emmanuel/Desktop/railsplit';
const OUT = path.join(ROOT, 'video-output');
const APP = 'http://127.0.0.1:3000';
const VIEWPORT = { width: 1600, height: 1000 };
const STAGE = { width: 1920, height: 1080 };
const MOCK_ADDRESS = '0x9b4a2e7d1c3f5a6b8d0e1f2a3c4d5e6f7a8b9c0d';
const MOCK_BALANCE = '0x4563918244f40000';
const CHAIN_HEX = '0x72';
const RENDER_SECONDS = 58;

const DEMO_ABI = parseAbi([
  'function flrUsdFeed() view returns (uint256 value, int8 decimals, uint64 timestamp)',
  'function getPaymentLink(string slug) view returns ((address merchant,uint64 priceUsdCents,uint64 createdAt,uint64 expiresAt,bool active,uint32 paymentCount,uint256 totalReceivedWei,uint64 totalReceivedUsdCents,string title))',
  'function getPaymentLinkById(bytes32 linkId) view returns ((address merchant,uint64 priceUsdCents,uint64 createdAt,uint64 expiresAt,bool active,uint32 paymentCount,uint256 totalReceivedWei,uint64 totalReceivedUsdCents,string title))',
  'function quote(string slug) view returns (uint256 requiredWei, uint256 flrUsdPrice, int8 flrUsdDecimals, uint64 feedTimestamp)',
  'event PaymentLinkCreated(bytes32 indexed linkId, address indexed merchant, string slug, string title, uint64 priceUsdCents, uint64 expiresAt)',
  'event PaymentReceived(bytes32 indexed linkId, address indexed merchant, address indexed payer, uint256 amountWei, uint64 priceUsdCents, uint256 flrUsdPrice, int8 flrUsdDecimals, uint64 feedTimestamp)',
]);

const DEMO = {
  merchant: MOCK_ADDRESS,
  payer: MOCK_ADDRESS,
  feedValue: 6330000000000000n,
  feedDecimals: 18,
  feedTimestamp: 1_720_000_000n,
  quoteWei: 39_400_000_000_000_000_000n,
  blockNumber: 33_479_650n,
  created: [
    {
      linkId: '0x1111111111111111111111111111111111111111111111111111111111111111',
      slug: 'arcade-run-001',
      title: 'Arcade Run 001',
      priceUsdCents: 25n,
      createdAt: 1_720_000_050n,
      expiresAt: 0n,
      active: true,
      paymentCount: 1n,
      totalReceivedWei: 39_400_000_000_000_000_000n,
      totalReceivedUsdCents: 25n,
    },
    {
      linkId: '0x2222222222222222222222222222222222222222222222222222222222222222',
      slug: 'studio-intake-014',
      title: 'Studio Intake 014',
      priceUsdCents: 125n,
      createdAt: 1_720_000_120n,
      expiresAt: 0n,
      active: true,
      paymentCount: 0n,
      totalReceivedWei: 0n,
      totalReceivedUsdCents: 0n,
    },
  ],
  payment: {
    linkId: '0x1111111111111111111111111111111111111111111111111111111111111111',
    amountWei: 39_400_000_000_000_000_000n,
    priceUsdCents: 25n,
  },
};

const SELECTORS = {
  flrUsdFeed: encodeFunctionData({ abi: DEMO_ABI, functionName: 'flrUsdFeed' }).slice(0, 10),
  getPaymentLink: encodeFunctionData({ abi: DEMO_ABI, functionName: 'getPaymentLink', args: ['arcade-run-001'] }).slice(0, 10),
  getPaymentLinkById: encodeFunctionData({ abi: DEMO_ABI, functionName: 'getPaymentLinkById', args: [DEMO.created[0].linkId] }).slice(0, 10),
  quote: encodeFunctionData({ abi: DEMO_ABI, functionName: 'quote', args: ['arcade-run-001'] }).slice(0, 10),
};

const TOPICS = {
  created: encodeEventTopics({
    abi: DEMO_ABI,
    eventName: 'PaymentLinkCreated',
    args: {
      linkId: DEMO.created[0].linkId,
      merchant: DEMO.merchant,
    },
  })[0],
  created2: encodeEventTopics({
    abi: DEMO_ABI,
    eventName: 'PaymentLinkCreated',
    args: {
      linkId: DEMO.created[1].linkId,
      merchant: DEMO.merchant,
    },
  })[0],
  payment: encodeEventTopics({
    abi: DEMO_ABI,
    eventName: 'PaymentReceived',
    args: {
      linkId: DEMO.payment.linkId,
      merchant: DEMO.merchant,
      payer: DEMO.payer,
    },
  })[0],
};

const shots = {
  title: { kind: 'title', start: 0, end: 5.5 },
  home: {
    kind: 'shot',
    start: 5.5,
    end: 13.5,
    image: 'home.jpg',
    layout: 'split-right',
    focus: 'center top',
    eyebrow: 'Live landing',
    title: 'RailSplit turns Flare Coston2 into dollar-priced payment links.',
    body: 'Merchants think in USD. Customers pay in FLR. The oracle keeps the price honest.',
    pills: ['USD pricing', 'FTSOv2 feed', 'Coston2'],
  },
  createOff: {
    kind: 'shot',
    start: 13.5,
    end: 20,
    image: 'create-off.jpg',
    layout: 'split-left',
    focus: 'center top',
    eyebrow: 'Publish flow',
    title: 'Connect a wallet to publish the link.',
    body: 'The merchant sets the price in dollars, then signs one transaction to make the URL live.',
    pills: ['Wallet connect', 'One URL', 'Onchain'],
  },
  createOn: {
    kind: 'shot',
    start: 20,
    end: 27,
    image: 'create-on.jpg',
    layout: 'split-right',
    focus: 'center top',
    eyebrow: 'Link live',
    title: 'Publish the payment link onchain.',
    body: 'The form becomes a real contract call, and the checkout URL is ready to share.',
    pills: ['Publish', 'TX confirmation', 'Merchant ready'],
  },
  dashboardTop: {
    kind: 'shot',
    start: 27,
    end: 35,
    image: 'dashboard-top.jpg',
    layout: 'full',
    focus: 'center top',
    eyebrow: 'Merchant ops',
    title: 'One view for live totals, active links, and the oracle rate.',
    body: 'The dashboard reads the chain, keeps the numbers current, and makes the business readable at a glance.',
    pills: ['Active links', 'Collected value', 'Live oracle'],
  },
  dashboardFeed: {
    kind: 'shot',
    start: 35,
    end: 42.5,
    image: 'dashboard-feed.jpg',
    layout: 'full',
    focus: 'center 82%',
    eyebrow: 'Settlement feed',
    title: 'Every payment lands in a clean onchain ledger.',
    body: 'The payment history stays visible, searchable, and tied to the exact link and payer.',
    pills: ['Settlement', 'Readable history', 'Tx links'],
  },
  checkoutOff: {
    kind: 'shot',
    start: 42.5,
    end: 48.5,
    image: 'checkout-off.jpg',
    layout: 'split-right',
    focus: 'center top',
    eyebrow: 'Customer checkout',
    title: 'Connect a wallet to see the rate.',
    body: 'The payment page waits for the wallet before it shows the live FLR quote.',
    pills: ['Wallet connect', 'Live quote', 'Pay path'],
  },
  checkoutOn: {
    kind: 'shot',
    start: 48.5,
    end: 56.5,
    image: 'checkout-on.jpg',
    layout: 'split-left',
    focus: 'center top',
    eyebrow: 'Live payment',
    title: 'See the live FLR quote. Pay in FLR.',
    body: 'The customer pays at the current oracle rate, and the contract settles onchain.',
    pills: ['Live quote', 'Wallet ready', 'Onchain settlement'],
  },
  outro: {
    kind: 'outro',
    start: 56.5,
    end: RENDER_SECONDS,
  },
};

const mockWalletInit = ({ address, chainId }) => {
  const listeners = new Map();
  const emit = (event, payload) => {
    const list = listeners.get(event) || [];
    for (const fn of list) fn(payload);
  };

  const provider = {
    isMetaMask: true,
    chainId,
    selectedAddress: address,
    request: async ({ method, params }) => {
      switch (method) {
        case 'eth_chainId':
          return chainId;
        case 'eth_accounts':
        case 'eth_requestAccounts':
          return [address];
        case 'wallet_switchEthereumChain': {
          const next = params?.[0]?.chainId ?? chainId;
          provider.chainId = next;
          emit('chainChanged', next);
          return null;
        }
        case 'wallet_addEthereumChain':
          return null;
        case 'eth_sendTransaction':
          return '0x' + 'a'.repeat(64);
        case 'personal_sign':
        case 'eth_signTypedData_v4':
          return '0x' + 'b'.repeat(130);
        default:
          throw new Error(`Unsupported wallet method: ${method}`);
      }
    },
    on: (event, fn) => {
      const list = listeners.get(event) || [];
      list.push(fn);
      listeners.set(event, list);
    },
    removeListener: (event, fn) => {
      const list = listeners.get(event) || [];
      listeners.set(
        event,
        list.filter((item) => item !== fn),
      );
    },
  };

  Object.defineProperty(window, 'ethereum', {
    configurable: true,
    value: provider,
  });
};

const LINK_OUTPUT = [
  {
    type: 'tuple',
    components: [
      { type: 'address' },
      { type: 'uint64' },
      { type: 'uint64' },
      { type: 'uint64' },
      { type: 'bool' },
      { type: 'uint32' },
      { type: 'uint256' },
      { type: 'uint64' },
      { type: 'string' },
    ],
  },
];

const FEED_OUTPUT = [
  { type: 'uint256' },
  { type: 'int8' },
  { type: 'uint64' },
];

const QUOTE_OUTPUT = [
  { type: 'uint256' },
  { type: 'uint256' },
  { type: 'int8' },
  { type: 'uint64' },
];

function makeLinkResult(link) {
  return encodeAbiParameters(LINK_OUTPUT, [[
    link.merchant,
    link.priceUsdCents,
    link.createdAt,
    link.expiresAt,
    link.active,
    Number(link.paymentCount),
    link.totalReceivedWei,
    link.totalReceivedUsdCents,
    link.title,
  ]]);
}

function makeFeedResult() {
  return encodeAbiParameters(FEED_OUTPUT, [DEMO.feedValue, DEMO.feedDecimals, DEMO.feedTimestamp]);
}

function makeQuoteResult() {
  return encodeAbiParameters(QUOTE_OUTPUT, [DEMO.quoteWei, DEMO.feedValue, DEMO.feedDecimals, DEMO.feedTimestamp]);
}

function makeCreatedLog(link, index) {
  return {
    address: '0x8E29beF64b0a357A5C31ea36736c2f9f5541b431',
    blockHash: `0x${index.toString(16).padStart(64, '0')}`,
    blockNumber: toHex(DEMO.blockNumber + BigInt(index)),
    data: encodeAbiParameters(
      [
        { type: 'string' },
        { type: 'string' },
        { type: 'uint64' },
        { type: 'uint64' },
      ],
      [link.slug, link.title, link.priceUsdCents, link.expiresAt],
    ),
    logIndex: toHex(index),
    removed: false,
    topics: [
      index === 0 ? TOPICS.created : TOPICS.created2,
      `0x${link.linkId.slice(2)}`,
      `0x${DEMO.merchant.slice(2).padStart(64, '0')}`,
    ],
    transactionHash: `0x${String(index + 3).repeat(64).slice(0, 64)}`,
    transactionIndex: '0x0',
  };
}

function makePaymentLog() {
  return {
    address: '0x8E29beF64b0a357A5C31ea36736c2f9f5541b431',
    blockHash: `0x${'9'.repeat(64)}`,
    blockNumber: toHex(DEMO.blockNumber + 3n),
    data: encodeAbiParameters(
      [
        { type: 'uint256' },
        { type: 'uint64' },
        { type: 'uint256' },
        { type: 'int8' },
        { type: 'uint64' },
      ],
      [DEMO.payment.amountWei, DEMO.payment.priceUsdCents, DEMO.feedValue, DEMO.feedDecimals, DEMO.feedTimestamp],
    ),
    logIndex: '0x0',
    removed: false,
    topics: [
      TOPICS.payment,
      `0x${DEMO.payment.linkId.slice(2)}`,
      `0x${DEMO.merchant.slice(2).padStart(64, '0')}`,
      `0x${DEMO.payer.slice(2).padStart(64, '0')}`,
    ],
    transactionHash: `0x${'8'.repeat(64)}`,
    transactionIndex: '0x0',
  };
}

function parseHexBlock(value, fallback) {
  if (!value) return fallback;
  try {
    return BigInt(value);
  } catch {
    return fallback;
  }
}

function installDemoRpc(page) {
  return page.route('**/ext/C/rpc', async (route) => {
    const request = route.request();
    let payload;

    try {
      payload = JSON.parse(request.postData() || '{}');
    } catch {
      await route.continue();
      return;
    }

    const responses = (Array.isArray(payload) ? payload : [payload]).map((item) => {
      const method = item?.method;
      const id = item?.id ?? 1;

      if (!method) {
        return { jsonrpc: '2.0', id, error: { code: -32600, message: 'Invalid request' } };
      }

      if (method === 'eth_chainId') {
        return { jsonrpc: '2.0', id, result: CHAIN_HEX };
      }

      if (method === 'eth_blockNumber') {
        return { jsonrpc: '2.0', id, result: toHex(DEMO.blockNumber + 6n) };
      }

      if (method === 'eth_getBalance') {
        return { jsonrpc: '2.0', id, result: MOCK_BALANCE };
      }

      if (method === 'eth_call') {
        const data = String(item?.params?.[0]?.data || '').toLowerCase();
        const selector = data.slice(0, 10);

        if (selector === SELECTORS.flrUsdFeed) {
          return { jsonrpc: '2.0', id, result: makeFeedResult() };
        }

        if (selector === SELECTORS.quote) {
          return { jsonrpc: '2.0', id, result: makeQuoteResult() };
        }

        if (selector === SELECTORS.getPaymentLink) {
          return { jsonrpc: '2.0', id, result: makeLinkResult(DEMO.created[0]) };
        }

        if (selector === SELECTORS.getPaymentLinkById) {
          const linkId = `0x${data.slice(10, 74)}`;
          const link = DEMO.created.find((item) => item.linkId.toLowerCase() === linkId.toLowerCase()) || DEMO.created[0];
          return { jsonrpc: '2.0', id, result: makeLinkResult(link) };
        }

        return { jsonrpc: '2.0', id, error: { code: -32601, message: `Unsupported eth_call selector: ${selector}` } };
      }

      if (method === 'eth_getLogs') {
        const filter = item?.params?.[0] || {};
        const from = parseHexBlock(filter.fromBlock, DEMO.blockNumber - 20n);
        const to = parseHexBlock(filter.toBlock, DEMO.blockNumber + 20n);
        const topic0 = String(filter.topics?.[0] || '').toLowerCase();

        const createdLogs = DEMO.created
          .map((link, index) => makeCreatedLog(link, index))
          .filter((log) => {
            const block = BigInt(log.blockNumber);
            return block >= from && block <= to;
          });

        const paymentLog = makePaymentLog();
        const paymentLogs = BigInt(paymentLog.blockNumber) >= from && BigInt(paymentLog.blockNumber) <= to ? [paymentLog] : [];

        if (topic0 === TOPICS.created.toLowerCase()) {
          return { jsonrpc: '2.0', id, result: createdLogs };
        }

        if (topic0 === TOPICS.payment.toLowerCase()) {
          return { jsonrpc: '2.0', id, result: paymentLogs };
        }

        return { jsonrpc: '2.0', id, result: [] };
      }

      return { jsonrpc: '2.0', id, error: { code: -32601, message: `Unsupported RPC method: ${method}` } };
    });

    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(Array.isArray(payload) ? responses : responses[0]),
    });
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function pillHtml(items = []) {
  return items
    .map((item) => `<span class="pill">${escapeHtml(item)}</span>`)
    .join('');
}

function sceneMarkup(scene, imageData = '') {
  if (scene.kind === 'title') {
    return `
      <section class="scene title-scene" data-start="${scene.start}" data-end="${scene.end}">
        <div class="title-card">
          <div class="eyebrow">Flare Summer Signal / Coston2</div>
          <div class="wordmark">
            <svg viewBox="0 0 48 48" aria-hidden="true" class="logo-mark" fill="none">
              <rect x="4.5" y="4.5" width="39" height="39" rx="12.5" stroke="#a9e1fb" stroke-opacity="0.2" />
              <path d="M17 13.5h7.2c3.7 0 6.3 2.2 6.3 5.5s-2.6 5.5-6.3 5.5H17v-11Z" stroke="#e8f3f8" stroke-opacity="0.95" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
              <path d="M17 13.5v21" stroke="#e8f3f8" stroke-opacity="0.95" stroke-width="2.4" stroke-linecap="round" />
              <path d="M24.4 24.5 32.7 34" stroke="#a9e1fb" stroke-width="2.4" stroke-linecap="round" />
              <path d="M24.4 24.5 36.2 34" stroke="#a9e1fb" stroke-width="2.4" stroke-linecap="round" />
              <circle cx="24.3" cy="24.4" r="1.9" fill="#a9e1fb" />
            </svg>
            <span>RailSplit</span>
          </div>
          <h1>Price in dollars.<br />Get paid in FLR.</h1>
          <p>Dollar-priced payment links on Flare, built to stay readable, live, and non-custodial.</p>
          <div class="pill-row">
            <span class="pill">USD pricing</span>
            <span class="pill">FTSOv2 oracle</span>
            <span class="pill">Wallet connect</span>
            <span class="pill">Testnet only</span>
          </div>
        </div>
      </section>`;
  }

  if (scene.kind === 'outro') {
    return `
      <section class="scene outro-scene" data-start="${scene.start}" data-end="${scene.end}">
        <div class="title-card outro-card">
          <div class="eyebrow">Final frame</div>
          <div class="wordmark">
            <svg viewBox="0 0 48 48" aria-hidden="true" class="logo-mark" fill="none">
              <rect x="4.5" y="4.5" width="39" height="39" rx="12.5" stroke="#a9e1fb" stroke-opacity="0.2" />
              <path d="M17 13.5h7.2c3.7 0 6.3 2.2 6.3 5.5s-2.6 5.5-6.3 5.5H17v-11Z" stroke="#e8f3f8" stroke-opacity="0.95" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
              <path d="M17 13.5v21" stroke="#e8f3f8" stroke-opacity="0.95" stroke-width="2.4" stroke-linecap="round" />
              <path d="M24.4 24.5 32.7 34" stroke="#a9e1fb" stroke-width="2.4" stroke-linecap="round" />
              <path d="M24.4 24.5 36.2 34" stroke="#a9e1fb" stroke-width="2.4" stroke-linecap="round" />
              <circle cx="24.3" cy="24.4" r="1.9" fill="#a9e1fb" />
            </svg>
            <span>RailSplit</span>
          </div>
          <h1>Dollar-priced payment links<br />on Flare.</h1>
          <p>Built for Coston2. Testnet only. Non-custodial. Every payment stays visible onchain.</p>
          <div class="pill-row">
            <span class="pill">Merchant ops</span>
            <span class="pill">Live checkout</span>
            <span class="pill">Settlement feed</span>
          </div>
        </div>
      </section>`;
  }

  const screenshotClass = scene.layout === 'full' ? 'shot-frame shot-full' : scene.layout === 'split-left' ? 'shot-frame shot-left' : 'shot-frame shot-right';
  const copyClass = scene.layout === 'full' ? 'copy-card copy-overlay' : scene.layout === 'split-left' ? 'copy-card copy-right' : 'copy-card copy-left';

  return `
    <section class="scene ${scene.layout}" data-start="${scene.start}" data-end="${scene.end}" data-focus="${escapeHtml(scene.focus)}">
      <div class="shot-wrap" style="order: ${scene.layout === 'split-left' ? 1 : 2}">
        <div class="${screenshotClass}">
          <img src="${imageData}" alt="${escapeHtml(scene.title)}" />
        </div>
      </div>
      <div class="${copyClass}" style="order: ${scene.layout === 'split-left' ? 2 : 1}">
        <div class="eyebrow">${escapeHtml(scene.eyebrow)}</div>
        <h2>${escapeHtml(scene.title)}</h2>
        <p>${escapeHtml(scene.body)}</p>
        <div class="pill-row">${pillHtml(scene.pills)}</div>
      </div>
    </section>`;
}

function buildHtml(imageMap) {
  const sceneData = [
    shots.title,
    shots.home,
    shots.createOff,
    shots.createOn,
    shots.dashboardTop,
    shots.dashboardFeed,
    shots.checkoutOff,
    shots.checkoutOn,
    shots.outro,
  ];

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Syne:wght@500;600;700&family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #071017;
      --bg-deep: #03080c;
      --surface: #0b1821;
      --surface-2: #102330;
      --line: #1c3849;
      --text: #e8f3f8;
      --muted: rgba(232, 243, 248, 0.68);
      --faint: rgba(232, 243, 248, 0.46);
      --accent: #a9e1fb;
      --shadow: rgba(0, 0, 0, 0.36);
      --radius: 26px;
    }

    * { box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      margin: 0;
      overflow: hidden;
      background: var(--bg-deep);
      color: var(--text);
      font-family: 'Space Grotesk', system-ui, sans-serif;
    }

    body::before,
    body::after {
      content: '';
      position: fixed;
      inset: 0;
      pointer-events: none;
    }

    body::before {
      background:
        radial-gradient(circle at 20% 20%, rgba(169, 225, 251, 0.12), transparent 30%),
        radial-gradient(circle at 80% 0%, rgba(169, 225, 251, 0.06), transparent 24%),
        linear-gradient(180deg, rgba(11, 24, 33, 0.94), rgba(3, 8, 12, 0.98));
    }

    body::after {
      opacity: 0.12;
      background-image:
        linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px);
      background-size: 64px 64px;
      mix-blend-mode: screen;
    }

    #stage {
      position: relative;
      width: 1920px;
      height: 1080px;
      margin: 0 auto;
      overflow: hidden;
    }

    .rail {
      position: absolute;
      left: 58px;
      right: 58px;
      top: 42px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 30;
      pointer-events: none;
      font-size: 12px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--faint);
    }

    .rail .brand {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      color: var(--text);
      font-family: 'Syne', system-ui, sans-serif;
      font-size: 18px;
      letter-spacing: -0.03em;
      text-transform: none;
    }

    .rail .mini-mark {
      width: 34px;
      height: 34px;
      flex: 0 0 auto;
    }

    .scene {
      position: absolute;
      inset: 0;
      display: grid;
      opacity: 0;
      transform: translateY(10px) scale(0.992);
      transition: opacity 300ms linear, transform 300ms linear;
      will-change: opacity, transform;
    }

    .scene.active {
      opacity: 1;
      transform: translateY(0) scale(1);
    }

    .title-scene,
    .outro-scene {
      place-items: center;
      padding: 140px 120px 120px;
    }

    .title-card {
      width: min(1120px, 100%);
      display: grid;
      gap: 26px;
      padding: 46px 48px 42px;
      border: 1px solid rgba(169, 225, 251, 0.16);
      border-radius: 36px;
      background: linear-gradient(180deg, rgba(11, 24, 33, 0.88), rgba(3, 8, 12, 0.74));
      box-shadow: 0 32px 90px var(--shadow), inset 0 1px 0 rgba(255,255,255,0.05);
      backdrop-filter: blur(8px);
    }

    .eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      color: var(--accent);
      font-size: 12px;
      line-height: 1;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      font-weight: 700;
    }

    .eyebrow::before {
      content: '';
      width: 24px;
      height: 1px;
      background: linear-gradient(90deg, rgba(169,225,251,0), rgba(169,225,251,1));
    }

    .wordmark {
      display: inline-flex;
      align-items: center;
      gap: 16px;
      font-family: 'Syne', system-ui, sans-serif;
      font-weight: 700;
      letter-spacing: -0.05em;
      font-size: 42px;
      line-height: 1;
    }

    .logo-mark { width: 44px; height: 44px; }

    .title-card h1 {
      margin: 0;
      max-width: 780px;
      font-family: 'Syne', system-ui, sans-serif;
      font-size: clamp(68px, 5.8vw, 104px);
      line-height: 0.93;
      letter-spacing: -0.06em;
      font-weight: 700;
    }

    .title-card p {
      margin: 0;
      max-width: 700px;
      font-size: 22px;
      line-height: 1.55;
      color: var(--muted);
    }

    .pill-row {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
    }

    .pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 34px;
      padding: 0 14px;
      border: 1px solid rgba(169, 225, 251, 0.18);
      background: rgba(16, 35, 48, 0.66);
      color: rgba(232, 243, 248, 0.88);
      border-radius: 999px;
      font-size: 12px;
      line-height: 1;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      font-weight: 700;
      backdrop-filter: blur(8px);
    }

    .copy-card {
      display: grid;
      align-content: center;
      gap: 20px;
      max-width: 640px;
      padding: 34px 36px;
      border: 1px solid rgba(169, 225, 251, 0.14);
      border-radius: 30px;
      background: linear-gradient(180deg, rgba(11, 24, 33, 0.88), rgba(3, 8, 12, 0.70));
      box-shadow: 0 28px 80px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.05);
      backdrop-filter: blur(8px);
      z-index: 3;
    }

    .copy-card h2 {
      margin: 0;
      font-family: 'Syne', system-ui, sans-serif;
      font-size: clamp(42px, 3.2vw, 62px);
      line-height: 0.97;
      letter-spacing: -0.055em;
      font-weight: 700;
      max-width: 560px;
    }

    .copy-card p {
      margin: 0;
      font-size: 19px;
      line-height: 1.55;
      color: var(--muted);
      max-width: 560px;
    }

    .copy-left { margin-left: 88px; }
    .copy-right { margin-right: 88px; }
    .copy-overlay { margin: 0 0 0 88px; align-self: center; }

    .split-left,
    .split-right,
    .full {
      grid-template-columns: 1fr 1fr;
      align-items: center;
      gap: 48px;
      padding: 140px 110px 100px;
    }

    .split-left .shot-wrap,
    .split-right .shot-wrap,
    .full .shot-wrap {
      position: relative;
      min-height: 760px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .split-left .shot-wrap { justify-content: flex-end; }
    .split-right .shot-wrap { justify-content: flex-start; }

    .shot-frame {
      position: relative;
      width: min(790px, 100%);
      height: min(760px, 100%);
      overflow: hidden;
      border-radius: 30px;
      border: 1px solid rgba(169, 225, 251, 0.16);
      background: rgba(11, 24, 33, 0.78);
      box-shadow: 0 40px 110px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.05);
    }

    .shot-frame::before {
      content: '';
      position: absolute;
      inset: 0;
      z-index: 2;
      background: linear-gradient(180deg, rgba(7,16,23,0.05), rgba(7,16,23,0.24));
      pointer-events: none;
    }

    .shot-frame img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center top;
      transform: scale(calc(var(--zoom, 1.05)));
      transition: transform 80ms linear;
      display: block;
    }

    .shot-left { margin-left: 38px; }
    .shot-right { margin-right: 38px; }
    .shot-full { width: 100%; height: 100%; }

    .scene.full .copy-card {
      position: absolute;
      right: 110px;
      bottom: 104px;
      max-width: 540px;
    }

    .scene.full .shot-wrap {
      grid-column: 1 / -1;
      min-height: 100%;
    }

    .scene.full .shot-frame {
      width: 100%;
      height: 100%;
      border-radius: 38px;
    }

    .scene.full .copy-card {
      margin-left: 0;
    }

    .scene.full .copy-card p,
    .scene.full .copy-card h2 {
      max-width: 480px;
    }

    .scene.full::after {
      content: '';
      position: absolute;
      inset: 0;
      background:
        linear-gradient(90deg, rgba(3,8,12,0.72) 0%, rgba(3,8,12,0.28) 52%, rgba(3,8,12,0.42) 100%),
        linear-gradient(180deg, rgba(3,8,12,0.06), rgba(3,8,12,0.42));
      pointer-events: none;
    }

    .scene.full .shot-wrap,
    .scene.full .copy-card { z-index: 3; }

    .title-scene .title-card,
    .outro-scene .title-card { z-index: 2; }

    .outro-card {
      text-align: left;
      width: min(1040px, 100%);
    }

    .outro-card p { max-width: 660px; }

    @media (max-width: 1400px) {
      #stage { transform: scale(0.78); transform-origin: top center; width: 1920px; height: 1080px; }
    }
  </style>
</head>
<body>
  <div id="stage">
    <div class="rail">
      <div class="brand">
        <svg viewBox="0 0 48 48" aria-hidden="true" class="mini-mark" fill="none">
          <rect x="4.5" y="4.5" width="39" height="39" rx="12.5" stroke="#a9e1fb" stroke-opacity="0.2" />
          <path d="M17 13.5h7.2c3.7 0 6.3 2.2 6.3 5.5s-2.6 5.5-6.3 5.5H17v-11Z" stroke="#e8f3f8" stroke-opacity="0.95" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M17 13.5v21" stroke="#e8f3f8" stroke-opacity="0.95" stroke-width="2.4" stroke-linecap="round" />
          <path d="M24.4 24.5 32.7 34" stroke="#a9e1fb" stroke-width="2.4" stroke-linecap="round" />
          <path d="M24.4 24.5 36.2 34" stroke="#a9e1fb" stroke-width="2.4" stroke-linecap="round" />
          <circle cx="24.3" cy="24.4" r="1.9" fill="#a9e1fb" />
        </svg>
        RailSplit
      </div>
      <div>16:9 demo cut · screenshot-led</div>
    </div>
    ${sceneData
      .map((scene) => sceneMarkup(scene, imageMap[scene.image] || ''))
      .join('\n')}
  </div>

  <script>
    const scenes = ${JSON.stringify(sceneData)};
    const stage = document.getElementById('stage');
    const sceneEls = Array.from(document.querySelectorAll('.scene'));
    const startAt = performance.now() + 450;
    const fade = 0.65;
    const total = ${RENDER_SECONDS};

    function clamp(value, min, max) {
      return Math.min(max, Math.max(min, value));
    }

    function smooth(t) {
      const x = clamp(t, 0, 1);
      return x * x * (3 - 2 * x);
    }

    function sceneAlpha(t, start, end) {
      const inPhase = smooth((t - start) / fade);
      const outPhase = smooth((end - t) / fade);
      return clamp(inPhase * outPhase, 0, 1);
    }

    function tick() {
      const now = (performance.now() - startAt) / 1000;
      const t = Math.max(0, now);

      for (const sceneEl of sceneEls) {
        const start = Number(sceneEl.dataset.start);
        const end = Number(sceneEl.dataset.end);
        const alpha = sceneAlpha(t, start, end);
        const active = alpha > 0.004;
        sceneEl.classList.toggle('active', active);
        sceneEl.style.opacity = alpha.toFixed(4);
        sceneEl.style.transform = 'translateY(' + (1 - alpha) * 10 + 'px) scale(' + (0.992 + alpha * 0.008) + ')';

        const img = sceneEl.querySelector('img');
        if (img) {
          const local = clamp((t - start) / Math.max(0.001, end - start), 0, 1);
          const zoom = 1.04 + smooth(local) * 0.06;
          img.style.setProperty('--zoom', zoom.toFixed(4));

          const focus = sceneEl.dataset.focus || 'center top';
          img.style.objectPosition = focus;
        }
      }

      if (t < total + 1.5) {
        requestAnimationFrame(tick);
      }
    }

    requestAnimationFrame(tick);
  </script>
</body>
</html>`;
}

async function captureShot(browser, { name, url, walletMode = 'none', scrollY = 0, settleMs = 900 }) {
  const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  await page.emulateMedia({ colorScheme: 'dark' });
  await installDemoRpc(page);

  if (walletMode !== 'none') {
    await page.addInitScript(mockWalletInit, { address: MOCK_ADDRESS, chainId: CHAIN_HEX });
  }

  await page.goto(url, { waitUntil: 'networkidle' });

  if (scrollY) {
    await page.evaluate((y) => window.scrollTo(0, y), scrollY);
    await page.waitForTimeout(400);
  }

  if (walletMode === 'connected') {
    const connectButton = page.getByRole('button', { name: /connect wallet/i }).first();
    if (await connectButton.isVisible().catch(() => false)) {
      await connectButton.click();
      await page.waitForTimeout(250);
    }
  }

  await page.waitForTimeout(settleMs);

  await page.screenshot({
    path: path.join(OUT, `${name}.jpg`),
    type: 'jpeg',
    quality: 92,
    fullPage: true,
  });

  await page.close();
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function main() {
  await ensureDir(OUT);

  const browser = await chromium.launch({ headless: true });

  await captureShot(browser, {
    name: 'home',
    url: APP,
  });

  await captureShot(browser, {
    name: 'create-off',
    url: `${APP}/dashboard/links/new`,
    walletMode: 'injected',
  });

  await captureShot(browser, {
    name: 'create-on',
    url: `${APP}/dashboard/links/new`,
    walletMode: 'connected',
  });

  await captureShot(browser, {
    name: 'dashboard-top',
    url: `${APP}/dashboard`,
    walletMode: 'connected',
  });

  await captureShot(browser, {
    name: 'dashboard-feed',
    url: `${APP}/dashboard`,
    walletMode: 'connected',
    scrollY: 760,
  });

  await captureShot(browser, {
    name: 'checkout-off',
    url: `${APP}/pay/arcade-run-001`,
    walletMode: 'injected',
  });

  await captureShot(browser, {
    name: 'checkout-on',
    url: `${APP}/pay/arcade-run-001`,
    walletMode: 'connected',
  });

  await browser.close();

  const imageMap = {};
  for (const file of ['home.jpg', 'create-off.jpg', 'create-on.jpg', 'dashboard-top.jpg', 'dashboard-feed.jpg', 'checkout-off.jpg', 'checkout-on.jpg']) {
    const buffer = await fs.readFile(path.join(OUT, file));
    imageMap[file] = `data:image/jpeg;base64,${buffer.toString('base64')}`;
  }

  const html = buildHtml(imageMap);
  const storyboardPath = path.join(OUT, 'storyboard.html');
  await fs.writeFile(storyboardPath, html, 'utf8');

  const renderBrowser = await chromium.launch({ headless: true });
  const context = await renderBrowser.newContext({
    viewport: STAGE,
    deviceScaleFactor: 1,
    recordVideo: { dir: OUT, size: STAGE },
  });
  const page = await context.newPage();
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout((RENDER_SECONDS + 1) * 1000);

  const video = page.video();
  await page.close();
  await context.close();
  await renderBrowser.close();

  const webmPath = await video.path();
  const webmOut = path.join(OUT, 'railsplit-demo.webm');
  const mp4Out = path.join(OUT, 'railsplit-demo.mp4');
  await fs.copyFile(webmPath, webmOut);

  await execFileAsync('ffmpeg', [
    '-y',
    '-i',
    webmOut,
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    mp4Out,
  ]);

  console.log(`Rendered ${mp4Out}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
