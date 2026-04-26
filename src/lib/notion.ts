/**
 * Low-level Notion client wrapper.
 *
 * Exposes two memoized fetchers:
 *   - fetchAllPostsFromNotion(): returns Post[] for all rows with Status=Published
 *   - fetchBlocksForPost(pageId): returns the Notion blocks that make up an article body
 *
 * Memoization is per-request (React `cache`) — multiple components calling
 * getAllPosts() in a single render will only hit Notion once.
 *
 * Cross-request caching is handled at the Next.js page level via
 * `export const revalidate = N` plus on-demand revalidation from the webhook.
 */

import { Client, isFullPage, isFullBlock } from "@notionhq/client";
import type {
  PageObjectResponse,
  BlockObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";
import { cache } from "react";

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;

if (!NOTION_TOKEN) {
  throw new Error("Missing required env var: NOTION_TOKEN");
}
if (!NOTION_DATABASE_ID) {
  throw new Error("Missing required env var: NOTION_DATABASE_ID");
}

const notion = new Client({ auth: NOTION_TOKEN });

// ─────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────

export type RawPost = {
  pageId: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  subTags: string[];
  isoDate: string; // YYYY-MM-DD
  status: "Draft" | "Published" | "Scheduled";
  featured: boolean;
  coverUrl?: string;
};

export type NotionBlock = BlockObjectResponse;

// ─────────────────────────────────────────────────
// Property extractors — defensive, log + skip on bad data
// ─────────────────────────────────────────────────

function getTitle(page: PageObjectResponse): string {
  const prop = page.properties["Title"];
  if (prop?.type === "title") {
    return prop.title.map((t) => t.plain_text).join("").trim();
  }
  return "";
}

function getRichText(page: PageObjectResponse, propName: string): string {
  const prop = page.properties[propName];
  if (prop?.type === "rich_text") {
    return prop.rich_text.map((t) => t.plain_text).join("").trim();
  }
  return "";
}

function getSelect(page: PageObjectResponse, propName: string): string {
  const prop = page.properties[propName];
  if (prop?.type === "select" && prop.select) {
    return prop.select.name;
  }
  return "";
}

function getMultiSelect(page: PageObjectResponse, propName: string): string[] {
  const prop = page.properties[propName];
  if (prop?.type === "multi_select") {
    return prop.multi_select.map((opt) => opt.name);
  }
  return [];
}

function getDate(page: PageObjectResponse, propName: string): string {
  const prop = page.properties[propName];
  if (prop?.type === "date" && prop.date) {
    return prop.date.start; // YYYY-MM-DD
  }
  return "";
}

function getCheckbox(page: PageObjectResponse, propName: string): boolean {
  const prop = page.properties[propName];
  if (prop?.type === "checkbox") return prop.checkbox;
  return false;
}

function getCoverUrl(page: PageObjectResponse): string | undefined {
  const cover = page.cover;
  if (!cover) return undefined;
  if (cover.type === "external") return cover.external.url;
  if (cover.type === "file") return cover.file.url;
  return undefined;
}

function pageToRawPost(page: PageObjectResponse): RawPost | null {
  const slug = getRichText(page, "Slug");
  const title = getTitle(page);
  const excerpt = getRichText(page, "Excerpt");
  const category = getSelect(page, "Category");
  const isoDate = getDate(page, "Publish Date");
  const status = getSelect(page, "Status") as RawPost["status"];

  // Required fields gate. Skip + warn rather than crash the build.
  if (!slug || !title || !excerpt || !category || !isoDate) {
    console.warn(
      `[notion] Skipping page ${page.id}: missing required field(s).`,
      { slug, title: !!title, excerpt: !!excerpt, category, isoDate },
    );
    return null;
  }

  return {
    pageId: page.id,
    title,
    slug,
    excerpt,
    category,
    subTags: getMultiSelect(page, "Sub-tags"),
    isoDate,
    status: status || "Draft",
    featured: getCheckbox(page, "Featured"),
    coverUrl: getCoverUrl(page),
  };
}

// ─────────────────────────────────────────────────
// Fetchers (request-deduplicated via React cache)
// ─────────────────────────────────────────────────

/**
 * Fetch all Published posts from the Notion database, sorted newest-first.
 * Paginates through every page in the database.
 */
export const fetchAllPostsFromNotion = cache(async (): Promise<RawPost[]> => {
  const results: PageObjectResponse[] = [];
  let cursor: string | undefined = undefined;

  do {
    const res = await notion.databases.query({
      database_id: NOTION_DATABASE_ID!,
      filter: {
        property: "Status",
        select: { equals: "Published" },
      },
      sorts: [{ property: "Publish Date", direction: "descending" }],
      start_cursor: cursor,
      page_size: 100,
    });

    for (const page of res.results) {
      if (isFullPage(page)) results.push(page);
    }

    cursor = res.has_more ? res.next_cursor ?? undefined : undefined;
  } while (cursor);

  return results
    .map(pageToRawPost)
    .filter((p): p is RawPost => p !== null);
});

/**
 * Fetch the block tree for a single Notion page.
 * Recursively expands children for blocks that have them
 * (e.g. nested lists, callouts with body content).
 */
export const fetchBlocksForPost = cache(
  async (pageId: string): Promise<NotionBlock[]> => {
    return await fetchBlocksRecursive(pageId);
  },
);

async function fetchBlocksRecursive(blockId: string): Promise<NotionBlock[]> {
  const blocks: NotionBlock[] = [];
  let cursor: string | undefined = undefined;

  do {
    const res = await notion.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
      page_size: 100,
    });

    for (const block of res.results) {
      if (!isFullBlock(block)) continue;

      // Recurse into children for blocks that support them.
      if (block.has_children) {
        const children = await fetchBlocksRecursive(block.id);
        // Stash children on the block under a known key so the renderer can use them.
        // We use a non-conflicting field (`__children`) since the response type
        // doesn't include child arrays inline.
        (block as NotionBlock & { __children?: NotionBlock[] }).__children =
          children;
      }

      blocks.push(block);
    }

    cursor = res.has_more ? res.next_cursor ?? undefined : undefined;
  } while (cursor);

  return blocks;
}

/**
 * Plain-text representation of a block tree.
 * Used to populate Post.content for client-side search.
 */
export function blocksToPlainText(blocks: NotionBlock[]): string {
  const out: string[] = [];

  for (const block of blocks) {
    out.push(blockToPlainText(block));
    const children =
      (block as NotionBlock & { __children?: NotionBlock[] }).__children;
    if (children?.length) out.push(blocksToPlainText(children));
  }

  return out.filter(Boolean).join("\n");
}

function blockToPlainText(block: NotionBlock): string {
  switch (block.type) {
    case "paragraph":
      return block.paragraph.rich_text.map((t) => t.plain_text).join("");
    case "heading_1":
      return block.heading_1.rich_text.map((t) => t.plain_text).join("");
    case "heading_2":
      return block.heading_2.rich_text.map((t) => t.plain_text).join("");
    case "heading_3":
      return block.heading_3.rich_text.map((t) => t.plain_text).join("");
    case "quote":
      return block.quote.rich_text.map((t) => t.plain_text).join("");
    case "callout":
      return block.callout.rich_text.map((t) => t.plain_text).join("");
    case "bulleted_list_item":
      return block.bulleted_list_item.rich_text
        .map((t) => t.plain_text)
        .join("");
    case "numbered_list_item":
      return block.numbered_list_item.rich_text
        .map((t) => t.plain_text)
        .join("");
    case "code":
      return block.code.rich_text.map((t) => t.plain_text).join("");
    default:
      return "";
  }
}
