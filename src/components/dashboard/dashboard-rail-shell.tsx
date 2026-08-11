"use client";

import Link from "next/link";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import { RailsplitLogo } from "@/components/ui/railsplit-logo";
import { DashboardSidebarAccount } from "@/components/dashboard/dashboard-sidebar-account";
import { buildExplorerAddressUrl, getRail, shortenAddress, type RailConfig, type RailKey } from "@/lib/chain";

type DashboardRailContextValue = {
  railKey: RailKey;
  rail: RailConfig;
};

const DashboardRailContext = createContext<DashboardRailContextValue | null>(null);

const navigation = [
  { label: "Overview", href: "/dashboard", icon: "grid" as const },
  { label: "New payment link", href: "/dashboard/links/new", icon: "link" as const },
];

const flowSteps = ["Publish the link", "Share the checkout URL", "Track settlement in one place"];

function DashboardChrome({ children }: { children: ReactNode }) {
  const { rail } = useDashboardRail();

  return (
    <div className="min-h-screen bg-background text-ink">
      <aside className="fixed inset-y-0 left-0 hidden w-72 overflow-y-auto border-r border-line bg-background-deep lg:flex lg:flex-col">
        <div className="flex min-h-screen flex-col px-5 py-6">
          <RailsplitLogo />

          <nav className="mt-10 space-y-1" aria-label="Merchant navigation">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 border border-transparent px-3 py-2.5 text-sm text-muted transition hover:border-line hover:bg-surface hover:text-ink"
              >
                <Icon name={item.icon} className="size-4" />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-8 grid gap-4">
            <section className="border border-line bg-surface p-4">
              <p className="text-[10px] font-semibold tracking-[0.15em] text-faint uppercase">Network</p>
              <dl className="mt-3 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted">Chain</dt>
                  <dd className="text-right">{rail.label}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted">Currency</dt>
                  <dd className="text-right">{rail.nativeSymbol}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted">Contract</dt>
                  <dd className="text-right">
                    {rail.contractAddress ? (
                      <a
                        href={buildExplorerAddressUrl(rail.key, rail.contractAddress)}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-xs text-accent underline underline-offset-2 hover:text-white"
                      >
                        {shortenAddress(rail.contractAddress)}
                      </a>
                    ) : (
                      <span className="text-xs text-muted">Not deployed</span>
                    )}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="border border-line bg-surface p-4">
              <p className="text-[10px] font-semibold tracking-[0.15em] text-faint uppercase">How it works</p>
              <ol className="mt-3 space-y-2 text-sm text-muted">
                {flowSteps.map((step, index) => (
                  <li key={step} className="flex gap-3">
                    <span className="text-[10px] font-semibold tracking-[0.14em] text-accent">{String(index + 1).padStart(2, "0")}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          <div className="mt-auto border-t border-line pt-5">
            <DashboardSidebarAccount railKey={rail.key} />
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-line bg-background/95 px-5 backdrop-blur lg:ml-72 lg:px-10">
        <div className="flex items-center gap-3 lg:hidden">
          <RailsplitLogo compact />
          <span className="text-[10px] font-semibold tracking-[0.12em] text-muted uppercase">Dashboard</span>
        </div>
        <div className="hidden items-center gap-2 sm:flex lg:hidden">
          <Link href="/docs" className="border border-line px-3 py-2 text-xs font-semibold text-ink hover:border-line-strong hover:bg-surface">Docs</Link>
          <Link href="/" className="border border-line px-3 py-2 text-xs font-semibold text-ink hover:border-line-strong hover:bg-surface">Home</Link>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/dashboard/links/new"
            className="inline-flex items-center gap-2 bg-accent px-3.5 py-2 text-xs font-semibold text-accent-ink hover:bg-white"
          >
            <Icon name="plus" className="size-3.5" />
            New link
          </Link>
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-around border-t border-line bg-background/95 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden" aria-label="Mobile navigation">
        <Link href="/dashboard" className="flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] text-muted hover:text-ink">
          <Icon name="grid" className="size-4" />
          <span>Overview</span>
        </Link>
        <Link href="/dashboard/links/new" className="flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] text-muted hover:text-ink">
          <Icon name="link" className="size-4" />
          <span>New link</span>
        </Link>
        <Link href="/docs" className="flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] text-muted hover:text-ink">
          <Icon name="book" className="size-4" />
          <span>Docs</span>
        </Link>
        <Link href="/" className="flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] text-muted hover:text-ink">
          <Icon name="arrow-up-right" className="size-4" />
          <span>Home</span>
        </Link>
      </nav>

      <main className="pb-[calc(4rem+env(safe-area-inset-bottom))] lg:ml-72 lg:pb-0">{children}</main>
    </div>
  );
}

export function DashboardRailShell({ children }: { children: ReactNode }) {
  const rail = getRail("coston2");

  const value = useMemo<DashboardRailContextValue>(() => ({ railKey: rail.key, rail }), [rail]);

  return (
    <DashboardRailContext.Provider value={value}>
      <DashboardChrome>{children}</DashboardChrome>
    </DashboardRailContext.Provider>
  );
}

export function useDashboardRail() {
  const context = useContext(DashboardRailContext);
  if (!context) throw new Error("useDashboardRail must be used inside DashboardRailShell.");
  return context;
}