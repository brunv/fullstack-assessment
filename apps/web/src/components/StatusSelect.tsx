"use client";

import type { Status } from "@/graphql/operations";
import { STATUS_LABELS, STATUS_VALUES } from "@/lib/status";

type Props = {
  status: Status;
  onChange: (status: Status) => void;
  disabled?: boolean;
};

export function StatusSelect({ status, onChange, disabled }: Props) {
  return (
    <div className="inline-flex gap-1 rounded-md bg-[var(--color-background)] p-1">
      {STATUS_VALUES.map((value) => {
        const selected = value === status;
        return (
          <button
            key={value}
            type="button"
            disabled={disabled}
            onClick={() => !selected && onChange(value)}
            aria-pressed={selected}
            className={`rounded px-3 py-1.5 text-sm font-medium transition disabled:opacity-50 ${
              selected
                ? "bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm"
                : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
            }`}
          >
            {STATUS_LABELS[value]}
          </button>
        );
      })}
    </div>
  );
}
