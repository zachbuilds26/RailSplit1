import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { RailsplitLogo } from "@/components/ui/railsplit-logo";
import { explorerAddress, railsplitChain, shortenAddress } from "@/lib/chain";
import { RAILSPLIT_PAY_ADDRESS } from "@/lib/contract-address";

const workflowSteps = [
  {
    number: "01",
    title: "Set the price",
    copy: "Choose a dollar amount once, then publish a link customers can trust.",
  },
  {
    number: "02",
    title: "Share one link",
    copy: "Use the same checkout anywhere you need to take payment.",
  },
  {
    number: "03",
    title: "Receive settlement",
    copy: "Funds settle directly to the merchant wallet after payment is confirmed.",
  },
];

const faqItems = [
  {
    question: "What is RailSplit?",
    answer:
      "RailSplit gives merchants a single payment link with a clear dollar price and direct settlement on Flare.",
  },
  {
    question: "Where does the amount come from?",
    answer:
      "RailSplit uses the live onchain rate at confirmation, so the amount stays current when the payment lands.",
  },
  {
    question: "Do you hold funds?",
    answer: "No. Payment goes directly to the merchant wallet in the same flow.",
  },
  {
    question: "Can a link be paid twice?",
    answer:
      "No. Each link closes after a successful payment, so the checkout moves to a completed state.",
  },
  {
    question: "Is this ready for mainnet?",
    answer:
      "Not yet. This demo runs on Coston2 so the full flow stays fast and easy to verify.",
  },
  {
    question: "Which wallets work?",
    answer: "Any injected browser wallet like MetaMask or Coinbase Wallet should work here.",
  },
];

