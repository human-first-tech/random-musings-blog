# Decap CMS Integration — Design Spec

**Date:** 2026-04-24  
**Status:** Approved  
**Scope:** Add Decap CMS to Random Musings blog; migrate 26 posts from static TS to Markdown files

---

## Overview

Integrate Decap CMS (Git-based, no database) so the writer can publish posts at `/admin` without editing code. All 26 existing posts migrate to Markdown files. The Next.js rendering layer is unchanged — build-time only, same as today.

---

## Architecture

```
GitHub repo
└── content/posts/              ← Decap writes .md files here
    ├── oh-no-not-again.md
    └── ... (26 total)

src/lib/posts.ts                ← updated to read content/posts/ via fs + gray-matter
                                   getAllPosts, getPostBySlug, getAdjacentPosts, getTopTags
                                   interfaces unchanged

public/admin/
    ├── index.html              ← loads Decap bundle from CDN
    └── config.yml              ← repo, branch, content folder, field schema

app/api/auth/[...slug]/
    route.ts                    ← ~40-line OAuth proxy (Vercel serverless function)
```

**Publish flow:** Writer logs in at `/admin` → edits in Decap rich-text editor → hits Publish → Decap commits `.md` to GitHub → Vercel auto-deploys → post is live.

**Read flow:** `npm run build` → `posts.ts` reads all `.md` files → gray-matter parses frontmatter → same `Post[]` array as today → pages render identically.

No component changes. No runtime database. Build-time only.

---

## Content Schema

Each post file: `content/posts/{slug}.md`

```markdown
---
title: "Post Title"
date: "2021-12-21"
slug: "post-slug"
tags:
  - tag one
  - tag two
excerpt: "One-paragraph teaser shown on cards and listings."
---

Full post body in plain Markdown. Bold, italic, headings, links supported.
```

**Decap editor fields:**
| Field | Type | Notes |
|---|---|---|
| `title` | string | required |
| `date` | date | defaults to today on new posts |
| `slug` | string | auto-populated from title, writer can override |
| `tags` | list of strings | free-form |
| `excerpt` | text | single paragraph |
| body | markdown | rich-text editor with toolbar |

**Dropped field:** `id` (numeric). Not used in any UI or routing — `slug` is the unique key.

**Date format:** ISO `"2021-12-21"` in frontmatter. `posts.ts` formats for display (`"December 21, 2021"`) on the way out. Rendered strings on the site are identical to today.

---

## Auth & Admin

**GitHub OAuth App** (created once in GitHub settings):
- Callback URL: `https://www.d-island-girl.com/api/auth/callback`
- `CLIENT_ID` and `CLIENT_SECRET` added as Vercel environment variables

**OAuth proxy** (`app/api/auth/[...slug]/route.ts`):
Standard Next.js Route Handler. Handles the OAuth code exchange between Decap and GitHub. No external service — runs as a Vercel serverless function.

**Access control:** Only accounts with write access to the GitHub repo can authenticate. Single user — no user table or passwords.

**Local development:** `npx decap-server` alongside `npm run dev` enables local editor testing without hitting GitHub.

---

## Migration & Backup

**Backup branch:** `backup/pre-cms-migration` created from `main` before any changes. The full `BLOG_POSTS` array in `posts.ts` is preserved there.

**Migration script:** `scripts/migrate-posts.ts` — one-shot Node script:
- Reads `BLOG_POSTS` from `src/lib/posts.ts`
- Converts each entry to a `.md` file with frontmatter
- Converts date strings (`"December 21, 2021"` → `"2021-12-21"`)
- Uses `slug` as filename
- Strips `id` field
- Writes body as Markdown text
- Run once, deleted after migration is verified

**Order of operations:**
1. Create `backup/pre-cms-migration` branch
2. Run migration script → 26 `.md` files in `content/posts/`
3. Install `gray-matter` dependency
4. Update `posts.ts` to read from filesystem (remove `BLOG_POSTS` array)
5. Local build — verify all 26 pages render correctly
6. Add `public/admin/index.html` + `config.yml`
7. Add `app/api/auth/[...slug]/route.ts`
8. Test admin login locally with `npx decap-server`
9. Push to `main` → Vercel deploys
10. Create GitHub OAuth App, add env vars to Vercel
11. Smoke-test live `/admin`

---

## Dependencies

| Package | Purpose |
|---|---|
| `gray-matter` | Parse frontmatter from `.md` files at build time |
| Decap CMS | Loaded from CDN in `public/admin/index.html` — no npm package |

---

## Out of Scope

- Rich Markdown features (images, footnotes, code blocks) — plain text body only for now
- Media/image uploads via the CMS
- Draft/preview workflow
- Multiple users
