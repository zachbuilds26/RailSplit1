import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { encodeAbiParameters, encodeFunctionData, parseAbi, toHex } from 'viem';

const execFileAsync = promisify(execFile);

const ROOT = 'C:/Users/Emmanuel/Desktop/railsplit';
const OUT = path.join(ROOT, 'video-output');
const APP = process.env.APP_URL || 'http://localhost:3000';
const VIEWPORT = { width: 1920, height: 1080 };
const STAGE = { width: 1920, height: 1080 };
const MOCK_ADDRESS = '0x9b4a2e7d1c3f5a6b8d0e1f2a3c4d5e6f7a8b9c0d';
const CHAIN_HEX = '0x72';
const RENDER_SECONDS = 58;

const NOW = Math.floor(Date.now() / 1000);

const DEMO_ABI = parseAbi([
  'function flrUsdFeed() view returns (uint256 value, int8 decimals, uint64 timestamp)',
  'function getPaymentLink(string slug) view returns ((address merchant,uint64 priceUsdCents,uint64 createdAt,uint64 expiresAt,bool active,uint32 paymentCount,uint256 totalReceivedWei,uint64 totalReceivedUsdCents,string title,string slug))',
  'function getPaymentLinkById(bytes32 linkId) view returns ((address merchant,uint64 priceUsdCents,uint64 createdAt,uint64 expiresAt,bool active,uint32 paymentCount,uint256 totalReceivedWei,uint64 totalReceivedUsdCents,string title,string slug))',
  'function quote(string slug) view returns (uint256 requiredWei, uint256 flrUsdPrice, int8 flrUsdDecimals, uint64 feedTimestamp)',
  'function merchantLinkCount(address merchant) view returns (uint256)',
  'function merchantLinkIdAt(address merchant, uint256 index) view returns (bytes32)',
  'function linkCount() view returns (uint256)',
  'function paymentCount() view returns (uint256)',
  'function getPayments(uint256 offset, uint256 limit) view returns ((bytes32 linkId,address payer,uint256 amountWei,uint64 priceUsdCents,uint64 paidAt,uint256 flrUsdPrice,int8 flrUsdDecimals)[] page, string[] slugs, uint256 total)',
]);

const FEED_VALUE = 6_330_000_000_000_000n;
const FEED_DECIMALS = 18;
const FEED_TS = NOW - 90;

const LINKS = {
  arcade: {
    linkId: '0x1111111111111111111111111111111111111111111111111111111111111111',
    slug: 'arcade-run-001',
    title: 'Arcade Run 001',
    priceUsdCents: 25n,
    createdAt: NOW - 5 * 86400,
    expiresAt: 0n,
    active: false,
    paymentCount: 1n,
    totalReceivedWei: 39_400_000_000_000_000_000n,
    totalReceivedUsdCents: 25n,
  },
  studio: {
    linkId: '0x2222222222222222222222222222222222222222222222222222222222222222',
    slug: 'studio-intake-014',
    title: 'Studio Intake 014',
    priceUsdCents: 125n,
    createdAt: NOW - 2 * 86400,
    expiresAt: 0n,
    active: true,
    paymentCount: 0n,
    totalReceivedWei: 0n,
    totalReceivedUsdCents: 0n,
  },
};

const PAYMENT = {
  linkId: LINKS.arcade.linkId,
  payer: MOCK_ADDRESS,
  amountWei: 39_400_000_000_000_000_000n,
  priceUsdCents: 25n,
  paidAt: NOW - 3600,
  flrUsdPrice: FEED_VALUE,
  flrUsdDecimals: FEED_DECIMALS,
};

const LINK_TUPLE = [
  { type: 'address' },
  { type: 'uint64' },
  { type: 'uint64' },
  { type: 'uint64' },
  { type: 'bool' },
  { type: 'uint32' },
  { type: 'uint256' },
  { type: 'uint64' },
  { type: 'string' },
  { type: 'string' },
];

