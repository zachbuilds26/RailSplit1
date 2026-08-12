import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { RailsplitLogo } from "@/components/ui/railsplit-logo";
import { TypewriterTagline } from "@/components/landing/typewriter-tagline";
import { buildCheckoutPath, explorerAddress, railsplitChain, shortenAddress } from "@/lib/chain";
import { DEMO_SLUG, RAILSPLIT_PAY_ADDRESS } from "@/lib/contract-address";

const faqItems = [
  {
    question: "What is RailSplit?",
    answer:
      "RailSplit gives a merchant one link per payment priced in US dollars. Customers pay in the network's native coin at the live rate, and the settlement arrives directly in the merchant wallet.",
  },
  {
    question: "Where does the amount come from?",
    answer:
      "The contract reads the live FTSOv2 FLR/USD feed at payment time and does the conversion itself. No one can pass in a rate, so the amount stays current when the payment lands.",
  },
  {
    question: "Do you hold funds?",
    answer:
      "No. The merchant receives exactly the converted amount, and the customer gets anything sent over refunded in the same transaction.",
  },
  {
    question: "Can a link be paid twice?",
    answer:
      "No. Each link is single use and closes after a successful payment, so the checkout moves to a completed state.",
  },
  {
    question: "Is this ready for mainnet?",
    answer:
      "Not yet. This demo runs on Coston2 today.",
  },
  {
    question: "Which wallets work?",
    answer: "Any injected browser wallet like MetaMask or Coinbase Wallet should work here.",
  },
];

const whyFlare = [
  {
    number: "01",
    title: "Priced by Flare's FTSO feeds",
    copy:
      "The contract reads the rate from Flare's onchain price feeds at the moment of payment and does the arithmetic itself. A stale feed is rejected, so nothing settles at an old rate.",
  },
  {
    number: "02",
    title: "Clear at the point of payment",
    copy: "Customers see one clean checkout with the live amount, and merchants receive exactly the dollar price they set.",
  },
  {
    number: "03",
    title: "Direct to the merchant",
    copy:
      "The payment moves straight to the merchant wallet without a custody step in between. Each link is single use and closes itself once it settles.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-background text-ink">
      <div className="fixed inset-0 z-0 pointer-events-none grid-fade" />
      <section className="relative isolate overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />
          <div className="absolute right-0 bottom-0 z-0 w-[120%] h-[120%] opacity-[0.20]" style={{ maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)', transform: 'translateX(350px) translateY(80px) scale(1.8)', transformOrigin: 'bottom right' }}>
            <Image
              src="/hero-engraving.webp"
              alt=""
              fill
              sizes="100vw"
              priority
              unoptimized
              className="object-contain object-right-bottom"
            />
          </div>
        </div>
        <header className="relative z-10 mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8 lg:px-10">
          <RailsplitLogo />
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-muted sm:gap-6" aria-label="Main navigation">
            <a href="#workflow" className="py-2 hover:text-ink">
              How it works
            </a>
            <a href="#faq" className="py-2 hover:text-ink">
              FAQ
            </a>
            <a href="#why-flare" className="py-2 hover:text-ink">
              Why Flare
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/docs"
              className="border border-line px-3 py-2.5 text-xs font-semibold text-ink hover:border-line-strong hover:bg-surface"
            >
              Docs
            </Link>
            <Link
              href="/dashboard"
              className="border border-line px-3 py-2.5 text-xs font-semibold text-ink hover:border-line-strong hover:bg-surface"
            >
              Open dashboard
            </Link>
          </div>
        </header>

        <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-5 pb-12 pt-12 text-center sm:px-8 sm:pb-16 lg:px-10 lg:pt-24">
          <p className="inline-flex items-center gap-2 border border-line bg-background-deep/70 px-2.5 py-1 text-[10px] font-semibold tracking-[0.15em] text-muted uppercase">
            <span className="size-1.5 bg-accent animate-pulse" />
            Live on {railsplitChain.name}
          </p>
          <h1 className="font-display mt-7 max-w-3xl text-5xl leading-[0.92] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
            One link.
            <br />
            <span className="text-accent/95">Clear payments.</span>
          </h1>
          <p className="mt-7 max-w-2xl text-base leading-7 text-muted">
            RailSplit helps merchants publish a payment link that shows a clear dollar price and
            settles on Flare when the customer pays.
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
              href={buildCheckoutPath(DEMO_SLUG)}
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

      <section id="workflow" className="relative mx-auto min-h-[560px] max-w-7xl px-5 py-20 sm:px-8 lg:px-10 overflow-hidden">
        <h2
          aria-label="How it works"
          className="absolute inset-x-0 top-[6%] z-0 px-5 text-center text-2xl leading-[0.95] tracking-[-0.055em] sm:text-4xl lg:top-0"
        >
          <span className="font-display lg:hidden">How it works</span>
          <svg
            aria-hidden="true"
            viewBox="0 0 1280 210"
            className="hidden w-full overflow-visible lg:block"
          >
            <defs>
              <path id="workflow-arc" d="M 250 170 Q 700 40 1120 170" fill="none" />
            </defs>
            <text
              className="font-display"
              fill="currentColor"
              fontSize="64"
              letterSpacing="-3"
            >
              <textPath href="#workflow-arc" startOffset="50%" textAnchor="middle">
                How it works
              </textPath>
            </text>
          </svg>
        </h2>
        <div aria-hidden="true" className="pointer-events-none select-none absolute top-1/2 left-1/2 z-10 opacity-100" style={{ width: 'min(1600px, 135vw)', height: 'auto', transform: 'translate(-66.5%, -50%)', maskImage: 'radial-gradient(circle at 66% 50%, black 70%, transparent 96%)', WebkitMaskImage: 'radial-gradient(circle at 66% 50%, black 70%, transparent 96%)' }}>
          <Image
            src="/workflow-panels-cut.webp"
            alt=""
            width={2046}
            height={769}
            sizes="(max-width: 1600px) 135vw, 1600px"
            unoptimized
            className="w-full h-auto"
          />
        </div>
        <div className="absolute inset-x-0 bottom-3 z-20 flex justify-center">
          <TypewriterTagline />
        </div>
      </section>

<section id="why-flare" className="relative bg-background-deep overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute right-0 bottom-0 z-0 w-full h-full opacity-[0.40]" style={{ maskImage: 'radial-gradient(ellipse 70% 80% at 90% 60%, black 5%, transparent 70%)', transform: 'translateX(120px) translateY(-20px) scale(1.2)', transformOrigin: 'bottom right' }}>
          <Image
            src="/ques.webp"
            alt=""
            fill
            sizes="100vw"
            unoptimized
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
              <div key={item.number} className="flex flex-col gap-4 py-8 md:flex-row md:items-start md:gap-8">
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
              name="faq"
              className="group rounded-none border border-line bg-surface p-5 transition hover:border-line-strong hover:bg-surface-hover"
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