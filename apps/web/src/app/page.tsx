"use client";

import { useMutation, useQuery } from "@apollo/client";
import { Briefcase, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { CreateJobDialog } from "@/components/CreateJobDialog";
import { EmptyState } from "@/components/EmptyState";
import { JobCard } from "@/components/JobCard";
import { Skeleton } from "@/components/Skeleton";
import { StatusSelect } from "@/components/StatusSelect";
import {
  DELETE_JOB,
  JOBS_QUERY,
  type DeleteJobVars,
  type Job,
  type JobsQueryResult,
  type Status,
} from "@/graphql/operations";
import { STATUS_LABELS } from "@/lib/status";

export default function Home() {
  const { data, loading, error } = useQuery<JobsQueryResult>(JOBS_QUERY, {
    fetchPolicy: "cache-and-network",
  });
  const [deleteJob] = useMutation<unknown, DeleteJobVars>(DELETE_JOB, {
    refetchQueries: [{ query: JOBS_QUERY }],
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<Status>("new");

  // Tabs filter a single already-fetched list client-side — there's only
  // ever one query (JOBS_QUERY) behind them, so there's nothing to
  // separately "refresh per tab."
  const filteredJobs = useMemo(
    () => (data?.jobs ?? []).filter((job) => job.status === selectedStatus),
    [data, selectedStatus],
  );

  const handleDelete = async (job: Job) => {
    const postCount = job.posts.length;
    const confirmed = window.confirm(
      postCount > 0
        ? `Delete "${job.title}"? This will also delete ${postCount} post${postCount === 1 ? "" : "s"}.`
        : `Delete "${job.title}"? This can't be undone.`,
    );
    if (!confirmed) return;
    try {
      await deleteJob({ variables: { id: job.id } });
    } catch (err) {
      toast.error("Couldn't delete job", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--color-ink)]">Jobs</h1>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-1.5 rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-on-primary)] hover:bg-[var(--color-primary-hover)]"
        >
          <Plus size={16} />
          New job
        </button>
      </div>

      <div className="mb-6">
        <StatusSelect status={selectedStatus} onChange={setSelectedStatus} />
      </div>

      {loading && !data ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : error ? (
        <EmptyState
          icon={Briefcase}
          title="Couldn't load jobs"
          subtitle={error.message}
        />
      ) : !data?.jobs.length ? (
        <EmptyState
          icon={Briefcase}
          title="No jobs yet"
          subtitle="Create your first job to start adding posts."
          action={
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-on-primary)]"
            >
              New job
            </button>
          }
        />
      ) : filteredJobs.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title={`No ${STATUS_LABELS[selectedStatus].toLowerCase()} jobs`}
          subtitle="Jobs you move to this status will show up here."
        />
      ) : (
        <div className="space-y-3">
          {filteredJobs.map((job) => (
            <JobCard key={job.id} job={job} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <CreateJobDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </main>
  );
}
