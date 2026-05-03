/**
 * Public posts API — backed by Notion.
 *
 * All exports preserve the same shape and names as the previous markdown-backed
 * implementation. The only behavioral change is they are now async.
 *
 * Page components and other callers should `await` these calls.
 */

import { cache } from "react";
import {
  fetchAllPostsFromNotion,
  fetchBlocksForPost,
  blocksToPlainText,
  type NotionBlock,
  type RawPost,
} from "./notion";

export type Post = {
  title: string;
  date: string; // formatted for display, e.g. "December 21, 2021"
  isoDate: string; // YYYY-MM-DD, used for RSS, sitemap, sorting
  slug: string;
  /**
   * For backwards-compat with existing components:
   * `tags[0]` is the primary Category, the rest are Sub-tags.
   */
  tags: string[];
  category: string;
  excerpt: string;
  /**
   * Plain-text representation of the article body, used by the search filter
   * on /writings. The rendered article uses the `blocks` field instead.
   */
  content: string;
  blocks: NotionBlock[];
  coverUrl?: string;
  pageId: string;
};

// ─────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────

function formatDate(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Fetch raw posts + the body blocks for each, in parallel.
 * Memoized per-request via React cache so multiple components can call this
 * without duplicate API calls.
 */
const getAllPostsHydrated = cache(async (): Promise<Post[]> => {
  const raw = await fetchAllPostsFromNotion();

  // Hydrate every post with its body blocks (needed for search + render).
  // Done in parallel; on a 26-post blog this is ~1 API request per post.
  const hydrated = await Promise.all(
    raw.map(async (p) => {
      const blocks = await fetchBlocksForPost(p.pageId);
      return rawToPost(p, blocks);
    }),
  );

  return hydrated;
});

function rawToPost(raw: RawPost, blocks: NotionBlock[]): Post {
  return {
    pageId: raw.pageId,
    title: raw.title,
    slug: raw.slug,
    isoDate: raw.isoDate,
    date: formatDate(raw.isoDate),
    category: raw.category,
    tags: [raw.category, ...raw.subTags],
    excerpt: raw.excerpt,
    content: blocksToPlainText(blocks),
    blocks,
    coverUrl: raw.coverUrl,
  };
}

// ─────────────────────────────────────────────────
// Public API — same shape as before, now async
// ─────────────────────────────────────────────────

export async function getAllPosts(): Promise<Post[]> {
  return getAllPostsHydrated();
}

export async function getPostBySlug(slug: string): Promise<Post | undefined> {
  const all = await getAllPostsHydrated();
  return all.find((p) => p.slug === slug);
}

export async function getFeaturedPosts(n = 3): Promise<Post[]> {
  const all = await getAllPostsHydrated();
  return all.slice(0, n);
}

export async function getAdjacentPosts(
  slug: string,
): Promise<{ prev: Post | null; next: Post | null }> {
  const posts = await getAllPostsHydrated();
  const idx = posts.findIndex((p) => p.slug === slug);
  if (idx === -1) return { prev: null, next: null };
  return {
    prev: idx > 0 ? posts[idx - 1] : null,
    next: idx < posts.length - 1 ? posts[idx + 1] : null,
  };
}

export async function getAllTags(): Promise<string[]> {
  const set = new Set<string>();
  const posts = await getAllPostsHydrated();
  posts.forEach((p) => p.tags.forEach((t) => set.add(t)));
  return Array.from(set).sort();
}

/**
 * Top N tags by post count.
 * Counts the primary `category` only (not sub-tags) — the filter row on
 * /writings should reflect the controlled vocabulary, not freeform sub-tags.
 */
export async function getTopTags(n = 8): Promise<string[]> {
  const counts = new Map<string, number>();
  const posts = await getAllPostsHydrated();
  posts.forEach((p) => {
    counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
  });
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([tag]) => tag);
}
