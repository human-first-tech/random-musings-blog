import { NextRequest, NextResponse } from 'next/server';
import { resend } from '@/lib/resend';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const email: unknown = body?.email;

  if (typeof email !== 'string' || !EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ ok: false, error: 'Invalid email address.' }, { status: 400 });
  }

  const { error } = await resend.contacts.create({
    email,
    audienceId: process.env.RESEND_AUDIENCE_ID!,
    unsubscribed: false,
  });

  if (error) {
    console.error('[subscribe]', error);
    return NextResponse.json({ ok: false, error: 'Could not subscribe. Please try again.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
