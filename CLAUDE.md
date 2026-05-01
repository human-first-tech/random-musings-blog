# Random Musings — session handoff

A warm, editorial personal blog for a writer. Built on Next.js, **content lives in Notion**, and the writer publishes by flipping a Status toggle in a Notion database.

**Status as of 2026-04-29:** v0.2 (Notion CMS) is **shipped to production**. The migration PR was merged 2026-04-26. The site is live and reading from Notion.

## Live URLs

| What | URL |
|---|---|
| Production site | https://www.d-island-girl.com |
| Vercel default domain | https://random-musings-blog.vercel.app |
| GitHub repo | https://github.com/human-first-tech/random-musings-blog |
| Vercel dashboard | https://vercel.com/human-first-techs-projects/random-musings-blog |
| Notion parent page | https://www.notion.so/34e44c75070f811d954bd4ec7a5d23d5 |
| Notion Writings database | https://www.notion.so/f4b1819bdfbc4715b8370861e2182fc7 |

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

## Where we are now

### ✅ Done (v0.2 — Notion CMS, shipped 2026-04-26)
- Notion database created, schema locked, 26 articles imported (slugs preserved)
- Data layer rewritten (`src/lib/notion.ts` + `src/lib/posts.ts`) — same public API, now async
- `src/components/NotionRenderer.tsx` — renders Notion blocks with the site's typography
- `src/app/api/revalidate/route.ts` — secret-gated webhook for on-demand cache busting
- `src/app/rss.xml/route.ts` — RSS 2.0 feed
- `src/app/sitemap.ts` — dynamic sitemap from Notion
- `src/app/opengraph-image.tsx` + `src/app/writings/[slug]/opengraph-image.tsx` — dynamic OG images via `next/og`
- `scripts/import-to-notion.ts` — one-shot migration (idempotent, supports `IMPORT_LIMIT` + `IMPORT_STATUS=Draft` + `IMPORT_OVERWRITE`)
- `scripts/diag-notion.ts` — diagnostic: list all rows + statuses
- All four env vars set in Vercel (Production + Preview + Development)
- PR merged to `main`; Vercel deployed; production reads from Notion

