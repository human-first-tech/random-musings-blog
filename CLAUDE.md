# Random Musings — session handoff

A warm, editorial personal blog for a writer. Built on Next.js, **content lives in Notion**, and the writer publishes by flipping a Status toggle in a Notion database.

## Live URLs

| What | URL |
|---|---|
| Production site | https://d-island-girl.com |
| Vercel default domain | https://random-musings-blog.vercel.app |
| GitHub repo | https://github.com/human-first-tech/random-musings-blog |
| Vercel dashboard | https://vercel.com/human-first-techs-projects/random-musings-blog |

Domain: Namecheap-registered `d-island-girl.com`, DNS pointing to Vercel. `www.d-island-girl.com` is the production domain; apex 307-redirects to `www`. Every push to `main` auto-deploys.

## Stack

- **Framework:** Next.js 16 (App Router, Turbopack), React 19
- **Language:** TypeScript
- **Styling:** Tailwind v4 (CSS-based config via `@theme` — no `tailwind.config.js`)
- **Fonts:** Playfair Display + DM Sans via `next/font`
- **CMS:** Notion (database = source of truth, fetched via `@notionhq/client`)
- **Caching:** ISR (`revalidate = 60` per page) + on-demand revalidation via `/api/revalidate`

## Architecture at a glance

```
Notion "Writings" database  ──fetch──▶  src/lib/notion.ts  ──hydrate──▶  src/lib/posts.ts  ──consume──▶  Pages & components
                                                                                                            │
                                                            on publish, Notion automation ───────POST─────▶ /api/revalidate
                                                                                                            │
                                                                                            (revalidatePath flushes ISR cache)
```

The `Post` type and helper signatures match what was there before the CMS migration — only the implementation changed. Page/component layer is largely untouched.

## State as of handoff

### ✅ Done in this session (v0.2 — Notion CMS)
- `src/lib/notion.ts` — Notion API client, type-safe property extractors, request-deduplicated fetchers
- `src/lib/posts.ts` — public API (now async) backed by Notion. Same exports as before.
- `src/components/NotionRenderer.tsx` — renders Notion blocks (paragraph, headings, quote, lists, image, callout, code, divider) with the site's existing typography
- `src/app/api/revalidate/route.ts` — secret-gated webhook for on-demand cache busting
- `src/app/rss.xml/route.ts` — RSS 2.0 feed
- `src/app/sitemap.ts` — dynamic sitemap from Notion
- `src/app/opengraph-image.tsx` + `src/app/writings/[slug]/opengraph-image.tsx` — dynamic OG images via `next/og`
- `scripts/import-to-notion.ts` — one-shot migration from `content/posts/*.md` → Notion (idempotent, supports limit + draft mode)
- `docs/notion-schema.md` — exact schema spec for the Notion database
- `docs/deployment.md` — env var setup + Vercel deployment steps
- `docs/pilot-plan.md` — 3-article cutover plan with comparison checklist

