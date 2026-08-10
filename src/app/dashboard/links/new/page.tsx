import Link from "next/link";
import type { Metadata } from "next";
import { Icon } from "@/components/ui/icon";
import { rails } from "@/lib/rails";

export const metadata: Metadata = {
  title: "New payment link",
};

const railChoices = [rails.coston2, rails["xrpl-evm-testnet"]] as const;

export default function NewPaymentLinkPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-10">
      <div className="max-w-2xl">
        <p className="text-[10px] font-semibold tracking-[0.16em] text-faint uppercase">
          Payment links / choose rail
        </p>
        <h1 className="font-display mt-3 text-4xl tracking-[-0.045em]">Choose Flare or XRPL.</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Pick the rail first, then RailSplit opens the right publish form.
        </p>
      </div>

      <div className="mt-9 grid gap-4 lg:grid-cols-2">
        {railChoices.map((rail) => (
          <section key={rail.key} className="border border-line bg-surface p-5 sm:p-6">
            <p className="text-[10px] font-semibold tracking-[0.15em] text-faint uppercase">
              {rail.label}
            </p>
            <h2 className="font-display mt-3 text-2xl tracking-[-0.04em]">
              {rail.key === "coston2" ? "Flare payment link" : "XRPL payment link"}
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
              {rail.key === "coston2"
                ? "Use the live FTSO price feed and settle in FLR."
                : "Use a signed quote and settle in XRP on XRPL EVM Testnet."}
            </p>
            <Link
              href={`/dashboard/links/new/${rail.routeSegment}`}
              className="mt-6 inline-flex items-center gap-2 bg-accent px-5 py-3 text-sm font-semibold text-accent-ink hover:bg-white"
            >
              Choose {rail.key === "coston2" ? "Flare" : "XRPL"}
              <Icon name="arrow-up-right" className="size-4" />
            </Link>
          </section>
        ))}
      </div>
    </div>
  );
}
