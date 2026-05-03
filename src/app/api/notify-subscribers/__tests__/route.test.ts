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
