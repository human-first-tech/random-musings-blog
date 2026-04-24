"use client";

import { useMemo, useState } from "react";
import { PostCard } from "./PostCard";
import type { Post } from "@/lib/posts";

const ALL = "All";

export function WritingsClient({
  posts,
  tags,
}: {
  posts: Post[];
  tags: string[];
}) {
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string>(ALL);

  const filtered = useMemo(() => {
    let list = posts;
    if (activeTag !== ALL) list = list.filter((p) => p.tags.includes(activeTag));
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.excerpt.toLowerCase().includes(q) ||
          p.content.toLowerCase().includes(q),
      );
    }
    return list;
  }, [posts, search, activeTag]);

  const tagOptions = [ALL, ...tags];

  return (
    <>
      <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <div className="relative w-full max-w-[320px] flex-1">
          <span
            aria-hidden
            className="pointer-events-none absolute left-[14px] top-1/2 -translate-y-1/2 text-[0.9rem] text-ink-light"
          >
            ⌕
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search writings…"
            aria-label="Search writings"
            className="w-full rounded-[8px] border border-rule bg-card py-2.5 pl-10 pr-4 font-sans text-[0.875rem] text-ink outline-none transition-colors placeholder:text-ink-light focus:border-accent"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {tagOptions.map((t) => {
            const active = t === activeTag;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setActiveTag(t)}
                aria-pressed={active}
                className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 font-sans text-[0.75rem] transition-colors ${
                  active
                    ? "border-accent bg-accent text-white"
                    : "border-rule bg-transparent text-ink-mid hover:border-accent hover:text-accent"
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(340px,1fr))]">
        {filtered.length === 0 ? (
          <div className="col-span-full px-8 py-16 text-center text-[0.95rem] text-ink-light">
            <strong className="mb-2 block font-serif text-[1.3rem] text-ink-mid">
              Nothing found
            </strong>
            Try a different search or tag
          </div>
        ) : (
          filtered.map((p) => <PostCard key={p.slug} post={p} />)
        )}
      </div>
    </>
  );
}
