"use client";

import { useMutation, useQuery } from "@apollo/client";
import { ArrowLeft, ImageOff, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { CreatePostDialog } from "@/components/CreatePostDialog";
import { EmptyState } from "@/components/EmptyState";
import { PostCard } from "@/components/PostCard";
import { PostDetailModal } from "@/components/PostDetailModal";
import { Skeleton } from "@/components/Skeleton";
import { StatusSelect } from "@/components/StatusSelect";
import {
  DELETE_POST,
  JOB_QUERY,
  UPDATE_JOB_STATUS,
  type DeletePostVars,
  type JobQueryResult,
  type JobQueryVars,
  type Post,
  type Status,
  type UpdateJobStatusVars,
} from "@/graphql/operations";
import { compareByStatus } from "@/lib/status";

export default function JobDetailsPage({ params }: { params: { id: string } }) {
  const { data, loading, error } = useQuery<JobQueryResult, JobQueryVars>(JOB_QUERY, {
    variables: { id: params.id },
    fetchPolicy: "cache-and-network",
  });
  const [deletePost] = useMutation<unknown, DeletePostVars>(DELETE_POST, {
    refetchQueries: [{ query: JOB_QUERY, variables: { id: params.id } }],
  });
  // No refetchQueries needed: the mutation response includes id + status, so
  // Apollo's normalized cache updates this Job everywhere it's rendered
  // from (e.g. Home's JOBS_QUERY list) automatically.
  const [updateJobStatus] = useMutation<unknown, UpdateJobStatusVars>(UPDATE_JOB_STATUS);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  const handleDeletePost = async (post: Post) => {
    if (!window.confirm("Delete this post? This can't be undone.")) return;
    try {
      await deletePost({ variables: { id: post.id } });
    } catch (err) {
      toast.error("Couldn't delete post", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    }
  };

  const handleStatusChange = async (status: Status) => {
    if (!data?.job) return;
    try {
      await updateJobStatus({ variables: { id: data.job.id, status } });
    } catch (err) {
      toast.error("Couldn't update status", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
      >
        <ArrowLeft size={16} />
        Jobs
      </Link>

      {loading && !data ? (
        <>
          <Skeleton className="mb-6 h-8 w-1/2" />
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </>
      ) : error || !data?.job ? (
        <EmptyState
          icon={ImageOff}
          title="Job not found"
          subtitle={error?.message ?? "This job may have been deleted."}
        />
      ) : (
        <>
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-[var(--color-ink)]">{data.job.title}</h1>
              <div className="mt-3">
                <StatusSelect status={data.job.status} onChange={handleStatusChange} />
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="flex shrink-0 items-center gap-1.5 rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-on-primary)] hover:bg-[var(--color-primary-hover)]"
            >
              <Plus size={16} />
              Add post
            </button>
          </div>

          {data.job.posts.length === 0 ? (
            <EmptyState
              icon={ImageOff}
              title="No posts yet"
              subtitle="Add a post to start documenting this job."
              action={
                <button
                  type="button"
                  onClick={() => setCreateOpen(true)}
                  className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-on-primary)]"
                >
                  Add post
                </button>
              }
            />
          ) : (
            <div className="space-y-3">
              {[...data.job.posts]
                .sort(
                  (a, b) =>
                    compareByStatus(a, b) ||
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
                )
                .map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onPress={setSelectedPost}
                  onDelete={handleDeletePost}
                />
              ))}
            </div>
          )}

          <CreatePostDialog
            open={createOpen}
            onClose={() => setCreateOpen(false)}
            jobId={data.job.id}
          />
          <PostDetailModal post={selectedPost} onClose={() => setSelectedPost(null)} />
        </>
      )}
    </main>
  );
}
