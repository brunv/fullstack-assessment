import type { Status } from "@/graphql/operations";
import { STATUS_LABELS } from "@/lib/status";

const STATUS_STYLES: Record<Status, string> = {
  new: "bg-[var(--color-neutral-100)] text-[var(--color-ink-muted)]",
  in_progress: "bg-[var(--color-warning)]/15 text-[var(--color-warning)]",
  complete: "bg-[var(--color-success)]/15 text-[var(--color-success)]",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
