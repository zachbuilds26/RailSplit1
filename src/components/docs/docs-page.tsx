"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RailsplitLogo } from "@/components/ui/railsplit-logo";

const tocItems = [
  { id: "overview", label: "Overview" },
  { id: "flow", label: "Flow" },
  { id: "settlement", label: "Settlement" },
  { id: "wallet", label: "Wallets" },
  { id: "dashboard", label: "Dashboard" },
  { id: "testnet", label: "Testnet" },
  { id: "faq", label: "FAQ" },
  { id: "related", label: "Related" },
];

const faqItems = [
  {
    question: "What does RailSplit do?",
    answer:
      "RailSplit turns a merchant's price into a payment link. The customer pays the amount shown, and the funds move to the merchant's wallet without an intermediary.",
  },
  {
    question: "How does the price stay current?",
    answer:
      "RailSplit prices each payment with the live onchain rate at confirmation, so the amount charged matches the market when the transaction lands.",
  },
  {
    question: "Why does the checkout ask for slightly more than the price?",
    answer:
      "The dollar price is fixed, but the coin amount moves with the live rate. The contract takes a small buffer at payment time and automatically refunds whatever is left over.",
  },
  {
    question: "When does a link stop taking payments?",
    answer:
      "A link closes permanently once a payment confirms, or when its expiry time passes. After that the checkout shows a completed or expired state.",
  },
  {
    question: "Can a link be paid twice?",
    answer:
      "No. The first successful payment closes the link, so no one can pay the same checkout twice.",
  },
  {
    question: "Is this live on mainnet?",
    answer:
      "Not yet. The demo runs on Coston2 so you can review the full flow without mainnet risk.",
  },
];

