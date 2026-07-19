"use client";

import { ImageOff } from "lucide-react";

import type { Post } from "@/graphql/operations";
import { Modal } from "./Modal";

type Props = {
  post: Post | null;
  onClose: () => void;
};

export function PostDetailModal({ post, onClose }: Props) {
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
          <p className="mt-4 whitespace-pre-wrap text-sm text-[var(--color-ink)]">
            {post.description || "No description"}
          </p>
          <p className="mt-2 text-xs text-[var(--color-ink-muted)]">
            {new Date(post.createdAt).toLocaleString()}
          </p>
        </>
      )}
    </Modal>
  );
}
