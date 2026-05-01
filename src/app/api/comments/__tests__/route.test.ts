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
