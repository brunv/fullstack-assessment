import type { Status } from "@/graphql/operations";

export const STATUS_VALUES: Status[] = ["new", "in_progress", "complete"];

export const STATUS_LABELS: Record<Status, string> = {
  new: "New",
  in_progress: "In Progress",
  complete: "Complete",
};

/** new > in_progress > complete, for sorting a single combined list (e.g. a
 * Job's posts) — not used for Home's Job list, which filters into separate
 * tabs instead rather than interleaving statuses in one list. */
export const STATUS_PRIORITY: Record<Status, number> = {
  new: 0,
  in_progress: 1,
  complete: 2,
};

export function compareByStatus<T extends { status: Status }>(a: T, b: T): number {
  return STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status];
}
