# Random Musings

A warm, editorial personal blog. Built with Next.js 16, Tailwind v4, TypeScript, and **Notion as the CMS**.

**Live:** https://www.d-island-girl.com

## About

A personal journal — essays on life, books, food, mindfulness, and the beautiful chaos of figuring it all out.

The site is a thin Next.js shell over a Notion database. The writer publishes by setting `Status = Published` on a row in Notion; the site picks up the change within ~60 seconds via ISR. No code changes, no deploys, no Git involvement for the writer.

## Stack

- **Next.js 16** (App Router, Turbopack) — pre-renders article pages from Notion at build time, refreshes via ISR
- **Tailwind v4** — CSS-based config via `@theme` in `src/app/globals.css`
- **TypeScript**
- **`next/font`** — Playfair Display (serif) + DM Sans (sans)
- **Notion** (`@notionhq/client`) — content source of truth
- **Vercel** — auto-deploy on push to `main`

## Quick start

```bash
npm install
cp .env.example .env.local       # then fill in NOTION_TOKEN + NOTION_DATABASE_ID
npm run dev                       # → http://localhost:3000
npm run build                     # Production build (fetches from Notion)
npm run lint                      # ESLint
npm run import:notion             # One-shot: content/posts/*.md → Notion (idempotent)
```

## Project structure

```
src/
├── lib/
│   ├── notion.ts                # Notion API client + type-safe property extractors
│   └── posts.ts                 # Public posts API (getAllPosts, getPostBySlug, etc.)
├── components/
│   ├── NotionRenderer.tsx       # Renders Notion blocks with site typography
│   ├── PostCard.tsx, Hero.tsx, ...
├── app/
│   ├── page.tsx                 # Home
│   ├── writings/page.tsx        # Archive (search + filter)
│   ├── writings/[slug]/page.tsx # Article view (SSG + ISR)
│   ├── api/revalidate/          # Webhook — flushes ISR cache on publish
│   ├── rss.xml/route.ts         # RSS 2.0 feed
│   ├── sitemap.ts               # Dynamic sitemap from Notion
│   ├── opengraph-image.tsx      # Site-wide OG image
│   └── writings/[slug]/opengraph-image.tsx  # Per-article OG image
├── globals.css                  # Design tokens + Tailwind @theme
content/posts/                   # Historical markdown backup (read-only; site does not use)
docs/
├── notion-schema.md             # Database schema spec (property names the code reads)
├── deployment.md                # Initial deployment steps (reference)
└── pilot-plan.md                # Historical: the 3-article cutover plan used to migrate
scripts/
├── import-to-notion.ts          # One-shot migration: markdown → Notion
└── diag-notion.ts               # Diagnostic: list all rows + statuses
```

## Writer workflow (Notion)

1. Open the Writings database in Notion
2. `+ New` → fill Title, Slug (lowercase, hyphens, no spaces), Excerpt, Category, Publish Date
3. Click into the row to write the body
4. Set Status to `Published`
5. Site updates within ~60s

## Project status

See [CLAUDE.md](./CLAUDE.md) for current state, open items, and design decisions worth knowing before changing anything.
