/**
 * Revalidation webhook.
 *
 * POST /api/revalidate?secret=...&slug=optional-slug
 *
 * Behavior:
 *   - Validates the shared secret in `?secret=` against REVALIDATE_SECRET env.
 *   - Always revalidates `/` and `/writings` (the listing pages).
 *   - If `?slug=` is provided, also revalidates `/writings/<slug>`.
 *
 * Hooking it up:
 *   - In Notion, use a button automation on the Writings database that POSTs
 *     to this URL when Status flips to Published, passing the row's slug.
 *   - Alternatively, just hit the URL manually after publishing — no slug
 *     needed if you don't mind the listing pages refreshing first.
 *
 * Why a secret instead of an open endpoint:
 *   - Prevents anyone from spamming revalidations and racking up serverless
 *     invocations. Cost is trivial for a personal blog but hygiene matters.
 */

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  const slug = request.nextUrl.searchParams.get("slug");

  if (!process.env.REVALIDATE_SECRET) {
    return NextResponse.json(
      { ok: false, error: "Server misconfigured: REVALIDATE_SECRET not set" },
      { status: 500 },
    );
  }

  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json(
      { ok: false, error: "Invalid secret" },
      { status: 401 },
    );
  }

  // Always refresh the listings.
  revalidatePath("/");
  revalidatePath("/writings");
  revalidatePath("/rss.xml");
  revalidatePath("/sitemap.xml");

  // If a slug was passed, refresh that article page too.
  if (slug) {
    revalidatePath(`/writings/${slug}`);
  }

  return NextResponse.json({
    ok: true,
    revalidated: ["/", "/writings", "/rss.xml", "/sitemap.xml"]
      .concat(slug ? [`/writings/${slug}`] : []),
    timestamp: new Date().toISOString(),
  });
}

// Allow GET for easy manual testing in a browser.
export async function GET(request: NextRequest) {
  return POST(request);
}
