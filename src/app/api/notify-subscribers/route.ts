import { NextRequest, NextResponse } from 'next/server';
import { Client, isFullPage } from '@notionhq/client';
import { resend, buildSubscriberEmailHtml } from '@/lib/resend';

export async function POST(request: NextRequest) {
  const notion = new Client({ auth: process.env.NOTION_TOKEN });
  const secret = request.nextUrl.searchParams.get('secret');

  if (!process.env.REVALIDATE_SECRET || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
  }

  // Notion sends the Slug property as a rich_text object, not a plain string.
  // Handle both formats (plain string from curl tests + Notion webhook object).
  const body = await request.json().catch(() => null);
  const rawSlug = body?.slug ?? body?.Slug;
  const slug: string | null =
    typeof rawSlug === 'string'
      ? rawSlug
      : rawSlug?.rich_text?.[0]?.plain_text ??
        request.nextUrl.searchParams.get('slug');

  console.log('[notify] raw body:', JSON.stringify(body));
  console.log('[notify] slug:', slug);

  if (!slug) {
    return NextResponse.json({ ok: false, error: 'Missing slug.' }, { status: 400 });
  }

  // Query Notion directly for this one post.
  const queryRes = await notion.databases.query({
    database_id: process.env.NOTION_DATABASE_ID!,
    filter: { property: 'Slug', rich_text: { equals: slug } },
    page_size: 1,
  });

  console.log('[notify] pages found:', queryRes.results.length);

  const page = queryRes.results[0];
  if (!page || !isFullPage(page)) {
    console.log('[notify] post not found for slug:', slug);
    return NextResponse.json({ ok: false, error: 'Post not found.' }, { status: 404 });
  }

  // Duplicate-send guard.
  const notifiedProp = page.properties['Notified'];
  const alreadyNotified = notifiedProp?.type === 'checkbox' && notifiedProp.checkbox;
  console.log('[notify] already notified:', alreadyNotified);
  if (alreadyNotified) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  // Extract title and excerpt directly from the page properties.
  const titleProp = page.properties['Title'];
  const excerptProp = page.properties['Excerpt'];
  const title =
    titleProp?.type === 'title'
      ? titleProp.title.map((t) => t.plain_text).join('')
      : slug;
  const excerpt =
    excerptProp?.type === 'rich_text'
      ? excerptProp.rich_text.map((t) => t.plain_text).join('')
      : '';

  // Fetch active subscribers.
  const { data: contactsData } = await resend.contacts.list({
    audienceId: process.env.RESEND_AUDIENCE_ID!,
  });
  const active = (
    (contactsData as { data?: { id: string; email: string; unsubscribed: boolean }[] })?.data ?? []
  ).filter((c) => !c.unsubscribed);

  console.log('[notify] sending to', active.length, 'subscribers');

  // Send individual emails with per-subscriber unsubscribe links.
  await Promise.all(
    active.map((c) =>
      resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL!,
        to: c.email,
        subject: `New on Random Musings — ${title}`,
        html: buildSubscriberEmailHtml(title, excerpt, slug, c.email),
      }),
    ),
  );

  // Mark as notified — prevents duplicate sends on re-publish.
  await notion.pages.update({ page_id: page.id, properties: { Notified: { checkbox: true } } });

  console.log('[notify] done, sent:', active.length);
  return NextResponse.json({ ok: true, sent: true, count: active.length });
}
