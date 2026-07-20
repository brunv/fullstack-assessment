"use client";

import { useMutation } from "@apollo/client";
import { ImageOff } from "lucide-react";
import { toast } from "sonner";

import {
  UPDATE_POST_STATUS,
  type Post,
  type Status,
  type UpdatePostStatusVars,
} from "@/graphql/operations";
import { Modal } from "./Modal";
import { StatusDropdown } from "./StatusDropdown";

type Props = {
  post: Post | null;
  onClose: () => void;
};

export function PostDetailModal({ post, onClose }: Props) {
  // No refetchQueries needed: the mutation response includes id + status, so
  // Apollo's normalized cache updates this Post everywhere it's rendered
  // from (the job details list) automatically.
  const [updatePostStatus] = useMutation<unknown, UpdatePostStatusVars>(UPDATE_POST_STATUS);

  const handleStatusChange = async (status: Status) => {
    if (!post) return;
    try {
      await updatePostStatus({ variables: { id: post.id, status } });
    } catch (err) {
      toast.error("Couldn't update status", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    }
  };

  return (
    <Modal open={post !== null} onClose={onClose} title="Post" size="lg">
      {post &&
        (post.pictureUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- external MinIO URL, not worth next/image's remote-pattern config for an interview scaffold
          <img
            src={post.pictureUrl}
            alt=""
            className="max-h-[60vh] w-full rounded-md object-contain"
          />
        ) : (
          <div className="flex h-48 w-full items-center justify-center rounded-md bg-[var(--color-neutral-100)]">
            <ImageOff size={32} className="text-[var(--color-ink-faint)]" />
          </div>
        ))}
      {post && (
        <>
          {post.job && (
            <p className="mt-4 text-xs font-medium text-[var(--color-primary)]">
              {post.job.title}
            </p>
          )}
          <p className={`whitespace-pre-wrap text-sm text-[var(--color-ink)] ${post.job ? "mt-1" : "mt-4"}`}>
            {post.description || "No description"}
          </p>
          <p className="mt-2 text-xs text-[var(--color-ink-muted)]">
            {new Date(post.createdAt).toLocaleString()}
          </p>
          <div className="mt-4">
            <StatusDropdown status={post.status} onChange={handleStatusChange} />
          </div>
        </>
      )}
    </Modal>
  );
}
