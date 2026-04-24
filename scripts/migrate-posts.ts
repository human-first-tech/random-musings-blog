// Migration script — already ran in Task 2. Kept for reference only.
// Posts are now read from content/posts/*.md via gray-matter (see src/lib/posts.ts).
import fs from 'fs';
import path from 'path';
import { getAllPosts, type Post } from '../src/lib/posts';

function escapeYaml(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function toMarkdown(post: Post): string {
  const tagLines = post.tags.map((t: string) => `  - ${t}`).join('\n');
  return `---\ntitle: "${escapeYaml(post.title)}"\ndate: "${post.date}"\nslug: "${post.slug}"\ntags:\n${tagLines}\nexcerpt: "${escapeYaml(post.excerpt)}"\n---\n\n${post.content.trim()}\n`;
}

const posts = getAllPosts();
const outDir = path.join(process.cwd(), 'content/posts');
fs.mkdirSync(outDir, { recursive: true });
for (const post of posts) {
  fs.writeFileSync(path.join(outDir, `${post.slug}.md`), toMarkdown(post), 'utf-8');
  console.log(`✓ ${post.slug}.md`);
}
console.log(`\nDone — ${posts.length} files written to content/posts/`);
