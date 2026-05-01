# Comments & Subscriptions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add reader comments (Notion-backed, approval-gated) and live email subscriptions (Resend) to the Random Musings blog.

**Architecture:** Comments stored in a new Notion Comments DB; Dimpy approves by flipping Status (same as publishing posts). Subscriptions use Resend Audiences; `/api/notify-subscribers` (triggered by Notion automation) sends individual emails with HMAC-gated unsubscribe links and uses a `Notified` checkbox in the Writings DB to prevent duplicate sends.

**Tech stack:** Next.js 16 App Router, TypeScript, `resend` SDK (new), `@notionhq/client` (existing), Jest + ts-jest (new)

---

## Pre-flight: Manual setup (complete before writing any code)

- [ ] **Resend account + API key**
  - resend.com → sign up → API Keys → Create → Full access → save as `RESEND_API_KEY`

- [ ] **Verify d-island-girl.com domain in Resend**
  - Resend Dashboard → Domains → Add Domain → `d-island-girl.com`
  - Add DNS records shown to Namecheap → wait for verification
  - Unlocks sending from `hello@d-island-girl.com`

- [ ] **Create Resend Audience**
  - Resend Dashboard → Audiences → Create → name: "Random Musings"
  - Save Audience ID as `RESEND_AUDIENCE_ID`

- [ ] **Create Notion Comments database**
  - In Notion, open the Random Musings parent page → add full-page database named `Comments`
  - Add these properties (exact names, case-sensitive):
    - `Name` — Title
    - `Comment` — Text
    - `Post Slug` — Text
    - `Status` — Select: `Pending` · `Approved` · `Rejected`
    - `Submitted At` — Date
  - `•••` → Connections → Add `Random Musings Site` integration
  - Copy database ID from URL → save as `NOTION_COMMENTS_DATABASE_ID`

- [ ] **Add Notified checkbox to Writings DB**
  - Open Writings database → Add property: `Notified` — Checkbox

- [ ] **Update Notion integration permissions**
  - notion.so/my-integrations → `Random Musings Site` → Capabilities → enable **Update content** → Save

- [ ] **Populate `.env.local`**
  ```
  RESEND_API_KEY=re_...
  RESEND_AUDIENCE_ID=...
  RESEND_FROM_EMAIL=hello@d-island-girl.com
  DIMPY_EMAIL=dimpy@...
  NOTION_COMMENTS_DATABASE_ID=...
  ```

---

## Task 1: Install dependencies + set up Jest

**Files:** `package.json`, `jest.config.ts` (new)

- [ ] **Step 1: Install packages**
  ```bash
  npm install resend
  npm install --save-dev jest jest-environment-node @types/jest ts-jest
  ```

- [ ] **Step 2: Create `jest.config.ts`**
  ```typescript
  import type { Config } from 'jest';
  const config: Config = {
    testEnvironment: 'node',
    transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: { jsx: 'react-jsx' } }] },
    moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  };
  export default config;
  ```

- [ ] **Step 3: Add test script to `package.json`** — in the `scripts` block add:
  ```json
  "test": "jest"
  ```

- [ ] **Step 4: Verify Jest runs**
  ```bash
  npm test -- --passWithNoTests
  ```
  Expected: `Test Suites: 0 passed, 0 total`

- [ ] **Step 5: Commit**
  ```bash
  git add package.json package-lock.json jest.config.ts
  git commit -m "chore: add resend sdk + jest test setup"
  ```

---

## Task 2: Resend client helper

**Files:** `src/lib/resend.ts` (new), `src/lib/__tests__/resend.test.ts` (new)

- [ ] **Step 1: Write the failing test** — create `src/lib/__tests__/resend.test.ts`:
  ```typescript
  import { generateUnsubToken, verifyUnsubToken } from '../resend';

  describe('unsubscribe token', () => {
    const orig = process.env;
    beforeEach(() => { process.env = { ...orig, REVALIDATE_SECRET: 'test-secret' }; });
    afterEach(() => { process.env = orig; });

    it('generates a consistent token for the same email', () => {
      expect(generateUnsubToken('a@b.com')).toBe(generateUnsubToken('a@b.com'));
    });
    it('generates different tokens for different emails', () => {
      expect(generateUnsubToken('a@b.com')).not.toBe(generateUnsubToken('c@d.com'));
    });
    it('verifies a valid token', () => {
      expect(verifyUnsubToken('a@b.com', generateUnsubToken('a@b.com'))).toBe(true);
    });
    it('rejects an invalid token', () => {
      expect(verifyUnsubToken('a@b.com', 'bad')).toBe(false);
    });
  });
  ```