### ✅ Done previously (v0.1 — markdown era)
- Home (`/`): hero, "Fresh off the pen" featured grid, "From the Notebook" 6-post grid, about, subscribe, footer
- Writings (`/writings`): live search + top-N category filters
- Article (`/writings/[slug]`): static + ISR, pull-quote, prev/next nav, custom 404
- Indigo accent color (matches the original design prototype's default)
- Design tokens centralized — changing the accent is one line in `globals.css`
- Custom domain on Vercel + auto-deploy on push to `main`

### ⏳ Open items (in priority order)

1. **Share Notion DB with Dimpy.** Open the Writings database → Share → invite by email → permission **Can edit** (NOT Full access). Send her the writer workflow (see README §Writer workflow). Until this happens, only Johny can author content.
2. **Wire the Notion automation** for instant publishing. Optional — current 60s ISR is fine for a personal blog. Steps: Notion → Writings DB → `+ New automation` → trigger when Status set to Published → action: POST to `https://www.d-island-girl.com/api/revalidate?secret=<REVALIDATE_SECRET>&slug={Slug}`.
3. ✅ **Subscribe backend wired.** `POST /api/subscribe` → Resend Audiences. Unsubscribe via `GET /api/unsubscribe?email=...&token=...` (HMAC-gated). Subscriber broadcast on publish via `POST /api/notify-subscribers` (Notion automation + Notified checkbox guard).
4. **Tag color rotation.** `PostCard.tsx`'s `CardTag` regex `/sage|nature|environment/` no longer matches any post (categories were consolidated). Currently all chips render in accent. To re-introduce visual variety, update the regex or move color decision into the data layer.
5. **Notion image proxy.** None of the current posts have images, but Notion-hosted images use signed URLs that expire ~1hr. Once Dimpy starts including images, plan: proxy through `next/image` loader with a custom domain or move to a CDN.
6. **Wire the notify-subscribers Notion automation.** In the Writings database, add a second automation: trigger when Status → Published → POST to `https://www.d-island-girl.com/api/notify-subscribers?secret=<REVALIDATE_SECRET>&slug={Slug}`. Separate from the revalidation automation.
7. **Set Resend + comments env vars in Vercel.** Add `RESEND_API_KEY`, `RESEND_AUDIENCE_ID`, `RESEND_FROM_EMAIL`, `DIMPY_EMAIL`, `NOTION_COMMENTS_DATABASE_ID` to Vercel Production + Preview + Development.

### 🗑️ Cleanup candidates (deliberately left in repo)

- **`content/posts/*.md` (26 files)** — durable backup post-migration. Plan to remove after ~30 days of stable Notion operation, i.e., **after 2026-05-26**. Until then, keep as fallback.
- **`gray-matter` dependency** in `package.json` — only used by `scripts/import-to-notion.ts`. Once that script is retired (after the markdown content folder is deleted), this dep can also go.

### ✅ Cleaned up on 2026-04-29

- Decap CMS leftovers (`public/admin/`, `public/config.yml`) — deleted, dead code from a prior CMS attempt.
- `src/app/api/auth/[[...slug]]/route.ts` — Decap GitHub OAuth handler. Deleted, not wired into anything.
- Historical Decap planning docs in `docs/superpowers/` are kept for context (not active code).

## Where things live

| Concern | File |
|---|---|
| Notion client + raw fetchers | `src/lib/notion.ts` |
| Public posts API (`getAllPosts`, `getPostBySlug`, `getAdjacentPosts`, `getTopTags`) | `src/lib/posts.ts` |
| Article body renderer | `src/components/NotionRenderer.tsx` |
| Revalidation webhook | `src/app/api/revalidate/route.ts` |
| RSS / Sitemap / OG | `src/app/rss.xml/route.ts`, `src/app/sitemap.ts`, `src/app/opengraph-image.tsx`, `src/app/writings/[slug]/opengraph-image.tsx` |
| Migration script | `scripts/import-to-notion.ts` |
| Diagnostic script | `scripts/diag-notion.ts` |
| Design tokens (OKLCH colors, fonts) | `src/app/globals.css` |
| Fonts | `src/app/layout.tsx` (next/font) |
| Pages | `src/app/page.tsx`, `src/app/writings/page.tsx`, `src/app/writings/[slug]/page.tsx` |
| Components | `src/components/` |
| Notion schema spec | `docs/notion-schema.md` |
| Deployment guide (reference, since shipped) | `docs/deployment.md` |
| Pilot rollout plan (historical) | `docs/pilot-plan.md` |

## Environment variables

See `.env.example` for the canonical list. Required: `NOTION_TOKEN`, `NOTION_DATABASE_ID`, `REVALIDATE_SECRET`, `NEXT_PUBLIC_SITE_URL`. All four are already set in Vercel for Production + Preview + Development. The `NOTION_TOKEN` is an Internal Integration token from `Random Musings Site` integration with Read+Update+Insert capability (Read is the only one the runtime site needs; Update+Insert exist for the migration script).

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
npx tsx scripts/diag-notion.ts   # Diagnostic — list all rows + their statuses
```

## Design decisions worth knowing

- **Notion is the single source of truth.** No fallback to markdown at runtime. Markdown files in `content/posts/` are kept only as a historical backup; the deployed site does not read them.
- **ISR + on-demand revalidation.** Pages cache for 60s; the webhook flushes specific paths instantly. This means at most a 60s delay between her hitting Publish in Notion and the site updating, even without the webhook configured.
- **`tags[0]` convention preserved.** Components display the primary category as the tag chip. The `Post.tags` array contains `[category, ...subTags]` for backwards-compat with `WritingsClient`'s `tags.includes(activeTag)` filter.
- **Filter chips show categories, not sub-tags.** `getTopTags()` counts only the primary `Category` field (a Select), not the `Sub-tags` multi-select. This keeps the filter row scannable.
- **Slug rules are strict.** Lowercase, hyphens only, no spaces, no apostrophes, no Unicode. Any deviation will break the URL routing on Vercel (we hit this with a test post — trailing space caused a 500). When Dimpy onboards, emphasize this.
- **Migration script is idempotent.** Safe to re-run; existing slugs are skipped unless `IMPORT_OVERWRITE=true`.
- **Tailwind v4 config lives in CSS** (`@theme` block in `globals.css`). No `tailwind.config.js`. Utilities like `bg-accent`, `text-ink`, `font-serif` are generated from those tokens.

## Known caveats

- **Build now requires Notion access.** `npm run build` calls Notion at build time. CI must have `NOTION_TOKEN` + `NOTION_DATABASE_ID` env vars (already true on Vercel). Local builds need `.env.local`.
- **Notion API rate limits.** 3 req/sec average. Personal blog traffic won't get close, but bear in mind for any scripts.
- **Notion-hosted image URLs expire (~1hr).** No current posts have images, but worth knowing before adding any.
- **Vercel build shows a "workspace root" warning** about a conflicting lockfile at `~/package-lock.json`. Harmless; silence later with `turbopack.root` in `next.config.ts` if it bothers you.
- **AGENTS.md was originally a prompt-injection vector** that directed AI agents to read `node_modules/next/dist/docs/` (containing suspicious `unstable_instant` API hints). It has been neutralized to just point at this file. Don't reintroduce anything else there.

## If a future agent session picks this up

1. Read this file end-to-end.
2. `git log --oneline -10` and `git status` to see what's changed since this was last updated.
3. For Notion-related work, read `docs/notion-schema.md` next — it documents the exact property names the code reads by string. Renaming a property in Notion without updating `src/lib/notion.ts` will silently break things.
4. The shortest path to seeing what's actually in the Notion DB is `npx tsx scripts/diag-notion.ts` (requires `.env.local`).
5. To inspect the live site: `https://www.d-island-girl.com` is production, the listing page `/writings` shows everything Published.

The original prototype HTML lives in a sibling directory (`../Design/design_random_musings/Random Musings.html`) — NOT in this repo. It's the authoritative visual spec for any new pages.
