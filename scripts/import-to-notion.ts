/**
 * One-shot migration: import the 26 markdown posts in /content/posts into the
 * Notion `Writings` database.
 *
 * Usage:
 *   1. Set NOTION_TOKEN and NOTION_DATABASE_ID in .env.local
 *   2. (Optional) Set IMPORT_LIMIT=3 in .env.local to migrate only the first
 *      3 posts for the pilot. Unset for full backfill.
 *   3. (Optional) Set IMPORT_STATUS=Draft to import as drafts you can review
 *      in Notion before flipping to Published. Defaults to Published.
 *   4. npm run import:notion
 *
 * Idempotency:
 *   The script checks for an existing page with the same Slug before creating.
 *   Safe to re-run; it won't duplicate. Use IMPORT_OVERWRITE=true to update
 *   existing pages instead of skipping.
 */

import dotenv from "dotenv";
// Load .env.local first (Next.js convention for local secrets), .env as fallback.
dotenv.config({ path: ".env.local" });
dotenv.config();

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { Client, isFullPage } from "@notionhq/client";
import type {
  BlockObjectRequest,
  PageObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";

// ─────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;
const IMPORT_LIMIT = process.env.IMPORT_LIMIT
  ? parseInt(process.env.IMPORT_LIMIT, 10)
  : Infinity;
const IMPORT_STATUS = (process.env.IMPORT_STATUS ?? "Published") as
  | "Draft"
  | "Published"
  | "Scheduled";
const IMPORT_OVERWRITE = process.env.IMPORT_OVERWRITE === "true";

if (!NOTION_TOKEN || !NOTION_DATABASE_ID) {
  console.error(
    "Missing NOTION_TOKEN or NOTION_DATABASE_ID in environment. Add them to .env.local.",
  );
  process.exit(1);
}

const notion = new Client({ auth: NOTION_TOKEN });

// ─────────────────────────────────────────────────
// Tag → Category mapping (per docs/notion-schema.md §3)
// ─────────────────────────────────────────────────

const TAG_TO_CATEGORY: Record<string, string> = {
  // Self-growth
  mindset: "Self-growth",
  "self-growth": "Self-growth",
  growth: "Self-growth",
  identity: "Self-growth",
  "comfort zone": "Self-growth",

  // Mental health
  "mental health": "Mental health",
  healing: "Mental health",
  mindfulness: "Mental health",

  // Self
  self: "Self",
  "self-love": "Self",
  boundaries: "Self",
  imperfection: "Self",

  // Life & lifestyle
  life: "Life & lifestyle",
  lifestyle: "Life & lifestyle",
  minimalism: "Life & lifestyle",
  organizing: "Life & lifestyle",

  // People & relationships
  friendship: "People & relationships",
  women: "People & relationships",
  people: "People & relationships",

  // Books & poetry
  books: "Books & poetry",
  poetry: "Books & poetry",

  // Food
  food: "Food",
  cooking: "Food",

  // Perspective
  perspective: "Perspective",
  reflection: "Perspective",
  psychology: "Perspective",
  stories: "Perspective",

  // Pop culture
  "pop culture": "Pop culture",

  // Joy & inspiration
  joy: "Joy & inspiration",
  kindness: "Joy & inspiration",
  inspiration: "Joy & inspiration",
  environment: "Joy & inspiration",
};

function mapTagsToCategory(tags: string[]): {
  category: string;
  subTags: string[];
} {
  // Use the first matching tag as the primary category.
  for (const t of tags) {
    if (TAG_TO_CATEGORY[t]) {
      return {
        category: TAG_TO_CATEGORY[t],
        subTags: tags.filter((tt) => tt !== t),
      };
    }
  }
  // Fallback: bucket unmapped posts into Self-growth (manually fix in Notion).
  console.warn(
    `[migrate] No category mapping for tags ${JSON.stringify(tags)}. Defaulting to Self-growth.`,
  );
  return { category: "Self-growth", subTags: tags };
}

// ─────────────────────────────────────────────────
// Markdown → Notion blocks
// ─────────────────────────────────────────────────

/**
 * The original posts only use plain paragraphs and `**bold**` markdown.
 * We split on blank lines into paragraph blocks, parsing **bold** spans
 * into Notion rich_text annotations.
 */
function markdownToBlocks(md: string): BlockObjectRequest[] {
  const paragraphs = md
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return paragraphs.map((para) => {
    return {
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: parseInlineMarkdown(para),
      },
    } as BlockObjectRequest;
  });
}