- [ ] **Step 2: Run test — confirm FAIL**
  ```bash
  npm test -- src/lib/__tests__/resend.test.ts
  ```
  Expected: FAIL — `Cannot find module '../resend'`

- [ ] **Step 3: Create `src/lib/resend.ts`**
  ```typescript
  import { Resend } from 'resend';
  import { createHmac } from 'crypto';

  export const resend = new Resend(process.env.RESEND_API_KEY);

  export function generateUnsubToken(email: string): string {
    return createHmac('sha256', process.env.REVALIDATE_SECRET!)
      .update(email.toLowerCase())
      .digest('hex');
  }

  export function verifyUnsubToken(email: string, token: string): boolean {
    return token === generateUnsubToken(email);
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
    <h1 style="font-size:1.5rem;margin:0 0 16px;line-height:1.25;font-weight:500"><em>${title}</em></h1>
    <p style="color:#555;line-height:1.75;margin:0 0 28px;font-size:0.95rem">${excerpt}</p>
    <a href="${siteUrl}/writings/${slug}"
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
    <p style="margin:0 0 12px">New comment on <strong>${postTitle}</strong>:</p>
    <div style="background:#f7f7f7;border-radius:6px;padding:16px 20px;margin:0 0 24px">
      <p style="margin:0 0 8px"><strong>Name:</strong> ${name}</p>
      <p style="margin:0"><strong>Comment:</strong> ${comment}</p>
    </div>
    <a href="${notionUrl}"
       style="display:inline-block;background:#4f46e5;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:0.875rem">
      Review in Notion →
    </a>
  </div>`;
  }
  ```

- [ ] **Step 4: Run test — confirm PASS**
  ```bash
  npm test -- src/lib/__tests__/resend.test.ts
  ```
  Expected: PASS — 4 tests

- [ ] **Step 5: Commit**
  ```bash
  git add src/lib/resend.ts src/lib/__tests__/resend.test.ts
  git commit -m "feat: add resend client + unsubscribe token helpers"
  ```

---

## Task 3: Notion comments helper

**Files:** `src/lib/notion-comments.ts` (new), `src/lib/__tests__/notion-comments.test.ts` (new)

- [ ] **Step 1: Write the failing test** — create `src/lib/__tests__/notion-comments.test.ts`:
  ```typescript
  import { sanitizeCommentInput } from '../notion-comments';

  describe('sanitizeCommentInput', () => {
    it('strips HTML tags', () => {
      expect(sanitizeCommentInput('<b>hello</b>')).toBe('hello');
    });
    it('trims whitespace', () => {
      expect(sanitizeCommentInput('  hi  ')).toBe('hi');
    });
    it('truncates to maxLen', () => {
      expect(sanitizeCommentInput('a'.repeat(200), 100)).toHaveLength(100);
    });
    it('passes clean input unchanged', () => {
      expect(sanitizeCommentInput('Hello world')).toBe('Hello world');
    });
  });
  ```

- [ ] **Step 2: Run test — confirm FAIL**
  ```bash
  npm test -- src/lib/__tests__/notion-comments.test.ts
  ```

- [ ] **Step 3: Create `src/lib/notion-comments.ts`**
  ```typescript
  import { Client } from '@notionhq/client';
  import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';

  const notion = new Client({ auth: process.env.NOTION_TOKEN });
  const DB = () => process.env.NOTION_COMMENTS_DATABASE_ID!;

  export type Comment = { name: string; comment: string; submittedAt: string };

  export function sanitizeCommentInput(str: string, maxLen = 1000): string {
    return str.replace(/<[^>]*>/g, '').trim().slice(0, maxLen);
  }

  export async function createPendingComment(
    name: string,
    comment: string,
    slug: string,
  ): Promise<void> {
    await notion.pages.create({
      parent: { database_id: DB() },
      properties: {
        Name: { title: [{ text: { content: name } }] },
        Comment: { rich_text: [{ text: { content: comment } }] },
        'Post Slug': { rich_text: [{ text: { content: slug } }] },
        Status: { select: { name: 'Pending' } },
        'Submitted At': { date: { start: new Date().toISOString().split('T')[0] } },
      },
    });
  }

  export async function getApprovedComments(slug: string): Promise<Comment[]> {
    const res = await notion.databases.query({
      database_id: DB(),
      filter: {
        and: [
          { property: 'Post Slug', rich_text: { equals: slug } },
          { property: 'Status', select: { equals: 'Approved' } },
        ],
      },
      sorts: [{ property: 'Submitted At', direction: 'ascending' }],
    });

    return res.results
      .filter((p): p is PageObjectResponse => 'properties' in p)
      .map((p) => {
        const name =
          p.properties['Name']?.type === 'title'
            ? p.properties['Name'].title.map((t) => t.plain_text).join('')
            : '';
        const comment =
          p.properties['Comment']?.type === 'rich_text'
            ? p.properties['Comment'].rich_text.map((t) => t.plain_text).join('')
            : '';
        const submittedAt =
          p.properties['Submitted At']?.type === 'date' && p.properties['Submitted At'].date
            ? p.properties['Submitted At'].date.start
            : '';
        return { name, comment, submittedAt };
      });
  }
  ```

- [ ] **Step 4: Run test — confirm PASS**
  ```bash
  npm test -- src/lib/__tests__/notion-comments.test.ts
  ```
  Expected: PASS — 4 tests

- [ ] **Step 5: Commit**
  ```bash
  git add src/lib/notion-comments.ts src/lib/__tests__/notion-comments.test.ts
  git commit -m "feat: add notion-comments helpers"
  ```

---

## Task 4: POST /api/subscribe

**Files:** `src/app/api/subscribe/route.ts` (new), `src/app/api/subscribe/__tests__/route.test.ts` (new)

- [ ] **Step 1: Write the failing test** — create `src/app/api/subscribe/__tests__/route.test.ts`:
  ```typescript
  import { NextRequest } from 'next/server';

  jest.mock('@/lib/resend', () => ({
    resend: {
      contacts: {
        create: jest.fn().mockResolvedValue({ data: { id: 'abc' }, error: null }),
      },
    },
  }));

  import { POST } from '../route';

  const make = (body: unknown) =>
    new NextRequest('http://localhost/api/subscribe', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });

  describe('POST /api/subscribe', () => {
    it('returns 200 for valid email', async () => {
      const res = await POST(make({ email: 'reader@example.com' }));
      expect(res.status).toBe(200);
      expect((await res.json()).ok).toBe(true);
    });
    it('returns 400 for missing email', async () => {
      expect((await POST(make({}))).status).toBe(400);
    });
    it('returns 400 for invalid email format', async () => {
      expect((await POST(make({ email: 'not-an-email' }))).status).toBe(400);
    });
    it('returns 400 for email over 254 chars', async () => {
      expect((await POST(make({ email: 'a'.repeat(250) + '@b.com' }))).status).toBe(400);
    });
  });
  ```

- [ ] **Step 2: Run test — confirm FAIL**
  ```bash
  npm test -- src/app/api/subscribe/__tests__/route.test.ts
  ```

- [ ] **Step 3: Create `src/app/api/subscribe/route.ts`**
  ```typescript
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
  ```

- [ ] **Step 4: Run test — confirm PASS**
  ```bash
  npm test -- src/app/api/subscribe/__tests__/route.test.ts
  ```
  Expected: PASS — 4 tests

- [ ] **Step 5: Commit**
  ```bash
  git add src/app/api/subscribe/route.ts src/app/api/subscribe/__tests__/route.test.ts
  git commit -m "feat: add POST /api/subscribe"
  ```

---

## Task 5: GET /api/unsubscribe

**Files:** `src/app/api/unsubscribe/route.ts` (new), `src/app/api/unsubscribe/__tests__/route.test.ts` (new)

- [ ] **Step 1: Write the failing test** — create `src/app/api/unsubscribe/__tests__/route.test.ts`:
  ```typescript
  process.env.REVALIDATE_SECRET = 'test-secret';
  process.env.RESEND_AUDIENCE_ID = 'aud-abc';

  jest.mock('@/lib/resend', () => {
    const actual = jest.requireActual('@/lib/resend');
    return {
      ...actual,
      resend: {
        contacts: {
          list: jest.fn().mockResolvedValue({
            data: { data: [{ id: 'c1', email: 'reader@example.com', unsubscribed: false }] },
          }),
          update: jest.fn().mockResolvedValue({ data: {} }),
        },
      },
    };
  });

  import { NextRequest } from 'next/server';
  import { generateUnsubToken } from '@/lib/resend';
  import { GET } from '../route';

  const make = (email: string, token: string) =>
    new NextRequest(`http://localhost/api/unsubscribe?email=${encodeURIComponent(email)}&token=${token}`);

  describe('GET /api/unsubscribe', () => {
    it('returns 200 HTML with valid token', async () => {
      const email = 'reader@example.com';
      const res = await GET(make(email, generateUnsubToken(email)));
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/html');
    });
    it('returns 400 with invalid token', async () => {
      expect((await GET(make('reader@example.com', 'bad'))).status).toBe(400);
    });
    it('returns 400 with missing params', async () => {
      expect((await GET(new NextRequest('http://localhost/api/unsubscribe'))).status).toBe(400);
    });
  });
  ```

- [ ] **Step 2: Run test — confirm FAIL**
  ```bash
  npm test -- src/app/api/unsubscribe/__tests__/route.test.ts
  ```

- [ ] **Step 3: Create `src/app/api/unsubscribe/route.ts`**
  ```typescript
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
  ```

- [ ] **Step 4: Run test — confirm PASS**
  ```bash
  npm test -- src/app/api/unsubscribe/__tests__/route.test.ts
  ```
  Expected: PASS — 3 tests

- [ ] **Step 5: Commit**
  ```bash
  git add src/app/api/unsubscribe/route.ts src/app/api/unsubscribe/__tests__/route.test.ts
  git commit -m "feat: add GET /api/unsubscribe — HMAC-token-gated"
  ```

---

## Task 6: Update SubscribeSection.tsx

**Files:** `src/components/SubscribeSection.tsx` (modify)

- [ ] **Step 1: Replace the placeholder block**

  In `src/components/SubscribeSection.tsx`, delete the comment block (lines starting `// ───────────────────────────────────────────────` through the closing `// ───────────────────────────────────────────────`) and replace the entire `handleSubmit` function with:

  ```typescript
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === 'submitting') return;
    setStatus('submitting');
    setErrorMsg(null);

    const res = await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await res.json().catch(() => ({ ok: false }));

    if (!res.ok || !data.ok) {
      setStatus('error');
      setErrorMsg(data.error ?? 'Something went wrong — please try again.');
    } else {
      setStatus('success');
    }
  }
  ```