const PAYMENT_TUPLE = [
  { type: 'bytes32' },
  { type: 'address' },
  { type: 'uint256' },
  { type: 'uint64' },
  { type: 'uint64' },
  { type: 'uint256' },
  { type: 'int8' },
];

const SELECTORS = {
  flrUsdFeed: encodeFunctionData({ abi: DEMO_ABI, functionName: 'flrUsdFeed' }).slice(0, 10),
  getPaymentLink: encodeFunctionData({ abi: DEMO_ABI, functionName: 'getPaymentLink', args: ['x'] }).slice(0, 10),
  getPaymentLinkById: encodeFunctionData({ abi: DEMO_ABI, functionName: 'getPaymentLinkById', args: [LINKS.arcade.linkId] }).slice(0, 10),
  quote: encodeFunctionData({ abi: DEMO_ABI, functionName: 'quote', args: ['x'] }).slice(0, 10),
  merchantLinkCount: encodeFunctionData({ abi: DEMO_ABI, functionName: 'merchantLinkCount', args: [MOCK_ADDRESS] }).slice(0, 10),
  merchantLinkIdAt: encodeFunctionData({ abi: DEMO_ABI, functionName: 'merchantLinkIdAt', args: [MOCK_ADDRESS, 0n] }).slice(0, 10),
  linkCount: encodeFunctionData({ abi: DEMO_ABI, functionName: 'linkCount' }).slice(0, 10),
  paymentCount: encodeFunctionData({ abi: DEMO_ABI, functionName: 'paymentCount' }).slice(0, 10),
  getPayments: encodeFunctionData({ abi: DEMO_ABI, functionName: 'getPayments', args: [0n, 1n] }).slice(0, 10),
};

function linkTuple(link) {
  return [
    link.merchant ?? MOCK_ADDRESS,
    link.priceUsdCents,
    link.createdAt,
    link.expiresAt,
    link.active,
    Number(link.paymentCount),
    link.totalReceivedWei,
    link.totalReceivedUsdCents,
    link.title,
    link.slug,
  ];
}

