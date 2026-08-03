import { RailsplitLogo } from "@/components/ui/railsplit-logo";

export default function Loading() {
  return (
    <main className="grid min-h-screen place-items-center bg-background-deep px-5 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <RailsplitLogo />
        </div>

        <section className="border border-line bg-surface p-5 sm:p-7" role="status" aria-live="polite">
          <div className="animate-pulse">
            <div className="h-3 w-24 bg-line/60" />
            <div className="mt-6 h-8 w-3/4 bg-line/60" />
            <div className="mt-8 h-24 bg-background-deep" />
            <div className="mt-5 h-12 bg-background-deep" />
          </div>
          <p className="mt-5 text-center text-sm text-muted">Loading payment link…</p>
        </section>
      </div>
    </main>
  );
}
