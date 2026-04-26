/**
 * One-shot diagnostic: list every row in the Writings DB with its Status.
 * Run with: npx tsx scripts/diag-notion.ts
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { Client, isFullPage } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_TOKEN! });

async function main() {
  const res = await notion.databases.query({
    database_id: process.env.NOTION_DATABASE_ID!,
    page_size: 100,
  });

  console.log(`\n[diag] Rows visible to integration: ${res.results.length}\n`);

  for (const page of res.results) {
    if (!isFullPage(page)) continue;
    const props = page.properties;
    const title = props["Title"]?.type === "title"
      ? props["Title"].title.map((t) => t.plain_text).join("")
      : "(no title)";
    const status = props["Status"]?.type === "select"
      ? props["Status"].select?.name ?? "(none)"
      : "(none)";
    const slug = props["Slug"]?.type === "rich_text"
      ? props["Slug"].rich_text.map((t) => t.plain_text).join("")
      : "(none)";
    console.log(`  [${status.padEnd(10)}] ${slug.padEnd(40)} ${title}`);
  }

  console.log();
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
