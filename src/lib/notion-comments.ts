import { Client } from '@notionhq/client';
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';

const notion = new Client({ auth: process.env.NOTION_TOKEN });

export type Comment = { name: string; comment: string; submittedAt: string };

export function sanitizeCommentInput(str: string, maxLen = 1000): string {
  return str
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

export async function createPendingComment(
  name: string,
  comment: string,
  slug: string,
): Promise<void> {
  const dbId = process.env.NOTION_COMMENTS_DATABASE_ID;
  if (!dbId) throw new Error('Missing env var: NOTION_COMMENTS_DATABASE_ID');
  await notion.pages.create({
    parent: { database_id: dbId },
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
  const dbId = process.env.NOTION_COMMENTS_DATABASE_ID;
  if (!dbId) throw new Error('Missing env var: NOTION_COMMENTS_DATABASE_ID');
  const res = await notion.databases.query({
    database_id: dbId,
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