const whyFlare = [
  {
    number: "01",
    title: "Built for live settlement",
    copy:
      "RailSplit uses the current onchain rate when the transaction is confirmed, not a stale screen value.",
  },
  {
    number: "02",
    title: "Clear at the point of payment",
    copy: "Customers see one clean checkout and merchants receive a precise settlement amount.",
  },
  {
    number: "03",
    title: "Direct to the merchant",
    copy:
      "The payment moves straight to the merchant wallet without a custody step in between.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-background text-ink">
      <div className="fixed inset-0 z-0 pointer-events-none grid-fade" />
      <section className="relative isolate overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />
          <div className="absolute right-0 bottom-0 z-0 w-[120%] h-[120%] opacity-[0.11]" style={{ maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)', transform: 'translateX(350px) translateY(80px) scale(1.8)', transformOrigin: 'bottom right' }}>
            <Image
              src="/hero-engraving.png"
              alt=""
              fill
              className="object-contain object-right-bottom"
            />
          </div>
        </div>
        <header className="relative z-10 mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8 lg:px-10">
          <RailsplitLogo />
          <nav className="hidden items-center gap-6 text-xs text-muted sm:flex" aria-label="Main navigation">
            <a href="#workflow" className="hover:text-ink">
              How it works
            </a>
            <a href="#faq" className="hover:text-ink">
              FAQ
            </a>
            <a href="#why-flare" className="hover:text-ink">
              Why Flare
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/docs"
              className="border border-line px-3 py-2 text-xs font-semibold text-ink hover:border-line-strong hover:bg-surface"
            >
              Docs
            </Link>
            <Link
              href="/dashboard"
              className="border border-line px-3 py-2 text-xs font-semibold text-ink hover:border-line-strong hover:bg-surface"
            >
              Open dashboard
            </Link>
          </div>
        </header>

        <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-5 pb-12 pt-12 text-center sm:px-8 sm:pb-16 lg:px-10 lg:pt-24">
          <p className="inline-flex items-center gap-2 border border-line bg-background-deep/70 px-2.5 py-1 text-[10px] font-semibold tracking-[0.15em] text-muted uppercase">
            <span className="size-1.5 bg-accent" />
            Live on {railsplitChain.name}
          </p>
          <h1 className="font-display mt-7 max-w-3xl text-5xl leading-[0.92] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
            One link.
            <br />
            <span className="text-accent/95">Clear payments.</span>
          </h1>
          <p className="mt-7 max-w-2xl text-base leading-7 text-muted">
            RailSplit helps merchants publish a simple payment link with a clear dollar price and
            settle directly on Flare.
          </p>
          <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
            <Link
              href="/dashboard/links/new"
              className="inline-flex w-full items-center justify-center gap-2 bg-accent px-5 py-3 text-sm font-semibold text-accent-ink hover:bg-white sm:w-auto"
            >
              <Icon name="plus" className="size-4" />
              Create a payment link
            </Link>
            <Link
              href="/pay/arcade-run-001"
              className="inline-flex w-full items-center justify-center gap-2 border border-line px-5 py-3 text-sm font-semibold hover:border-line-strong hover:bg-surface sm:w-auto"
            >
              Open sample checkout <Icon name="arrow-up-right" className="size-4" />
            </Link>
          </div>
          <p className="mt-5 max-w-xl text-xs leading-5 text-muted">
            Testnet only. Use the{" "}
            <a
              href="https://faucet.flare.network/coston2"
              target="_blank"
              rel="noreferrer"
              className="text-accent underline underline-offset-2 hover:text-white"
            >
              Coston2 faucet
            </a>{" "}
            to try the flow yourself.
          </p>
        </div>
      </section>

      <section id="workflow" className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10">
        <div className="max-w-2xl">
          <p className="text-[10px] font-semibold tracking-[0.15em] text-accent uppercase">How it works</p>
          <h2 className="font-display mt-4 text-4xl leading-[0.94] tracking-[-0.045em] sm:text-5xl">
            Three steps.
            <br />
            One clear flow.
          </h2>
        </div>

          <ol className="railsplit-flow mt-8" aria-label="RailSplit workflow">
          {workflowSteps.map((step) => (
            <li key={step.number} className="railsplit-flow__step">
              <p className="railsplit-flow__number">{step.number}</p>
              <h3 className="railsplit-flow__title">{step.title}</h3>
              <p className="railsplit-flow__copy">{step.copy}</p>
            </li>
          ))}
        </ol>
      </section>

<section id="why-flare" className="relative bg-background-deep overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute right-0 bottom-0 z-0 w-[140%] h-[140%] opacity-[0.09]" style={{ maskImage: 'radial-gradient(ellipse 60% 50% at 80% 70%, black 20%, transparent 80%)', transform: 'translateX(400px) translateY(100px) scale(2.5)', transformOrigin: 'bottom right' }}>
          <Image
            src="/bridge.png"
            alt=""
            fill
            className="object-contain object-right-bottom"
          />
        </div>
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[10px] font-semibold tracking-[0.15em] text-accent uppercase">Why Flare</p>
            <h2 className="font-display mt-4 text-4xl tracking-[-0.045em] sm:text-5xl">
              Built around live settlement.
            </h2>
          </div>
          <div className="mt-16 flex flex-col">
            {whyFlare.map((item) => (
              <div key={item.number} className="flex flex-col gap-4 border-b border-line py-8 md:flex-row md:items-start md:gap-8 last:border-b-0">
                <p className="text-xs font-semibold tracking-[0.16em] text-accent md:w-16">{item.number}</p>
                <div>
                  <h3 className="text-xl font-medium">{item.title}</h3>
                  <p className="mt-3 max-w-md text-sm leading-6 text-muted">{item.copy}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="relative mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10 overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute right-0 top-0 bottom-0 w-[45%] opacity-[0.10]">
          <Image
            src="/faq-engraving.svg"
            alt=""
            fill
            className="object-contain object-right"
          />
        </div>
        <div className="max-w-2xl">
          <p className="text-[10px] font-semibold tracking-[0.15em] text-accent uppercase">FAQ</p>
          <h2 className="font-display mt-4 text-4xl tracking-[-0.045em] sm:text-5xl">
            Straight answers for merchants.
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-6 text-muted">
            A few quick notes on pricing, settlement, and testnet use.
          </p>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {faqItems.map((item) => (
            <details
              key={item.question}
              className="group rounded-[28px] border border-line bg-surface p-5 transition hover:border-line-strong hover:bg-surface-hover"
            >
              <summary className="flex cursor-pointer items-start justify-between gap-4 text-left font-display text-xl leading-tight tracking-[-0.035em]">
                <span>{item.question}</span>
                <Icon
                  name="chevron"
                  className="size-4 shrink-0 text-accent transition-transform duration-200 group-open:rotate-180"
                />
              </summary>
              <p className="mt-4 text-sm leading-6 text-muted">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
        <RailsplitLogo />
        <div className="flex flex-col gap-2 sm:items-end">
          <a
            href={explorerAddress(RAILSPLIT_PAY_ADDRESS)}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-accent underline underline-offset-2 hover:text-white"
          >
            {shortenAddress(RAILSPLIT_PAY_ADDRESS)}
          </a>
          <p>Running on {railsplitChain.name}. Testnet funds only.</p>
        </div>
      </footer>
    </main>
  );
}