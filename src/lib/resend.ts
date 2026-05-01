import { Resend } from 'resend';
import { createHmac, timingSafeEqual } from 'crypto';

function he(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const resend = new Resend(process.env.RESEND_API_KEY);

export function generateUnsubToken(email: string): string {
  return createHmac('sha256', process.env.REVALIDATE_SECRET!)
    .update(email.toLowerCase())
    .digest('hex');
}

export function verifyUnsubToken(email: string, token: string): boolean {
  const expected = generateUnsubToken(email);
  if (token.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

export function buildSubscriberEmailHtml(
  title: string,
  excerpt: string,
  slug: string,
  subscriberEmail: string,
): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.d-island-girl.com';
  const token = generateUnsubToken(subscriberEmail);
  const unsubUrl = `${siteUrl}/api/unsubscribe?email=${encodeURIComponent(subscriberEmail)}&token=${token}`;
  return `
<div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;padding:32px 24px;background:#fdfaf6">
  <p style="font-family:system-ui,sans-serif;font-size:1rem;font-weight:600;color:#4a4a4a;margin:0 0 28px">
    Random <span style="color:#4f46e5">Musings</span>
  </p>
  <p style="font-family:system-ui,sans-serif;font-size:0.72rem;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;color:#4f46e5;margin:0 0 8px">New piece</p>
  <h1 style="font-size:1.5rem;margin:0 0 16px;line-height:1.25;font-weight:500"><em>${he(title)}</em></h1>
  <p style="color:#555;line-height:1.75;margin:0 0 28px;font-size:0.95rem">${he(excerpt)}</p>
  <a href="${siteUrl}/writings/${encodeURIComponent(slug)}"
     style="display:inline-block;background:#4f46e5;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-family:system-ui,sans-serif;font-size:0.875rem;font-weight:500">
    Read the full piece →
  </a>
  <hr style="border:none;border-top:1px solid #eee;margin:36px 0">
  <p style="font-family:system-ui,sans-serif;font-size:0.72rem;color:#aaa;text-align:center;margin:0">
    Written with honesty &amp; a large cup of chai ·
    <a href="${unsubUrl}" style="color:#aaa;text-decoration:underline">Unsubscribe</a>
  </p>
</div>`;
}

export function buildCommentNotificationHtml(
  postTitle: string,
  name: string,
  comment: string,
  notionUrl: string,
): string {
  return `
<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px">
  <p style="font-size:1rem;font-weight:600;color:#4a4a4a;margin:0 0 20px">
    Random <span style="color:#4f46e5">Musings</span>
  </p>
  <p style="margin:0 0 12px">New comment on <strong>${he(postTitle)}</strong>:</p>
  <div style="background:#f7f7f7;border-radius:6px;padding:16px 20px;margin:0 0 24px">
    <p style="margin:0 0 8px"><strong>Name:</strong> ${he(name)}</p>
    <p style="margin:0"><strong>Comment:</strong> ${he(comment)}</p>
  </div>
  <a href="${notionUrl}"
     style="display:inline-block;background:#4f46e5;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:0.875rem">
    Review in Notion →
  </a>
</div>`;
}
