/** Placeholder block for content still loading from the chain. */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-[2px] bg-surface-hover ${className}`}
    />
  );
}
