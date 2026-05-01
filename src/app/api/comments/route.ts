import { NextRequest, NextResponse } from 'next/server';
import { sanitizeCommentInput, createPendingComment, getApprovedComments } from '@/lib/notion-comments';
import { resend, buildCommentNotificationHtml } from '@/lib/resend';

const SLUG_RE = /^[a-zA-Z0-9-]+$/;

const rateMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || entry.resetAt < now) {
    rateMap.set(ip, { count: 1, resetAt: now + 3_600_000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (body?.website) return NextResponse.json({ ok: true }); // honeypot

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ ok: false, error: 'Too many submissions. Try again later.' }, { status: 429 });
  }

  const name = typeof body?.name === 'string' ? sanitizeCommentInput(body.name, 80) : '';
  const comment = typeof body?.comment === 'string' ? sanitizeCommentInput(body.comment, 1000) : '';
  const slug = typeof body?.slug === 'string' ? body.slug.trim() : '';
  const postTitle = typeof body?.postTitle === 'string' ? body.postTitle.trim() : slug;

  if (!name) return NextResponse.json({ ok: false, error: 'Name is required.' }, { status: 400 });
  if (!comment) return NextResponse.json({ ok: false, error: 'Comment is required.' }, { status: 400 });
  if (!slug || !SLUG_RE.test(slug)) return NextResponse.json({ ok: false, error: 'Invalid post.' }, { status: 400 });

  try {
    await createPendingComment(name, comment, slug);
  } catch (err: unknown) {
    const isRateLimited =
      typeof err === 'object' && err !== null && 'code' in err && err.code === 'rate_limited';
    if (isRateLimited) {
      return NextResponse.json(
        { ok: false, error: 'The site is busy — please try again in a moment.' },
        { status: 503 },
      );
    }
    console.error('[comments] Failed to create comment in Notion:', err);
    return NextResponse.json(
      { ok: false, error: 'Could not save your comment. Please try again.' },
      { status: 500 },
    );
  }

  const notionUrl = `https://www.notion.so/${(process.env.NOTION_COMMENTS_DATABASE_ID ?? '').replace(/-/g, '')}`;
  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: process.env.DIMPY_EMAIL!,
      subject: `New comment on "${postTitle}"`,
      html: buildCommentNotificationHtml(postTitle, name, comment, notionUrl),
    });
  } catch (err) {
    console.error('[comments] Failed to send notification email:', err);
  }

  return NextResponse.json({ ok: true });
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  if (!slug || !SLUG_RE.test(slug)) {
    return NextResponse.json({ ok: false, error: 'Invalid or missing slug.' }, { status: 400 });
  }
  const comments = await getApprovedComments(slug);
  return NextResponse.json({ comments });
}
