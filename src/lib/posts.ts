import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export type Post = {
  title: string;
  date: string;
  slug: string;
  tags: string[];
  excerpt: string;
  content: string;
};

const postsDir = path.join(process.cwd(), 'content/posts');

function formatDate(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  return d.toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
  });
}

function require(filename: string, field: string, value: unknown): string {
  if (typeof value !== 'string' || !value.trim())
    throw new Error(`${filename}: missing or empty frontmatter field '${field}'`);
  return value;
}

let _cache: Post[] | null = null;

function readPosts(): Post[] {
  if (_cache) return _cache;
  const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.md'));
  const parsed = files.map(filename => {
    const raw = fs.readFileSync(path.join(postsDir, filename), 'utf-8');
    const { data, content } = matter(raw);
    const rawDate = data.date;
    const isoDate = rawDate instanceof Date
      ? rawDate.toISOString().split('T')[0]
      : require(filename, 'date', rawDate);
    return {
      isoDate,
      title: require(filename, 'title', data.title),
      date: formatDate(isoDate),
      slug: filename.replace(/\.md$/, ''),
      tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
      excerpt: require(filename, 'excerpt', data.excerpt),
      content: content.trim(),
    };
  });
  parsed.sort((a, b) => (a.isoDate > b.isoDate ? -1 : 1));
  _cache = parsed.map(({ isoDate: _, ...p }) => p as Post);
  return _cache;
}

export function getAllPosts(): Post[] { return readPosts(); }

export function getPostBySlug(slug: string): Post | undefined {
  return readPosts().find(p => p.slug === slug);
}

export function getFeaturedPosts(n = 3): Post[] { return readPosts().slice(0, n); }

export function getAdjacentPosts(slug: string): { prev: Post | null; next: Post | null } {
  const posts = readPosts();
  const idx = posts.findIndex(p => p.slug === slug);
  if (idx === -1) return { prev: null, next: null };
  return {
    prev: idx > 0 ? posts[idx - 1] : null,
    next: idx < posts.length - 1 ? posts[idx + 1] : null,
  };
}

export function getAllTags(): string[] {
  const set = new Set<string>();
  readPosts().forEach(p => p.tags.forEach(t => set.add(t)));
  return Array.from(set).sort();
}

export function getTopTags(n = 8): string[] {
  const counts = new Map<string, number>();
  readPosts().forEach(p => p.tags.forEach(t => counts.set(t, (counts.get(t) ?? 0) + 1)));
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n).map(([tag]) => tag);
}
