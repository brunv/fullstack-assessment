"use client";

import { useQuery } from "@apollo/client";
import { Images, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/EmptyState";
import { PostDetailModal } from "@/components/PostDetailModal";
import { PostSearchCard } from "@/components/PostSearchCard";
import { Skeleton } from "@/components/Skeleton";
import { ALL_POSTS_QUERY, type AllPostsQueryResult, type Post } from "@/graphql/operations";

export default function PostsPage() {
  const { data, loading, error } = useQuery<AllPostsQueryResult>(ALL_POSTS_QUERY, {
    fetchPolicy: "cache-and-network",
  });
  const [query, setQuery] = useState("");
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  const filteredPosts = useMemo(() => {
    const posts = data?.posts ?? [];
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return posts;
    return posts.filter((post) => post.description.toLowerCase().includes(trimmed));
  }, [data, query]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold text-[var(--color-ink)]">Posts</h1>

      <div className="mb-6 flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
        <Search size={16} className="text-[var(--color-ink-faint)]" />
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search posts by description"
          className="w-full bg-transparent text-sm text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-faint)]"
        />
      </div>

      {loading && !data ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : error ? (
        <EmptyState icon={Images} title="Couldn't load posts" subtitle={error.message} />
      ) : filteredPosts.length === 0 ? (
        <EmptyState
          icon={Images}
          title={data?.posts.length ? "No matching posts" : "No posts yet"}
          subtitle={
            data?.posts.length
              ? `No posts match "${query}".`
              : "Posts you add to any job will show up here."
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredPosts.map((post) => (
            <PostSearchCard key={post.id} post={post} onPress={setSelectedPost} />
          ))}
        </div>
      )}

      <PostDetailModal post={selectedPost} onClose={() => setSelectedPost(null)} />
    </main>
  );
}