function parseInlineMarkdown(text: string): Array<{
  type: "text";
  text: { content: string; link: { url: string } | null };
  annotations?: { bold?: boolean; italic?: boolean };
}> {
  // Simple **bold** parser. Splits text into runs of bold/non-bold.
  const out: Array<{
    type: "text";
    text: { content: string; link: { url: string } | null };
    annotations?: { bold?: boolean; italic?: boolean };
  }> = [];

  const re = /\*\*(.+?)\*\*/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIdx) {
      out.push({
        type: "text",
        text: { content: text.slice(lastIdx, match.index), link: null },
      });
    }
    out.push({
      type: "text",
      text: { content: match[1], link: null },
      annotations: { bold: true },
    });
    lastIdx = re.lastIndex;
  }

  if (lastIdx < text.length) {
    out.push({
      type: "text",
      text: { content: text.slice(lastIdx), link: null },
    });
  }

  return out.length
    ? out
    : [{ type: "text", text: { content: text, link: null } }];
}

// ─────────────────────────────────────────────────
// Notion page operations
// ─────────────────────────────────────────────────

async function findExistingPageBySlug(
  slug: string,
): Promise<PageObjectResponse | null> {
  const res = await notion.databases.query({
    database_id: NOTION_DATABASE_ID!,
    filter: { property: "Slug", rich_text: { equals: slug } },
    page_size: 1,
  });
  const page = res.results[0];
  if (page && isFullPage(page)) return page;
  return null;
}

async function createPage(post: {
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  subTags: string[];
  isoDate: string;
  blocks: BlockObjectRequest[];
}): Promise<string> {
  // Notion's API caps children per request to 100. Our posts are <50 paras
  // so we can include them inline.
  const res = await notion.pages.create({
    parent: { database_id: NOTION_DATABASE_ID! },
    properties: {
      Title: { title: [{ text: { content: post.title } }] },
      Slug: { rich_text: [{ text: { content: post.slug } }] },
      Excerpt: { rich_text: [{ text: { content: post.excerpt } }] },
      Category: { select: { name: post.category } },
      "Sub-tags": {
        multi_select: post.subTags.map((t) => ({ name: t })),
      },
      "Publish Date": { date: { start: post.isoDate } },
      Status: { select: { name: IMPORT_STATUS } },
    },
    children: post.blocks.slice(0, 100),
  });

  // Append remaining blocks if any.
  if (post.blocks.length > 100) {
    let idx = 100;
    while (idx < post.blocks.length) {
      await notion.blocks.children.append({
        block_id: res.id,
        children: post.blocks.slice(idx, idx + 100),
      });
      idx += 100;
    }
  }

  return res.id;
}

// ─────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────

async function main() {
  const postsDir = path.join(process.cwd(), "content/posts");
  if (!fs.existsSync(postsDir)) {
    console.error(`No content/posts directory found at ${postsDir}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(postsDir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .slice(0, IMPORT_LIMIT);

  console.log(
    `\n[migrate] Importing ${files.length} post(s) as ${IMPORT_STATUS}.`,
  );
  console.log(
    `[migrate] Overwrite mode: ${IMPORT_OVERWRITE ? "ON" : "OFF"}\n`,
  );

  let created = 0;
  let skipped = 0;
  let errored = 0;

  for (const filename of files) {
    const slug = filename.replace(/\.md$/, "");
    try {
      const raw = fs.readFileSync(path.join(postsDir, filename), "utf-8");
      const { data, content } = matter(raw);

      const title = String(data.title ?? "").trim();
      const excerpt = String(data.excerpt ?? "").trim();
      const tags = Array.isArray(data.tags) ? (data.tags as string[]) : [];
      const isoDate =
        data.date instanceof Date
          ? data.date.toISOString().slice(0, 10)
          : String(data.date ?? "").slice(0, 10);

      if (!title || !excerpt || !isoDate) {
        console.warn(`[skip] ${slug}: missing required frontmatter`);
        skipped++;
        continue;
      }

      const { category, subTags } = mapTagsToCategory(tags);
      const blocks = markdownToBlocks(content);

      const existing = await findExistingPageBySlug(slug);
      if (existing && !IMPORT_OVERWRITE) {
        console.log(`[skip] ${slug}: already exists in Notion`);
        skipped++;
        continue;
      }

      if (existing && IMPORT_OVERWRITE) {
        // Archive the old page; we'll create a fresh one. (Updating block
        // children in place is more complex than re-creating.)
        await notion.pages.update({
          page_id: existing.id,
          archived: true,
        });
        console.log(`[overwrite] ${slug}: archived old page`);
      }

      await createPage({
        title,
        slug,
        excerpt,
        category,
        subTags,
        isoDate,
        blocks,
      });

      console.log(`[ok]   ${slug} → "${title}" [${category}]`);
      created++;
    } catch (err) {
      console.error(`[err]  ${slug}: ${(err as Error).message}`);
      errored++;
    }
  }

  console.log(
    `\n[migrate] Done. Created: ${created}, Skipped: ${skipped}, Errored: ${errored}\n`,
  );
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
