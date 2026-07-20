"use client";

import { ChevronDown } from "lucide-react";

import type { Status } from "@/graphql/operations";
import { STATUS_LABELS, STATUS_VALUES } from "@/lib/status";

type Props = {
  status: Status;
  onChange: (status: Status) => void;
  disabled?: boolean;
};

// A native <select> rather than StatusSelect's 3-segment control — that
// control is reserved for Home's filter tabs (see apps/web/CLAUDE.md's
// "Status" section); reusing it here to *edit* a single record's status
// looked identical to filtering a list, which was confusing.
export function StatusDropdown({ status, onChange, disabled }: Props) {
  return (
    <div className="relative inline-block">
      <select
        value={status}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as Status)}
        className="appearance-none rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] py-1.5 pl-3 pr-8 text-sm font-medium text-[var(--color-ink)] disabled:opacity-50"
      >
        {STATUS_VALUES.map((value) => (
          <option key={value} value={value}>
            {STATUS_LABELS[value]}
          </option>
        ))}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]"
      />
    </div>
  );
}