- [ ] **Step 2: Commit**
  ```bash
  git add src/components/SubscribeSection.tsx
  git commit -m "feat: wire SubscribeSection to POST /api/subscribe"
  ```

---

## Task 7: POST + GET /api/comments

**Files:** `src/app/api/comments/route.ts` (new), `src/app/api/comments/__tests__/route.test.ts` (new)

- [ ] **Step 1: Write the failing test** — create `src/app/api/comments/__tests__/route.test.ts`:
  ```typescript
  import { NextRequest } from 'next/server';

  jest.mock('@/lib/notion-comments', () => ({
    sanitizeCommentInput: jest.requireActual('@/lib/notion-comments').sanitizeCommentInput,
    createPendingComment: jest.fn().mockResolvedValue(undefined),
    getApprovedComments: jest.fn().mockResolvedValue([
      { name: 'Alice', comment: 'Great!', submittedAt: '2024-01-01' },
    ]),
  }));

  jest.mock('@/lib/resend', () => ({
    resend: { emails: { send: jest.fn().mockResolvedValue({ data: {}, error: null }) } },
    buildCommentNotificationHtml: jest.fn().mockReturnValue('<html>test</html>'),
  }));

  import { POST, GET } from '../route';

  const makePost = (body: unknown, ip = '1.2.3.4') =>
    new NextRequest('http://localhost/api/comments', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
    });

  const validBody = { name: 'Alice', comment: 'Love this.', slug: 'oh-no-not-again', postTitle: 'Oh No' };

  describe('POST /api/comments', () => {
    it('returns 200 for valid input', async () => {
      const res = await POST(makePost(validBody));
      expect(res.status).toBe(200);
      expect((await res.json()).ok).toBe(true);
    });
    it('returns 400 when name is missing', async () => {
      expect((await POST(makePost({ ...validBody, name: '' }))).status).toBe(400);
    });
    it('returns 400 when slug has invalid chars', async () => {
      expect((await POST(makePost({ ...validBody, slug: 'Bad Slug!' }))).status).toBe(400);
    });
    it('silently accepts honeypot submissions', async () => {
      const res = await POST(makePost({ ...validBody, website: 'http://spam.com' }));
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/comments', () => {
    it('returns approved comments for a slug', async () => {
      const res = await GET(new NextRequest('http://localhost/api/comments?slug=oh-no-not-again'));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.comments[0].name).toBe('Alice');
    });
    it('returns 400 when slug is missing', async () => {
      expect((await GET(new NextRequest('http://localhost/api/comments'))).status).toBe(400);
    });
  });
  ```

