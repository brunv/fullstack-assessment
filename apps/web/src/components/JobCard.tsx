"use client";

import Link from "next/link";
import { ChevronRight, Trash2 } from "lucide-react";

import type { Job } from "@/graphql/operations";
import { StatusBadge } from "./StatusBadge";

type Props = {
  job: Job;
  onDelete: (job: Job) => void;
};

export function JobCard({ job, onDelete }: Props) {
  const postCount = job.posts.length;

  return (
    <div className="group flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition hover:border-[var(--color-accent-300)]">
      <Link href={`/jobs/${job.id}`} className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold text-[var(--color-ink)]">{job.title}</p>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          {postCount} post{postCount === 1 ? "" : "s"} ·{" "}
          {new Date(job.createdAt).toLocaleDateString()}
        </p>
        <div className="mt-2">
          <StatusBadge status={job.status} />
        </div>
      </Link>
      <button
        type="button"
        aria-label={`Delete ${job.title}`}
        onClick={() => onDelete(job)}
        className="rounded-full p-2 text-[var(--color-ink-faint)] hover:bg-[var(--color-error)]/10 hover:text-[var(--color-error)]"
      >
        <Trash2 size={18} />
      </button>
      <Link href={`/jobs/${job.id}`}>
        <ChevronRight size={18} className="text-[var(--color-ink-faint)]" />
      </Link>
    </div>
  );
}
