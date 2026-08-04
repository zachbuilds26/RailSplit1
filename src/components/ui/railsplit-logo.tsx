import Image from "next/image";
import Link from "next/link";

type RailsplitLogoProps = {
  href?: string;
  compact?: boolean;
};

export function RailsplitLogo({ href = "/", compact = false }: RailsplitLogoProps) {
  return (
    <Link href={href} className="group inline-flex items-center gap-1" aria-label="RailSplit">
      <span
        className={compact ? "relative size-8 shrink-0" : "relative size-9 shrink-0"}
        aria-hidden="true"
      >
        <Image
          src="/ChatGPT%20Image%20Aug%204,%202026,%2010_58_53%20PM.png"
          alt=""
          fill
          sizes={compact ? "32px" : "36px"}
          className="object-contain"
          priority
        />
      </span>
      {!compact && (
        <span className="font-display text-[15px] font-semibold tracking-[-0.03em] text-ink">
          RailSplit
        </span>
      )}
    </Link>
  );
}