### ✅ Done previously (v0.1 — markdown era)
- Home (`/`): hero, "Fresh off the pen" featured grid, "From the Notebook" 6-post grid, about, subscribe, footer
- Writings (`/writings`): live search + top-N category filters
- Article (`/writings/[slug]`): static + ISR, pull-quote, prev/next nav, custom 404
- Indigo accent color (matches the original design prototype's default)
- Design tokens centralized — changing the accent is one line in `globals.css`
- Custom domain on Vercel + auto-deploy on push to `main`

### ⏳ Stubbed / in progress
- **`src/components/SubscribeSection.tsx` — `handleSubmit`** is a placeholder. It validates `email.includes('@')` and fakes success. No real backend. Look for the `▼▼▼ REPLACE THIS BLOCK ▼▼▼` marker. Decisions to make: validation strictness, provider (Resend/Mailchimp), error granularity.
- **`src/app/api/auth/[[...slug]]/route.ts`** — leftover GitHub OAuth handler from a previous Decap CMS attempt. Not wired into anything. Safe to delete; left for now to avoid scope creep.
- **`content/posts/*.md`** — markdown source-of-truth from v0.1. Kept as durable backup post-migration. Plan to remove ~30 days after stable Notion operation (see `docs/pilot-plan.md`).

### 🔜 Not started
1. **Real subscribe backend** — wire `handleSubmit` to Resend or Mailchimp.
2. **Categorize sage vs accent tag colors** — `PostCard.tsx`'s `CardTag` regex `/sage|nature|environment/` no longer matches any post (categories were consolidated). Currently all tags render in accent. To re-introduce visual variety, update the regex or move color decision into the data layer.
3. **Notion image proxy** — none of the current 26 posts have images, but Notion-hosted images use signed URLs that expire ~1hr. Once she starts including images, consider proxying through `next/image` loader with a custom domain or moving to a CDN.

## Where things live

| Concern | File |
|---|---|
| Notion client + raw fetchers | `src/lib/notion.ts` |
| Public posts API (`getAllPosts`, `getPostBySlug`, `getAdjacentPosts`, `getTopTags`) | `src/lib/posts.ts` |
| Article body renderer | `src/components/NotionRenderer.tsx` |
| Revalidation webhook | `src/app/api/revalidate/route.ts` |
| RSS / Sitemap / OG | `src/app/rss.xml/route.ts`, `src/app/sitemap.ts`, `src/app/opengraph-image.tsx`, `src/app/writings/[slug]/opengraph-image.tsx` |
| Migration script | `scripts/import-to-notion.ts` |
| Design tokens (OKLCH colors, fonts) | `src/app/globals.css` |
| Fonts | `src/app/layout.tsx` (next/font) |
| Pages | `src/app/page.tsx`, `src/app/writings/page.tsx`, `src/app/writings/[slug]/page.tsx` |
| Components | `src/components/` |
| Notion schema spec | `docs/notion-schema.md` |
| Deployment + env var guide | `docs/deployment.md` |
| Pilot rollout plan | `docs/pilot-plan.md` |

## Environment variables

See `.env.example` for the canonical list. Required: `NOTION_TOKEN`, `NOTION_DATABASE_ID`, `REVALIDATE_SECRET`. Set in Vercel for Production + Preview + Development.

## Changing the accent color

Two lines in `src/app/globals.css`:

```css
--accent:       oklch(50% 0.14 270);  /* indigo — current */
--accent-light: oklch(93% 0.04 270);
```

Prototype-documented alternatives:
- **terracotta:** `oklch(56% 0.13 30)` / `oklch(92% 0.04 30)`
- **dustyRose:** `oklch(55% 0.12 5)` / `oklch(93% 0.04 5)`
- **sage:** `oklch(50% 0.10 155)` / `oklch(93% 0.03 155)`

## Commands

```bash
npm run dev               # Dev server → http://localhost:3000 (requires .env.local with NOTION_TOKEN)
npm run build             # Production build — pre-renders article pages from Notion at build time
npm run lint              # ESLint
npm run import:notion     # One-shot migration of content/posts/*.md → Notion. See docs/deployment.md.
```

## Design decisions worth knowing

- **Notion is the single source of truth.** No fallback to markdown at runtime. Markdown files in `content/posts/` are kept only as a historical backup; the deployed site does not read them.
- **ISR + on-demand revalidation.** Pages cache for 60s; the webhook flushes specific paths instantly. This means at most a 60s delay between her hitting Publish in Notion and the site updating, even without the webhook configured.
- **`tags[0]` convention preserved.** Components display the primary category as the tag chip. The `Post.tags` array now contains `[category, ...subTags]` for backwards-compat with `WritingsClient`'s `tags.includes(activeTag)` filter.
- **Filter chips show categories, not sub-tags.** `getTopTags()` now counts only the primary `Category` field (a Select), not the `Sub-tags` multi-select. This keeps the filter row scannable.
- **Migration script is idempotent.** Safe to re-run; existing slugs are skipped unless `IMPORT_OVERWRITE=true`.
- **Tailwind v4 config lives in CSS** (`@theme` block in `globals.css`). No `tailwind.config.js`. Utilities like `bg-accent`, `text-ink`, `font-serif` are generated from those tokens.

## Known caveats

- **Build now requires Notion access.** `npm run build` calls Notion at build time. CI must have `NOTION_TOKEN` + `NOTION_DATABASE_ID` env vars (already true on Vercel if env vars are configured).
- **Notion API rate limits.** 3 req/sec average. Personal blog traffic won't get close, but bear in mind for any scripts.
- **Initial commit author** is `Random Musings <noreply@example.com>` because no global `git config user.name/email` was set. Before your next commit, run:
  ```bash
  git config --global user.name "Your Name"
  git config --global user.email "you@example.com"
  ```
- **Vercel build shows a "workspace root" warning** about a conflicting lockfile at `~/package-lock.json`. Harmless; silence later with `turbopack.root` in `next.config.ts` if it bothers you.
- **The scaffolded `AGENTS.md` originally contained a prompt that directed AI agents to read `node_modules/next/dist/docs/`, which contained suspicious `unstable_instant` API hints.** That file has been neutralized. Don't reintroduce that content.

## If a future agent session picks this up

Start here, then `git log --oneline -10` and `git status`. For Notion-related work, read `docs/notion-schema.md` first — it documents the exact property names the code reads by string. Renaming a property in Notion without updating `src/lib/notion.ts` will silently break things.
