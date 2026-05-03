import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@notionhq/client';
import { getPostBySlug } from '@/lib/posts';
import { resend, buildSubscriberEmailHtml } from '@/lib/resend';

export async function POST(request: NextRequest) {
  const notion = new Client({ auth: process.env.NOTION_TOKEN });
  const secret = request.nextUrl.searchParams.get('secret');

  if (!process.env.REVALIDATE_SECRET || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
  }

  // Notion's webhook UI sends slug as a full property object; handle both formats.
  const body = await request.json().catch(() => null);
  console.log('[notify-subscribers] raw body:', JSON.stringify(body));
  const rawSlug = body?.slug;
  const slug: string | null =
    typeof rawSlug === 'string'
      ? rawSlug
      : rawSlug?.rich_text?.[0]?.plain_text ?? // Notion webhook format
        request.nextUrl.searchParams.get('slug');

  console.log('[notify-subscribers] resolved slug:', slug);

  if (!slug) {
    return NextResponse.json({ ok: false, error: 'Missing slug.' }, { status: 400 });
  }

  const post = await getPostBySlug(slug);
  if (!post) return NextResponse.json({ ok: false, error: 'Post not found.' }, { status: 404 });

  // Find the Writings page to check/set Notified.
  const queryRes = await notion.databases.query({
    database_id: process.env.NOTION_DATABASE_ID!,
    filter: { property: 'Slug', rich_text: { equals: slug } },
    page_size: 1,
  });

  const page = queryRes.results[0];
  if (!page) return NextResponse.json({ ok: false, error: 'Page not found.' }, { status: 404 });

  // Duplicate-send guard.
  const notifiedProp = 'properties' in page ? page.properties['Notified'] : null;
  if (notifiedProp?.type === 'checkbox' && notifiedProp.checkbox) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  // Fetch active subscribers.
  const { data: contactsData } = await resend.contacts.list({
    audienceId: process.env.RESEND_AUDIENCE_ID!,
  });
  const active = ((contactsData as { data?: { id: string; email: string; unsubscribed: boolean }[] })?.data ?? [])
    .filter((c) => !c.unsubscribed);

  // Send individual emails with per-subscriber unsubscribe links.
  await Promise.all(
    active.map((c) =>
      resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL!,
        to: c.email,
        subject: `New on Random Musings — ${post.title}`,
        html: buildSubscriberEmailHtml(post.title, post.excerpt, post.slug, c.email),
      }),
    ),
  );

  // Mark as notified — prevents duplicate sends on re-publish.
  await notion.pages.update({ page_id: page.id, properties: { Notified: { checkbox: true } } });

  return NextResponse.json({ ok: true, sent: true, count: active.length });
}
