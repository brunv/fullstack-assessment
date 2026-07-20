"use client";

import { ImageOff } from "lucide-react";

import type { Post } from "@/graphql/operations";
import { StatusBadge } from "./StatusBadge";

type Props = {
  post: Post;
  onPress: (post: Post) => void;
};

export function PostSearchCard({ post, onPress }: Props) {
  return (
    <button
      type="button"
      onClick={() => onPress(post)}
      className="flex w-full items-start gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-left transition hover:border-[var(--color-accent-300)]"
    >
      {post.pictureUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- external MinIO URL, not worth next/image's remote-pattern config for an interview scaffold
        <img
          src={post.pictureUrl}
          alt=""
          className="h-20 w-20 shrink-0 rounded-md object-cover"
        />
      ) : (
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md bg-[var(--color-neutral-100)]">
          <ImageOff size={20} className="text-[var(--color-ink-faint)]" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        {post.job && (
          <p className="truncate text-xs font-medium text-[var(--color-primary)]">
            {post.job.title}
          </p>
        )}
        <p className="mt-0.5 line-clamp-2 whitespace-pre-wrap text-sm text-[var(--color-ink)]">
          {post.description || "No description"}
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          <StatusBadge status={post.status} />
          <p className="text-xs text-[var(--color-ink-muted)]">
            {new Date(post.createdAt).toLocaleString()}
          </p>
        </div>
      </div>
    </button>
  );
}
