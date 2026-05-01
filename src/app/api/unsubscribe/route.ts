import { NextRequest, NextResponse } from 'next/server';
import { resend, verifyUnsubToken } from '@/lib/resend';

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email');
  const token = request.nextUrl.searchParams.get('token');

  if (!email || !token || !verifyUnsubToken(email, token)) {
    return NextResponse.json({ ok: false, error: 'Invalid unsubscribe link.' }, { status: 400 });
  }

  const { data } = await resend.contacts.list({ audienceId: process.env.RESEND_AUDIENCE_ID! });
  const contact = (data as { data?: { id: string; email: string }[] })?.data?.find(
    (c) => c.email.toLowerCase() === email.toLowerCase(),
  );

  if (contact) {
    await resend.contacts.update({
      id: contact.id,
      audienceId: process.env.RESEND_AUDIENCE_ID!,
      unsubscribed: true,
    });
  }

  const html = `<!DOCTYPE html><html lang="en">
<head><meta charset="UTF-8"><title>Unsubscribed — Random Musings</title>
<style>body{font-family:system-ui,sans-serif;max-width:480px;margin:80px auto;padding:0 24px;text-align:center;color:#333}</style>
</head>
<body>
  <p style="font-size:1.1rem;font-weight:600;color:#4a4a4a;margin-bottom:20px">Random <span style="color:#4f46e5">Musings</span></p>
  <h1 style="font-size:1.5rem;margin-bottom:12px">You're unsubscribed.</h1>
  <p style="color:#666;line-height:1.7">No more emails from us. If you ever want back in, the subscribe box is always there.</p>
  <p style="margin-top:32px"><a href="https://www.d-island-girl.com" style="color:#4f46e5">Back to the blog →</a></p>
</body></html>`;

  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