function decodeSlug(calldata) {
  const hex = calldata.slice(2);
  const offset = parseInt(hex.slice(8, 72), 16);
  const lenPos = 8 + offset * 2;
  const length = parseInt(hex.slice(lenPos, lenPos + 64), 16);
  const raw = hex.slice(lenPos + 64, lenPos + 64 + length * 2);
  return Buffer.from(raw, 'hex').toString('utf8');
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
        return { jsonrpc: '2.0', id, result: toHex(33_480_000n) };
      }

      if (method === 'eth_getBalance') {
        return { jsonrpc: '2.0', id, result: '0x' + (500n * 10n ** 18n).toString(16) };
      }

      if (method === 'eth_call') {
        const data = String(item?.params?.[0]?.data || '').toLowerCase();
        const selector = data.slice(0, 10);

        if (selector === SELECTORS.flrUsdFeed) {
          return { jsonrpc: '2.0', id, result: encodeAbiParameters([{ type: 'uint256' }, { type: 'int8' }, { type: 'uint64' }], [FEED_VALUE, FEED_DECIMALS, FEED_TS]) };
        }

        if (selector === SELECTORS.quote) {
          const slug = decodeSlug(data);
          const link = slug === LINKS.arcade.slug ? LINKS.arcade : LINKS.studio;
          const requiredWei = (BigInt(link.priceUsdCents) * 10n ** 16n * 10n ** 18n) / FEED_VALUE;
          return { jsonrpc: '2.0', id, result: encodeAbiParameters([{ type: 'uint256' }, { type: 'uint256' }, { type: 'int8' }, { type: 'uint64' }], [requiredWei, FEED_VALUE, FEED_DECIMALS, FEED_TS]) };
        }

        if (selector === SELECTORS.getPaymentLink) {
          const slug = decodeSlug(data);
          const link = slug === LINKS.arcade.slug ? LINKS.arcade : LINKS.studio;
          return { jsonrpc: '2.0', id, result: encodeAbiParameters([{ type: 'tuple', components: LINK_TUPLE }], [linkTuple(link)]) };
        }

        if (selector === SELECTORS.getPaymentLinkById) {
          const linkId = '0x' + data.slice(10, 74);
          const link = linkId === LINKS.studio.linkId.toLowerCase() ? LINKS.studio : LINKS.arcade;
          return { jsonrpc: '2.0', id, result: encodeAbiParameters([{ type: 'tuple', components: LINK_TUPLE }], [linkTuple(link)]) };
        }

        if (selector === SELECTORS.merchantLinkCount) {
          return { jsonrpc: '2.0', id, result: encodeAbiParameters([{ type: 'uint256' }], [2n]) };
        }

        if (selector === SELECTORS.merchantLinkIdAt) {
          const index = BigInt('0x' + data.slice(74, 138));
          const link = index === 0n ? LINKS.studio : LINKS.arcade;
          return { jsonrpc: '2.0', id, result: encodeAbiParameters([{ type: 'bytes32' }], [link.linkId]) };
        }

        if (selector === SELECTORS.linkCount) {
          return { jsonrpc: '2.0', id, result: encodeAbiParameters([{ type: 'uint256' }], [2n]) };
        }

        if (selector === SELECTORS.paymentCount) {
          return { jsonrpc: '2.0', id, result: encodeAbiParameters([{ type: 'uint256' }], [1n]) };
        }

        if (selector === SELECTORS.getPayments) {
          return {
            jsonrpc: '2.0',
            id,
            result: encodeAbiParameters(
              [{ type: 'tuple[]', components: PAYMENT_TUPLE }, { type: 'string[]' }, { type: 'uint256' }],
              [[[PAYMENT.linkId, PAYMENT.payer, PAYMENT.amountWei, PAYMENT.priceUsdCents, PAYMENT.paidAt, PAYMENT.flrUsdPrice, PAYMENT.flrUsdDecimals]], [LINKS.arcade.slug], 1n],
            ),
          };
        }

        return { jsonrpc: '2.0', id, error: { code: -32601, message: `Unsupported eth_call selector: ${selector}` } };
      }

      return { jsonrpc: '2.0', id, error: { code: -32601, message: `Unsupported RPC method: ${method}` } };
    });

    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(Array.isArray(payload) ? responses : responses[0]),
    });
  });
}

const mockWalletInit = ({ address, chainId }) => {
  const listeners = new Map();
  const emit = (event, payload) => {
    for (const fn of listeners.get(event) || []) fn(payload);
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
        case 'wallet_switchEthereumChain':
        case 'wallet_addEthereumChain':
          return null;
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
      listeners.set(event, (listeners.get(event) || []).filter((item) => item !== fn));
    },
  };

  Object.defineProperty(window, 'ethereum', { configurable: true, value: provider });
};

