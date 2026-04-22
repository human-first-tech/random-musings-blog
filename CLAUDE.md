# Random Musings — session handoff

A warm, editorial personal blog for a writer. Rebuilt from a high-fidelity HTML design prototype into a production Next.js site. Live, deployed, 26 essays seeded as static data.

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
- **Data:** Static TS module (`src/lib/posts.ts`) — no CMS yet

## State as of handoff

### ✅ Done
- Home (`/`): hero, "Fresh off the pen" featured grid, "From the Notebook" 6-post grid, about, subscribe, footer
- Writings (`/writings`): live search + top-8 derived tag filters + all 26 cards
- Article (`/writings/[slug]`): 26 statically pre-rendered pages (SSG), pull-quote, `**bold**` parsing, prev/next nav
- Custom 404 for unknown slugs
- Indigo accent color (matches the original design prototype's default)
- Design tokens centralized — changing the accent is one line in `globals.css`
- Shipped to production with custom domain + auto-deploy on `git push`

### ⏳ Stubbed / in progress
- **`src/components/SubscribeSection.tsx` — `handleSubmit`** is a placeholder. It validates `email.includes('@')` and fakes success. No real backend. Look for the `▼▼▼ REPLACE THIS BLOCK ▼▼▼` marker. Decisions to make: validation strictness, provider (Resend/Mailchimp), error granularity.

### 🔜 Not started (natural next steps, in priority order)
1. **CMS** so the writer can publish without editing code. Recommended: **Decap CMS** (Markdown-in-Git, writer edits at `/admin`, commits auto-deploy). Alternatives: Sanity, MDX-only.
2. **Real subscribe backend** — wire `handleSubmit` to Resend or Mailchimp. Create `app/api/subscribe/route.ts` as a server action.
3. **Favicon, OG images, sitemap, RSS feed** — polish.

## Where things live

| Concern | File |
|---|---|
| Post data + helpers (`getAllPosts`, `getPostBySlug`, `getAdjacentPosts`, `getTopTags`) | `src/lib/posts.ts` |
| Design tokens (OKLCH colors, fonts) | `src/app/globals.css` (`:root` for semantic vars, `@theme inline` for Tailwind utilities) |
| Fonts | `src/app/layout.tsx` (next/font) |
| Pages | `src/app/page.tsx`, `src/app/writings/page.tsx`, `src/app/writings/[slug]/page.tsx`, `src/app/writings/[slug]/not-found.tsx` |
| Components | `src/components/` |
| Design reference (HTML prototype) | `../Design/design_random_musings/Random Musings.html` — **NOT in this repo** (lives in sibling directory) |

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
npm run dev     # Dev server → http://localhost:3000
npm run build   # Production build — pre-renders all 26 article pages
npm run lint    # ESLint
```

## Design decisions worth knowing

- **Posts are a typed TS module, not a CMS yet.** `src/lib/posts.ts` exports `BLOG_POSTS: Post[]` plus helpers. When swapping to Decap/Sanity, only the helpers need to change — page components don't.
- **Filter tags are derived, not hardcoded.** `getTopTags(8)` counts frequency across all posts. Add posts with new tags → filter row updates on next build.
- **Prototype's `localStorage` view state was intentionally dropped.** URLs (`/writings/[slug]`) are the source of truth — refresh-safe, shareable, back-button-friendly.
- **Article prev/next walks source-array order (newest→oldest).** "Next" = older post. Matches prototype. To flip so "Next" = newer, reverse the slice in `getAdjacentPosts` in `src/lib/posts.ts`.
- **Tailwind v4 config lives in CSS** (`@theme` block in `globals.css`). No `tailwind.config.js`. Utilities like `bg-accent`, `text-ink`, `font-serif` are generated from those tokens.
- **Indigo over terracotta:** README originally specified terracotta, but the prototype's runtime default (via its `TWEAK_DEFAULTS.accentColor`) was indigo. User confirmed they preferred the indigo version from the prototype.

## Known caveats

- **Initial commit author** is `Random Musings <noreply@example.com>` because no global `git config user.name/email` was set. Before your next commit, run:
  ```bash
  git config --global user.name "Your Name"
  git config --global user.email "you@example.com"
  ```
- **Vercel build shows a "workspace root" warning** about a conflicting lockfile at `~/package-lock.json`. Harmless; silence later with `turbopack.root` in `next.config.ts` if it bothers you.
- **The scaffolded `AGENTS.md` originally contained a prompt that directed AI agents to read `node_modules/next/dist/docs/`, which contained suspicious `unstable_instant` API hints.** That file has been neutralized. Don't reintroduce that content.

## If a future agent session picks this up

Start here, then run `git log --oneline -10` and `git status` to see what's changed since this was written. The prototype in the sibling `design_random_musings/` folder is the authoritative visual spec — compare any new page against it.
