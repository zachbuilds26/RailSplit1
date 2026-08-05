import Image from "next/image";
import Link from "next/link";

type RailsplitLogoProps = {
  href?: string;
  compact?: boolean;
};

export function RailsplitLogo({ href = "/", compact = false }: RailsplitLogoProps) {
  return (
    <Link href={href} className="group inline-flex items-center gap-0.5" aria-label="RailSplit">
      <span
        className={compact ? "relative size-10 shrink-0" : "relative size-11 shrink-0"}
        aria-hidden="true"
      >
        <Image
          src="/RailSplit_logo_transparent.png"
          alt=""
          fill
          sizes={compact ? "40px" : "44px"}
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
