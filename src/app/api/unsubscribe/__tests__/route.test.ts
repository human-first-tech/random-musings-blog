process.env.REVALIDATE_SECRET = 'test-secret';
process.env.RESEND_AUDIENCE_ID = 'aud-abc';
process.env.RESEND_API_KEY = 're_test_key';

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
