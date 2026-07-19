export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-[var(--color-neutral-200)] ${className}`}
    />
  );
}