export function DocsPage() {
  const [activeId, setActiveId] = useState("overview");

  useEffect(() => {
    const targets = tocItems
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => Boolean(el));

    if (!("IntersectionObserver" in window) || targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (!visible.length) return;

        visible.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        setActiveId((visible[0].target as HTMLElement).id);
      },
      { rootMargin: "-22% 0px -62% 0px", threshold: [0.08, 0.16, 0.32, 0.5, 0.72] },
    );

    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, []);

  return (
    <main className="min-h-screen bg-background text-ink">
      <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8 lg:px-10">
        <RailsplitLogo />
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="border border-line px-3 py-2 text-xs font-semibold text-ink hover:border-line-strong hover:bg-surface"
          >
            Back home
          </Link>
          <Link
            href="/dashboard"
            className="border border-line px-3 py-2 text-xs font-semibold text-ink hover:border-line-strong hover:bg-surface"
          >
            Open dashboard
          </Link>
        </div>
      </header>

      <div className="railsplit-docs mx-auto max-w-7xl px-5 pb-14 sm:px-8 lg:px-10 lg:pb-20">
        <aside className="railsplit-docs__toc" aria-label="On this page">
          <p className="railsplit-docs__toc-label">On this page</p>
          <nav aria-label="Document sections">
            <ul className="railsplit-docs__toc-list">
              {tocItems.map((item) => (
                <li key={item.id}>
                  <a
                    className="railsplit-docs__toc-link"
                    href={`#${item.id}`}
                    aria-current={activeId === item.id ? "true" : undefined}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <article className="railsplit-docs__article">
          <header className="railsplit-docs__header">
            <span className="text-[10px] font-semibold tracking-[0.16em] text-accent uppercase">
              RailSplit docs
            </span>
            <h1 className="font-display railsplit-docs__title">Clear payment links on Flare.</h1>
            <p className="railsplit-docs__lead">
              With RailSplit, a merchant publishes one payment link, names the dollar price, and
              the payment confirms onchain and lands in their wallet.
            </p>
            <div className="railsplit-docs__callout">
              <p>
                Start with the overview, then review the flow below. If you want the merchant view
                first, open <Link href="/dashboard" className="font-semibold text-ink underline underline-offset-2">/dashboard</Link>.
              </p>
            </div>
          </header>

          <section className="railsplit-docs__section" id="overview">
            <h2 className="railsplit-docs__section-title">Overview</h2>
            <p>
              The flow is simple: publish a link, share it, and the payment moves onchain to the
              merchant wallet.
            </p>
            <p>
              The landing page introduces the product, the checkout confirms the amount, the
              dashboard shows merchant activity, and this page ties the flow together.
            </p>
          </section>

          <section className="railsplit-docs__section" id="flow">
            <h2 className="railsplit-docs__section-title">Flow</h2>
            <ol className="railsplit-docs__steps">
              <li>
                <strong>Set a dollar price.</strong> The merchant publishes a payment link with the exact amount.
              </li>
              <li>
                <strong>Share one payment link.</strong> Customers open it, connect a wallet,
                and review the live payment amount.
              </li>
              <li>
                <strong>Settle onchain.</strong> The payment confirms and moves directly to the merchant wallet.
              </li>
            </ol>
            <div className="mt-6 overflow-hidden border border-line bg-background-deep p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/workflow-panels-cut.webp"
                alt="RailSplit flow diagram: publish a link, share the checkout, settle onchain"
                className="block w-full"
              />
            </div>
          </section>

          <section className="railsplit-docs__section" id="settlement">
            <h2 className="railsplit-docs__section-title">Settlement</h2>
            <p>
              RailSplit uses the live onchain rate when payment is confirmed. That keeps the final
              amount aligned with the transaction instead of the screen.
            </p>
            <ul className="railsplit-docs__list">
              <li>The checkout always reflects the current rate at confirmation.</li>
              <li>The merchant receives the settlement directly in the connected wallet.</li>
              <li>If the network cannot read the rate, the app shows a clear retry state.</li>
            </ul>
          </section>

          <section className="railsplit-docs__section" id="wallet">
            <h2 className="railsplit-docs__section-title">Wallets</h2>
            <p>
              Customers only need a wallet to pay. Merchants only need to connect a wallet to see
              their links and settlement history.
            </p>
            <p>
              If no wallet is connected, the app stays public and the sensitive views stay hidden.
            </p>
          </section>

          <section className="railsplit-docs__section" id="dashboard">
            <h2 className="railsplit-docs__section-title">Dashboard</h2>
            <p>
              The merchant dashboard shows active links, total settlement value, and recent activity
              once a wallet is connected.
            </p>
            <ul className="railsplit-docs__list">
              <li>Links appear as onchain records.</li>
              <li>Payments appear in a recent activity feed.</li>
              <li>The view stays scoped to the connected merchant.</li>
            </ul>
          </section>

          <section className="railsplit-docs__section" id="testnet">
            <h2 className="railsplit-docs__section-title">Testnet</h2>
            <p>
              RailSplit runs on Coston2 for the demo. Use a test wallet and the faucet before trying
              the live flow yourself.
            </p>
            <div className="railsplit-docs__note">
              Non-custodial by design. The payment moves directly to the merchant wallet.
            </div>
          </section>

          <section className="railsplit-docs__section" id="faq">
            <h2 className="railsplit-docs__section-title">FAQ</h2>
            <dl className="railsplit-docs__faq">
              {faqItems.map((item) => (
                <div className="railsplit-docs__qa" key={item.question}>
                  <dt>{item.question}</dt>
                  <dd>{item.answer}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="railsplit-docs__section railsplit-docs__section--end" id="related">
            <h2 className="railsplit-docs__section-title">Related links</h2>
            <ul className="railsplit-docs__related">
              <li>
                <Link href="/dashboard" className="railsplit-docs__related-link">
                  Open dashboard
                </Link>
              </li>
              <li>
                <Link href="/dashboard/links/new" className="railsplit-docs__related-link">
                  Create a link
                </Link>
              </li>
              <li>
                <Link href="/" className="railsplit-docs__related-link">
                  Back home
                </Link>
              </li>
            </ul>
          </section>
        </article>
      </div>
    </main>
  );
}
