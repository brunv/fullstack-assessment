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
import {
  DELETE_POST,
  JOB_QUERY,
  type DeletePostVars,
  type JobQueryResult,
  type JobQueryVars,
  type Post,
} from "@/graphql/operations";

export default function JobDetailsPage({ params }: { params: { id: string } }) {
  const { data, loading, error } = useQuery<JobQueryResult, JobQueryVars>(JOB_QUERY, {
    variables: { id: params.id },
    fetchPolicy: "cache-and-network",
  });
  const [deletePost] = useMutation<unknown, DeletePostVars>(DELETE_POST, {
    refetchQueries: [{ query: JOB_QUERY, variables: { id: params.id } }],
  });
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
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-[var(--color-ink)]">{data.job.title}</h1>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-1.5 rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-on-primary)] hover:bg-[var(--color-primary-hover)]"
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
              {data.job.posts.map((post) => (
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
