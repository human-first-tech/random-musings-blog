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