async function captureShot(browser, { name, url, walletMode = 'none', scrollY = 0, settleMs = 900 }) {
  const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  await page.emulateMedia({ colorScheme: 'dark' });
  await installDemoRpc(page);

  if (walletMode !== 'none') {
    await page.addInitScript(mockWalletInit, { address: MOCK_ADDRESS, chainId: CHAIN_HEX });
  }

  await page.goto(url, { waitUntil: 'networkidle' });

  if (walletMode === 'connected') {
    const connectButton = page.getByRole('button', { name: /connect wallet/i }).first();
    if (await connectButton.isVisible().catch(() => false)) {
      await connectButton.click();
      await page.waitForTimeout(500);
    }
  }

  if (scrollY) {
    await page.evaluate((y) => window.scrollTo(0, y), scrollY);
    await page.waitForTimeout(500);
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

const esc = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const pillHtml = (items = []) =>
  items.map((item) => `<span class="pill">${esc(item)}</span>`).join('');

const MARK = `<svg viewBox="0 0 48 48" aria-hidden="true" class="mark" fill="none">
  <rect x="4.5" y="4.5" width="39" height="39" rx="13" stroke="#a9e1fb" stroke-opacity="0.28"/>
  <path d="M17 13.5h7.2c3.7 0 6.3 2.2 6.3 5.5s-2.6 5.5-6.3 5.5H17v-11Z" stroke="#eef6fb" stroke-opacity="0.95" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M17 13.5v21" stroke="#eef6fb" stroke-opacity="0.95" stroke-width="2.4" stroke-linecap="round"/>
  <path d="M24.4 24.5 32.7 34" stroke="#a9e1fb" stroke-width="2.4" stroke-linecap="round"/>
  <path d="M24.4 24.5 36.2 34" stroke="#a9e1fb" stroke-width="2.4" stroke-linecap="round"/>
  <circle cx="24.3" cy="24.4" r="1.9" fill="#a9e1fb"/>
</svg>`;

const scenes = [
  {
    kind: 'title',
    start: 0,
    end: 6.5,
    kicker: 'Flare testnet · Coston2',
    lines: ['Price in dollars.', 'Get paid in FLR.'],
    sub: 'Dollar-priced payment links on Flare. The FTSOv2 rate is set live at confirmation, and funds settle straight to the merchant.',
    pills: ['USD pricing', 'FTSOv2 oracle', 'Wallet connect', 'Testnet only'],
  },
  {
    kind: 'shot',
    layout: 'split-right',
    start: 6.5,
    end: 14,
    image: 'home.jpg',
    focus: 'center 18%',
    eyebrow: 'The product',
    title: 'One link. Clear pricing. Direct settlement.',
    body: 'Merchants price in dollars. Customers pay in FLR at the live rate. No custody step in between.',
    pills: ['USD pricing', 'Live rate', 'Non-custodial'],
  },
  {
    kind: 'shot',
    layout: 'split-left',
    start: 14,
    end: 21.5,
    image: 'create.jpg',
    focus: 'center 12%',
    eyebrow: 'Publish flow',
    title: 'Set a dollar price. Publish onchain.',
    body: 'One wallet signature turns a form into a payment link that is ready to share.',
    pills: ['Wallet connect', 'One URL', 'Onchain'],
  },
  {
    kind: 'shot',
    layout: 'full',
    start: 21.5,
    end: 29,
    image: 'dashboard.jpg',
    focus: 'center 20%',
    eyebrow: 'Merchant ops',
    title: 'Totals, links, and the live oracle — in one view.',
    body: 'The dashboard reads the chain, keeps every number current, and makes the business readable at a glance.',
    pills: ['Active links', 'Collected value', 'Live oracle'],
  },
  {
    kind: 'shot',
    layout: 'full',
    start: 29,
    end: 36.5,
    image: 'ledger.jpg',
    focus: 'center 72%',
    eyebrow: 'Onchain ledger',
    title: 'Every payment lands in a clean, readable ledger.',
    body: 'Settlement history stays tied to the exact link, payer, and transaction.',
    pills: ['Settlement', 'Readable history', 'Tx links'],
  },
  {
    kind: 'shot',
    layout: 'split-right',
    start: 36.5,
    end: 44,
    image: 'checkout.jpg',
    focus: 'center 12%',
    eyebrow: 'Customer checkout',
    title: 'Customers see the live quote. They pay in FLR.',
    body: 'Connect a wallet, check the amount in your coin, and pay. The contract settles at the rate at confirmation.',
    pills: ['Live quote', 'Wallet ready', 'FTSOv2'],
  },
  {
    kind: 'shot',
    layout: 'split-left',
    start: 44,
    end: 51,
    image: 'settle.jpg',
    focus: 'center 70%',
    eyebrow: 'Settlement',
    title: 'Funds go straight to the merchant wallet.',
    body: 'The exact dollar value you asked for, converted at confirmation. Surplus returns to the customer.',
    pills: ['Direct payout', 'Exact value', 'Refund surplus'],
  },
  {
    kind: 'outro',
    start: 51,
    end: RENDER_SECONDS,
    lines: ['Dollar-priced payment links', 'on Flare.'],
    sub: 'Non-custodial. Live FTSOv2 rate. Testnet only on Coston2.',
    pills: ['Merchant ops', 'Live checkout', 'Settlement feed'],
  },
];

function sceneMarkup(scene, imageData = '') {
  if (scene.kind === 'title' || scene.kind === 'outro') {
    const lines = scene.lines
      .map(
        (line, index) =>
          `<span class="rv line ${scene.kind === 'title' && index === 1 ? 'accent-line' : ''}" data-rd="${(0.35 + index * 0.28).toFixed(2)}">${esc(line)}</span>`,
      )
      .join('<br/>');

    return `
      <section class="scene ${scene.kind}" data-start="${scene.start}" data-end="${scene.end}">
        <div class="center-card">
          ${scene.kind === 'outro' ? `<div class="rv wordmark" data-rd="0.2">${MARK}<span>RailSplit</span></div>` : ''}
          <div class="rv kicker" data-rd="0.15">${esc(scene.kicker)}</div>
          <h1>${lines}</h1>
          <p class="rv sub" data-rd="${(scene.lines.length * 0.28 + 0.55).toFixed(2)}">${esc(scene.sub)}</p>
          <div class="rv pill-row" data-rd="${(scene.lines.length * 0.28 + 0.8).toFixed(2)}">${pillHtml(scene.pills)}</div>
        </div>
      </section>`;
  }

  const split = scene.layout !== 'full';
  const copySide = scene.layout === 'split-left' ? 'right' : 'left';
  const copyClass = scene.layout === 'full' ? 'copy-card full-card' : `copy-card ${copySide === 'left' ? 'copy-left' : 'copy-right'}`;

  return `
    <section class="scene ${scene.layout}" data-start="${scene.start}" data-end="${scene.end}">
      <div class="screen-wrap" style="order: ${scene.layout === 'split-left' ? 2 : 1}">
        <div class="screen-frame" data-focus="${esc(scene.focus)}">
          <img src="${imageData}" alt="${esc(scene.title)}" />
        </div>
      </div>
      <div class="${copyClass}" style="order: ${scene.layout === 'split-left' ? 1 : 2}">
        <div class="rv kicker" data-rd="0.1">${esc(scene.eyebrow)}</div>
        <h2 class="rv" data-rd="0.3">${esc(scene.title)}</h2>
        <p class="rv" data-rd="0.62">${esc(scene.body)}</p>
        <div class="rv pill-row" data-rd="0.85">${pillHtml(scene.pills)}</div>
      </div>
    </section>`;
}

function buildHtml(imageMap) {
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
      --bg: #03070b;
      --ink: #eef6fb;
      --muted: rgba(238, 246, 251, 0.6);
      --faint: rgba(238, 246, 251, 0.38);
      --accent: #a9e1fb;
      --line: rgba(169, 225, 251, 0.16);
    }

    * { box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      margin: 0;
      overflow: hidden;
      background: #000;
      color: var(--ink);
      font-family: 'Space Grotesk', system-ui, sans-serif;
    }

    #stage {
      position: relative;
      width: 1920px;
      height: 1080px;
      margin: 0 auto;
      overflow: hidden;
      background:
        radial-gradient(1100px 700px at 18% 8%, rgba(169, 225, 251, 0.07), transparent 60%),
        radial-gradient(900px 620px at 85% 92%, rgba(169, 225, 251, 0.05), transparent 55%),
        var(--bg);
    }

    #stage::after {
      content: '';
      position: absolute;
      inset: 0;
      pointer-events: none;
      background:
        linear-gradient(rgba(255, 255, 255, 0.028) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.028) 1px, transparent 1px);
      background-size: 96px 96px;
      mask-image: radial-gradient(1200px 800px at 50% 38%, rgba(0, 0, 0, 0.9), transparent 78%);
      opacity: 0.55;
    }

    #curtain {
      position: absolute;
      inset: 0;
      background: #000;
      opacity: 0;
      z-index: 50;
      pointer-events: none;
    }

    .brand-hud {
      position: absolute;
      top: 34px;
      left: 44px;
      display: inline-flex;
      align-items: center;
      gap: 12px;
      z-index: 40;
      color: var(--faint);
      font-family: 'Syne', system-ui, sans-serif;
      font-size: 17px;
      letter-spacing: -0.02em;
      pointer-events: none;
    }

    .brand-hud .mark { width: 30px; height: 30px; }

    .scene {
      position: absolute;
      inset: 0;
      opacity: 0;
      will-change: opacity, transform;
    }

    .rv {
      opacity: 0;
      transform: translateY(30px);
      filter: blur(18px);
      will-change: opacity, transform, filter;
    }

    .title, .outro {
      display: grid;
      place-items: center;
      padding: 120px 140px;
    }

    .center-card {
      width: min(1200px, 100%);
      display: grid;
      gap: 30px;
      text-align: center;
      justify-items: center;
    }

    .kicker {
      display: inline-flex;
      align-items: center;
      gap: 14px;
      color: var(--accent);
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.24em;
      text-transform: uppercase;
    }

    .kicker::before, .kicker::after {
      content: '';
      width: 34px;
      height: 1px;
      background: linear-gradient(90deg, rgba(169, 225, 251, 0), rgba(169, 225, 251, 0.9));
    }

    .kicker::after { transform: scaleX(-1); }

    .title h1, .outro h1 {
      margin: 0;
      font-family: 'Syne', system-ui, sans-serif;
      font-weight: 700;
      font-size: 106px;
      line-height: 1.02;
      letter-spacing: -0.055em;
    }

    .title .line, .outro .line {
      display: inline-block;
    }

    .accent-line {
      background: linear-gradient(100deg, #eef6fb 20%, var(--accent) 80%);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }

    .sub {
      margin: 0;
      max-width: 680px;
      font-size: 21px;
      line-height: 1.6;
      color: var(--muted);
    }

    .pill-row {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      justify-content: center;
    }

    .pill {
      display: inline-flex;
      align-items: center;
      min-height: 38px;
      padding: 0 16px;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: rgba(13, 26, 37, 0.6);
      color: rgba(238, 246, 251, 0.85);
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .wordmark {
      display: inline-flex;
      align-items: center;
      gap: 16px;
      font-family: 'Syne', system-ui, sans-serif;
      font-weight: 700;
      font-size: 40px;
      letter-spacing: -0.05em;
    }

    .wordmark .mark { width: 42px; height: 42px; }

    .split-right, .split-left {
      display: grid;
      grid-template-columns: 1fr 1fr;
      align-items: center;
      gap: 40px;
      padding: 120px 100px;
    }

    .screen-wrap {
      position: relative;
      min-height: 720px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .split-right .screen-wrap { justify-content: flex-start; }
    .split-left .screen-wrap { justify-content: flex-end; }

    .screen-wrap::before {
      content: '';
      position: absolute;
      width: 68%;
      height: 62%;
      background: radial-gradient(ellipse at center, rgba(169, 225, 251, 0.13), transparent 68%);
      filter: blur(38px);
      pointer-events: none;
    }

    .screen-frame {
      position: relative;
      width: min(820px, 100%);
      height: min(720px, 100%);
      overflow: hidden;
      border-radius: 30px;
      border: 1px solid rgba(169, 225, 251, 0.15);
      background: rgba(10, 20, 29, 0.85);
      box-shadow:
        0 46px 130px rgba(0, 0, 0, 0.55),
        0 0 90px rgba(169, 225, 251, 0.05),
        inset 0 1px 0 rgba(255, 255, 255, 0.05);
      will-change: transform;
    }

    .screen-frame::after {
      content: '';
      position: absolute;
      inset: 0;
      z-index: 2;
      background: linear-gradient(180deg, rgba(3, 7, 11, 0.02), rgba(3, 7, 11, 0.18));
      pointer-events: none;
    }

    .screen-frame img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      will-change: transform;
    }

    .copy-card {
      display: grid;
      gap: 22px;
      align-content: center;
      max-width: 640px;
    }

    .copy-card h2 {
      margin: 0;
      font-family: 'Syne', system-ui, sans-serif;
      font-weight: 700;
      font-size: 58px;
      line-height: 1.03;
      letter-spacing: -0.05em;
    }

    .copy-card p {
      margin: 0;
      font-size: 19px;
      line-height: 1.6;
      color: var(--muted);
    }

    .copy-left { margin-left: 70px; }
    .copy-right { margin-right: 70px; }

    .full {
      display: grid;
      grid-template-columns: 1fr;
      padding: 0;
    }

    .full .screen-wrap {
      min-height: 0;
      position: absolute;
      inset: 0;
    }

    .full .screen-frame {
      width: 100%;
      height: 100%;
      border-radius: 0;
      border: none;
    }

    .full .screen-wrap::before { display: none; }

    .full::after {
      content: '';
      position: absolute;
      inset: 0;
      pointer-events: none;
      background:
        linear-gradient(90deg, rgba(2, 5, 8, 0.86) 0%, rgba(2, 5, 8, 0.42) 46%, rgba(2, 5, 8, 0.5) 100%),
        linear-gradient(180deg, rgba(2, 5, 8, 0.1), rgba(2, 5, 8, 0.55));
      z-index: 2;
    }

    .full .copy-card {
      position: absolute;
      left: 96px;
      bottom: 92px;
      max-width: 560px;
      z-index: 3;
    }

    .full .copy-card h2 { font-size: 54px; }
  </style>
</head>
<body>
  <div id="stage">
    <div class="brand-hud">${MARK}<span>RailSplit</span></div>
    ${scenes.map((scene) => sceneMarkup(scene, imageMap[scene.image] || '')).join('\n')}
    <div id="curtain"></div>
  </div>

  <script>
    const scenes = ${JSON.stringify(scenes)};
    const stage = document.getElementById('stage');
    const curtain = document.getElementById('curtain');
    const sceneEls = Array.from(document.querySelectorAll('.scene'));
    const startAt = performance.now() + 500;
    const total = ${RENDER_SECONDS};
    const fade = 0.7;

    const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
    const smooth = (t) => { const x = clamp(t, 0, 1); return x * x * (3 - 2 * x); };
    const easeOut = (t) => { const x = clamp(t, 0, 1); return 1 - Math.pow(1 - x, 5); };
    const easeInOut = (t) => { const x = clamp(t, 0, 1); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };

    function sceneAlpha(t, start, end) {
      const inPhase = smooth((t - start) / fade);
      const outPhase = smooth((end - t) / fade);
      return clamp(inPhase * outPhase, 0, 1);
    }

    function curtainAlpha(t) {
      let alpha = 1 - smooth(t / 0.9);

      for (let i = 0; i < scenes.length - 1; i++) {
        const peak = (scenes[i].end + scenes[i + 1].start) / 2;
        const distance = Math.abs(t - peak);
        if (distance < 0.6) alpha = Math.max(alpha, 1 - distance / 0.6);
      }

      alpha = Math.max(alpha, smooth((t - (total - 0.7)) / 0.7));
      return clamp(alpha, 0, 1);
    }

    function tick() {
      const t = Math.max(0, (performance.now() - startAt) / 1000);

      for (const sceneEl of sceneEls) {
        const start = Number(sceneEl.dataset.start);
        const end = Number(sceneEl.dataset.end);
        const alpha = sceneAlpha(t, start, end);
        const active = alpha > 0.004;
        sceneEl.style.opacity = alpha.toFixed(4);
        sceneEl.style.transform = 'scale(' + (0.998 + alpha * 0.002) + ')';

        const local = t - start;
        const reveals = sceneEl.querySelectorAll('.rv');
        for (const el of reveals) {
          const delay = Number(el.dataset.rd || 0);
          const p = easeOut((local - delay) / 0.85);
          el.style.opacity = p.toFixed(4);
          el.style.transform = 'translateY(' + (30 * (1 - p)).toFixed(2) + 'px)';
          el.style.filter = 'blur(' + (18 * (1 - p)).toFixed(2) + 'px)';
        }

        const frame = sceneEl.querySelector('.screen-frame');
        if (frame && active) {
          const img = frame.querySelector('img');
          const span = Math.max(0.0001, end - start);
          const pLocal = smooth((t - start) / span);
          const zoom = 1.03 + pLocal * 0.055;
          const drift = (0.5 - pLocal) * 1.6;
          img.style.transform = 'translateY(' + drift.toFixed(2) + '%) scale(' + zoom.toFixed(4) + ')';
          const focus = frame.dataset.focus || 'center top';
          img.style.objectPosition = focus;
        }
      }

      curtain.style.opacity = curtainAlpha(t).toFixed(4);

      if (t < total + 1.2) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  </script>
</body>
</html>`;
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function main() {
  await ensureDir(OUT);

  const browser = await chromium.launch({ headless: true });

  await captureShot(browser, { name: 'home', url: APP });
  await captureShot(browser, { name: 'create', url: `${APP}/dashboard/links/new`, walletMode: 'connected' });
  await captureShot(browser, { name: 'dashboard', url: `${APP}/dashboard`, walletMode: 'connected' });
  await captureShot(browser, { name: 'ledger', url: `${APP}/dashboard`, walletMode: 'connected', scrollY: 640 });
  await captureShot(browser, { name: 'checkout', url: `${APP}/pay/studio-intake-014`, walletMode: 'connected' });
  await captureShot(browser, { name: 'settle', url: `${APP}/pay/studio-intake-014`, walletMode: 'connected', scrollY: 320 });

  await browser.close();

  const imageMap = {};
  for (const file of ['home.jpg', 'create.jpg', 'dashboard.jpg', 'ledger.jpg', 'checkout.jpg', 'settle.jpg']) {
    const buffer = await fs.readFile(path.join(OUT, file));
    imageMap[file] = `data:image/jpeg;base64,${buffer.toString('base64')}`;
  }

  const html = buildHtml(imageMap);
  await fs.writeFile(path.join(OUT, 'motion-storyboard.html'), html, 'utf8');

  const renderBrowser = await chromium.launch({ headless: true });
  const context = await renderBrowser.newContext({
    viewport: STAGE,
    deviceScaleFactor: 1,
    recordVideo: { dir: OUT, size: STAGE },
  });
  const page = await context.newPage();
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout((RENDER_SECONDS + 1.5) * 1000);

  const video = page.video();
  await page.close();
  await context.close();
  await renderBrowser.close();

  const webmPath = await video.path();
  const webmOut = path.join(OUT, 'railsplit-motion.webm');
  const mp4Out = path.join(OUT, 'railsplit-motion.mp4');
  await fs.copyFile(webmPath, webmOut);

  await execFileAsync('ffmpeg', [
    '-y', '-i', webmOut,
    '-c:v', 'libx264',
    '-crf', '19',
    '-preset', 'medium',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    mp4Out,
  ]);

  console.log(`Rendered ${mp4Out}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
