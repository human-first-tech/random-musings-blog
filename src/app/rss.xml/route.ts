/**
 * RSS 2.0 feed for Random Musings.
 *
 * Notes:
 *   - Body is a plain-text excerpt (excerpt + first ~600 chars of content).
 *     Full Notion-block HTML rendering in RSS is possible but adds complexity
 *     and most readers handle plain text fine. Bump if needed.
 *   - Revalidates on the same cadence as the rest of the site.
 */

import { getAllPosts } from "@/lib/posts";

export const revalidate = 60;

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.d-island-girl.com";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const posts = await getAllPosts();

  const items = posts
    .map((p) => {
      const url = `${SITE_URL}/writings/${p.slug}`;
      const pubDate = new Date(`${p.isoDate}T00:00:00Z`).toUTCString();
      const description = `${p.excerpt}\n\n${p.content.slice(0, 600)}${
        p.content.length > 600 ? "…" : ""
      }`;
      return `
    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${pubDate}</pubDate>
      <category>${escapeXml(p.category)}</category>
      <description>${escapeXml(description)}</description>
    </item>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Random Musings</title>
    <link>${SITE_URL}</link>
    <description>An introvert's unfiltered take on life, people, books, food, and the beautiful chaos of figuring it all out — one essay at a time.</description>
    <language>en-us</language>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=60, s-maxage=60",
    },
  });
}