- [ ] **Step 2: Run test — confirm FAIL**
  ```bash
  npm test -- src/app/api/comments/__tests__/route.test.ts
  ```

- [ ] **Step 3: Create `src/app/api/comments/route.ts`**
  ```typescript
  import { NextRequest, NextResponse } from 'next/server';
  import { sanitizeCommentInput, createPendingComment, getApprovedComments } from '@/lib/notion-comments';
  import { resend, buildCommentNotificationHtml } from '@/lib/resend';

  const SLUG_RE = /^[a-z0-9-]+$/;

  const rateMap = new Map<string, { count: number; resetAt: number }>();

  function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const entry = rateMap.get(ip);
    if (!entry || entry.resetAt < now) {
      rateMap.set(ip, { count: 1, resetAt: now + 3_600_000 });
      return true;
    }
    if (entry.count >= 3) return false;
    entry.count++;
    return true;
  }

  export async function POST(request: NextRequest) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ ok: false, error: 'Too many submissions. Try again later.' }, { status: 429 });
    }

    const body = await request.json().catch(() => null);
    if (body?.website) return NextResponse.json({ ok: true }); // honeypot

    const name = typeof body?.name === 'string' ? sanitizeCommentInput(body.name, 80) : '';
    const comment = typeof body?.comment === 'string' ? sanitizeCommentInput(body.comment, 1000) : '';
    const slug = typeof body?.slug === 'string' ? body.slug.trim() : '';
    const postTitle = typeof body?.postTitle === 'string' ? body.postTitle.trim() : slug;

    if (!name) return NextResponse.json({ ok: false, error: 'Name is required.' }, { status: 400 });
    if (!comment) return NextResponse.json({ ok: false, error: 'Comment is required.' }, { status: 400 });
    if (!slug || !SLUG_RE.test(slug)) return NextResponse.json({ ok: false, error: 'Invalid post.' }, { status: 400 });

    await createPendingComment(name, comment, slug);

    const notionUrl = `https://www.notion.so/${(process.env.NOTION_COMMENTS_DATABASE_ID ?? '').replace(/-/g, '')}`;
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: process.env.DIMPY_EMAIL!,
      subject: `New comment on "${postTitle}"`,
      html: buildCommentNotificationHtml(postTitle, name, comment, notionUrl),
    });

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
  ```

- [ ] **Step 4: Run test — confirm PASS**
  ```bash
  npm test -- src/app/api/comments/__tests__/route.test.ts
  ```
  Expected: PASS — 6 tests

- [ ] **Step 5: Commit**
  ```bash
  git add src/app/api/comments/route.ts src/app/api/comments/__tests__/route.test.ts
  git commit -m "feat: add GET+POST /api/comments"
  ```

---

## Task 8: CommentsSection component

**Files:** `src/components/CommentsSection.tsx` (new)

- [ ] **Step 1: Create `src/components/CommentsSection.tsx`**
  ```typescript
  "use client";

  import { useEffect, useRef, useState } from "react";

  type Comment = { name: string; comment: string; submittedAt: string };
  type Status = "idle" | "submitting" | "success" | "error";

  export function CommentsSection({ slug, postTitle }: { slug: string; postTitle: string }) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [name, setName] = useState("");
    const [comment, setComment] = useState("");
    const [status, setStatus] = useState<Status>("idle");
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const honeypotRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      fetch(`/api/comments?slug=${encodeURIComponent(slug)}`)
        .then((r) => r.json())
        .then((d) => setComments(d.comments ?? []))
        .catch(() => {});
    }, [slug]);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
      e.preventDefault();
      if (status === "submitting") return;
      setStatus("submitting");
      setErrorMsg(null);

      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          comment,
          slug,
          postTitle,
          website: honeypotRef.current?.value ?? "",
        }),
      });

      const data = await res.json().catch(() => ({ ok: false }));
      if (!res.ok || !data.ok) {
        setStatus("error");
        setErrorMsg(data.error ?? "Something went wrong — please try again.");
      } else {
        setStatus("success");
        setName("");
        setComment("");
      }
    }

    return (
      <section className="mt-16 border-t border-rule pt-12">
        <h2 className="mb-8 font-sans text-[0.75rem] font-medium uppercase tracking-[0.15em] text-ink-light">
          Thoughts &amp; reflections
        </h2>

        {comments.length === 0 ? (
          <p className="mb-10 text-[0.9rem] font-light italic text-ink-light">
            Be the first to leave a thought.
          </p>
        ) : (
          <ul className="mb-12 space-y-6">
            {comments.map((c, i) => (
              <li key={i} className="border-b border-rule pb-6 last:border-0">
                <div className="mb-1.5 flex items-center gap-3">
                  <span className="font-sans text-[0.85rem] font-medium text-ink">{c.name}</span>
                  <span className="text-[0.72rem] text-ink-light">{c.submittedAt}</span>
                </div>
                <p className="text-[0.92rem] font-light leading-[1.75] text-ink-mid">{c.comment}</p>
              </li>
            ))}
          </ul>
        )}

        {status === "success" ? (
          <div className="rounded-[6px] border border-rule bg-card px-6 py-5">
            <p className="mb-1 font-serif text-[1rem] text-ink">Your comment is in — thank you!</p>
            <p className="text-[0.83rem] font-light text-ink-light">It will appear once approved.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <input
              ref={honeypotRef}
              name="website"
              type="text"
              tabIndex={-1}
              aria-hidden
              className="absolute opacity-0 pointer-events-none"
              autoComplete="off"
            />
            <div>
              <label
                htmlFor="comment-name"
                className="mb-1.5 block font-sans text-[0.72rem] font-medium uppercase tracking-[0.1em] text-ink-light"
              >
                Name
              </label>
              <input
                id="comment-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={80}
                placeholder="Your name"
                className="w-full max-w-[320px] rounded-[6px] border border-rule bg-card px-4 py-2.5 font-sans text-[0.875rem] text-ink outline-none transition-colors placeholder:text-ink-light focus:border-accent"
              />
            </div>
            <div>
              <label
                htmlFor="comment-body"
                className="mb-1.5 block font-sans text-[0.72rem] font-medium uppercase tracking-[0.1em] text-ink-light"
              >
                Comment
              </label>
              <textarea
                id="comment-body"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                required
                maxLength={1000}
                rows={4}
                placeholder="What did this piece make you feel?"
                className="w-full rounded-[6px] border border-rule bg-card px-4 py-3 font-sans text-[0.875rem] text-ink outline-none transition-colors placeholder:text-ink-light focus:border-accent"
              />
            </div>
            {errorMsg && <p role="alert" className="text-[0.8rem] text-accent">{errorMsg}</p>}
            <button
              type="submit"
              disabled={status === "submitting"}
              className="rounded-[6px] bg-accent px-6 py-2.5 font-sans text-[0.875rem] font-medium text-white transition-opacity hover:opacity-85 disabled:opacity-60"
            >
              {status === "submitting" ? "Posting…" : "Post comment →"}
            </button>
          </form>
        )}
      </section>
    );
  }
  ```

- [ ] **Step 2: Commit**
  ```bash
  git add src/components/CommentsSection.tsx
  git commit -m "feat: add CommentsSection component"
  ```

---

## Task 9: Wire CommentsSection into article page

**Files:** `src/app/writings/[slug]/page.tsx` (modify)

- [ ] **Step 1: Add import** — add after the existing imports in `src/app/writings/[slug]/page.tsx`:
  ```typescript
  import { CommentsSection } from "@/components/CommentsSection";
  ```

- [ ] **Step 2: Add component** — in `ArticlePage`, between `<NotionRenderer blocks={post.blocks} />` and `<ArticleNav prev={prev} next={next} />`, add:
  ```tsx
  <CommentsSection slug={post.slug} postTitle={post.title} />
  ```

- [ ] **Step 3: Start dev server + verify manually**
  ```bash
  npm run dev
  ```
  Open http://localhost:3000/writings/oh-no-not-again
  - Confirm "Thoughts & reflections" section appears below article body
  - Confirm "Be the first to leave a thought." shows when no approved comments
  - Submit name + comment → success state appears
  - Check Notion Comments DB → row appears with Status = Pending
  - Check Dimpy's email inbox → notification email received

- [ ] **Step 4: Commit**
  ```bash
  git add src/app/writings/[slug]/page.tsx
  git commit -m "feat: add CommentsSection to article pages"
  ```

---

## Task 10: POST /api/notify-subscribers

**Files:** `src/app/api/notify-subscribers/route.ts` (new), `src/app/api/notify-subscribers/__tests__/route.test.ts` (new)

- [ ] **Step 1: Write the failing test** — create `src/app/api/notify-subscribers/__tests__/route.test.ts`:
  ```typescript
  process.env.REVALIDATE_SECRET = 'test-secret';
  process.env.RESEND_AUDIENCE_ID = 'aud-abc';
  process.env.RESEND_FROM_EMAIL = 'hello@d-island-girl.com';
  process.env.NOTION_DATABASE_ID = 'db-abc';

  const mockUpdate = jest.fn().mockResolvedValue({});
  jest.mock('@notionhq/client', () => ({
    Client: jest.fn().mockImplementation(() => ({
      databases: {
        query: jest.fn().mockResolvedValue({
          results: [{ id: 'page-abc', properties: { Notified: { type: 'checkbox', checkbox: false } } }],
        }),
      },
      pages: { update: mockUpdate },
    })),
  }));

  jest.mock('@/lib/posts', () => ({
    getPostBySlug: jest.fn().mockResolvedValue({
      title: 'Test Post', excerpt: 'An excerpt.', slug: 'test-post', isoDate: '2024-01-01',
    }),
  }));

  const mockSend = jest.fn().mockResolvedValue({ data: {}, error: null });
  jest.mock('@/lib/resend', () => ({
    resend: {
      contacts: {
        list: jest.fn().mockResolvedValue({
          data: { data: [
            { id: 'c1', email: 'reader@example.com', unsubscribed: false },
            { id: 'c2', email: 'gone@example.com', unsubscribed: true },
          ]},
        }),
      },
      emails: { send: mockSend },
    },
    buildSubscriberEmailHtml: jest.fn().mockReturnValue('<html>test</html>'),
  }));

  import { NextRequest } from 'next/server';
  import { POST } from '../route';

  const make = (secret: string, slug: string) =>
    new NextRequest(`http://localhost/api/notify-subscribers?secret=${secret}&slug=${slug}`, { method: 'POST' });

  describe('POST /api/notify-subscribers', () => {
    beforeEach(() => mockSend.mockClear());

    it('returns 401 for wrong secret', async () => {
      expect((await POST(make('wrong', 'test-post'))).status).toBe(401);
    });

    it('returns 404 when post not found', async () => {
      const { getPostBySlug } = jest.requireMock('@/lib/posts');
      getPostBySlug.mockResolvedValueOnce(undefined);
      expect((await POST(make('test-secret', 'missing'))).status).toBe(404);
    });

    it('sends only to unsubscribed=false contacts', async () => {
      const res = await POST(make('test-secret', 'test-post'));
      expect(res.status).toBe(200);
      expect((await res.json()).sent).toBe(true);
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend.mock.calls[0][0].to).toBe('reader@example.com');
    });

    it('skips when Notified is already true', async () => {
      const { Client } = jest.requireMock('@notionhq/client');
      Client.mockImplementationOnce(() => ({
        databases: {
          query: jest.fn().mockResolvedValue({
            results: [{ id: 'page-abc', properties: { Notified: { type: 'checkbox', checkbox: true } } }],
          }),
        },
        pages: { update: mockUpdate },
      }));
      const res = await POST(make('test-secret', 'test-post'));
      expect((await res.json()).skipped).toBe(true);
      expect(mockSend).not.toHaveBeenCalled();
    });
  });
  ```

- [ ] **Step 2: Run test — confirm FAIL**
  ```bash
  npm test -- src/app/api/notify-subscribers/__tests__/route.test.ts
  ```

- [ ] **Step 3: Create `src/app/api/notify-subscribers/route.ts`**
  ```typescript
  import { NextRequest, NextResponse } from 'next/server';
  import { Client } from '@notionhq/client';
  import { getPostBySlug } from '@/lib/posts';
  import { resend, buildSubscriberEmailHtml } from '@/lib/resend';

  const notion = new Client({ auth: process.env.NOTION_TOKEN });

  export async function POST(request: NextRequest) {
    const secret = request.nextUrl.searchParams.get('secret');
    const slug = request.nextUrl.searchParams.get('slug');

    if (!process.env.REVALIDATE_SECRET || secret !== process.env.REVALIDATE_SECRET) {
      return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
    }
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
  ```

- [ ] **Step 4: Run test — confirm PASS**
  ```bash
  npm test -- src/app/api/notify-subscribers/__tests__/route.test.ts
  ```
  Expected: PASS — 4 tests

- [ ] **Step 5: Commit**
  ```bash
  git add src/app/api/notify-subscribers/route.ts src/app/api/notify-subscribers/__tests__/route.test.ts
  git commit -m "feat: add POST /api/notify-subscribers with duplicate-send guard"
  ```

---

## Task 11: Update .env.example + CLAUDE.md

**Files:** `.env.example`, `CLAUDE.md`

- [ ] **Step 1: Add to `.env.example`** — append after the existing `NEXT_PUBLIC_SITE_URL` block:
  ```
  # ─────────────────────────────────────────────────
  # Comments (Notion-backed, approval-gated)
  # ─────────────────────────────────────────────────

  # 32-char ID of the Notion Comments database
  NOTION_COMMENTS_DATABASE_ID=

  # Email that receives new comment notifications (Dimpy)
  DIMPY_EMAIL=

  # ─────────────────────────────────────────────────
  # Resend (subscriptions + comment notifications)
  # ─────────────────────────────────────────────────

  RESEND_API_KEY=re_...
  RESEND_AUDIENCE_ID=
  RESEND_FROM_EMAIL=hello@d-island-girl.com
  ```

- [ ] **Step 2: Update CLAUDE.md open items** — in the `### ⏳ Open items` section:
  - Mark item 3 (subscribe backend) done: change to `3. ✅ Subscribe backend wired — Resend Audiences. See POST /api/subscribe, GET /api/unsubscribe, POST /api/notify-subscribers.`
  - Add new item: `6. **Wire the notify-subscribers Notion automation** — in Writings DB, trigger: Status → Published, action: POST https://www.d-island-girl.com/api/notify-subscribers?secret=<REVALIDATE_SECRET>&slug={Slug}. Separate from the revalidation automation.`
  - Add new item: `7. **Set Resend + comments env vars in Vercel** — RESEND_API_KEY, RESEND_AUDIENCE_ID, RESEND_FROM_EMAIL, DIMPY_EMAIL, NOTION_COMMENTS_DATABASE_ID.`

- [ ] **Step 3: Commit**
  ```bash
  git add .env.example CLAUDE.md
  git commit -m "docs: update env.example + CLAUDE.md for comments + subscriptions"
  ```

---

## Task 12: Full test suite + smoke tests

- [ ] **Step 1: Run all tests**
  ```bash
  npm test
  ```
  Expected: ~17 tests across 5 suites, all passing.

- [ ] **Step 2: Subscribe smoke test**
  - `npm run dev`
  - Open http://localhost:3000 → scroll to subscribe section
  - Enter a real email → Submit → success message appears
  - Check Resend Dashboard → Audiences → contact added

- [ ] **Step 3: Comment smoke test**
  - Open http://localhost:3000/writings/oh-no-not-again
  - Submit name + comment → success message
  - Check Notion Comments DB → row with Status = Pending
  - Check Dimpy's email inbox → notification received
  - Flip Status → Approved in Notion
  - Wait 60s → reload page → comment appears

- [ ] **Step 4: Notify-subscribers smoke test**
  ```bash
  curl -X POST "http://localhost:3000/api/notify-subscribers?secret=<REVALIDATE_SECRET>&slug=oh-no-not-again"
  ```
  Expected: `{"ok":true,"sent":true,"count":1}`
  Check subscriber inbox → email received with title, excerpt, Read link, Unsubscribe link.

- [ ] **Step 5: Unsubscribe smoke test**
  - Click Unsubscribe link in the subscriber email
  - Expected: "You're unsubscribed." page loads
  - Check Resend Audiences → contact marked unsubscribed
