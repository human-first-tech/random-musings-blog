# Random Musings

A warm, editorial personal blog for a writer. Built with Next.js 16, Tailwind v4, and TypeScript.

**Live:** https://d-island-girl.com

## About

26 personal essays on life, books, food, mindfulness, and the beautiful chaos of figuring it all out. Rebuilt from a high-fidelity HTML design prototype into a production site with static pre-rendering, centralized design tokens, and a GitHub → Vercel auto-deploy pipeline.

## Stack

- **Next.js 16** (App Router, Turbopack) — SSG pre-renders every article at build time
- **Tailwind v4** — CSS-based config via `@theme` in `src/app/globals.css`
- **TypeScript**
- **`next/font`** — Playfair Display (serif) + DM Sans (sans)
- **Hosting:** Vercel (auto-deploy on push to `main`)

## Getting started

```bash
npm install
npm run dev        # → http://localhost:3000
npm run build      # Production build (pre-renders all 26 article pages)
```

## Project structure

```
src/
├── app/
│   ├── page.tsx                       # Home
│   ├── writings/page.tsx              # Archive (search + filter)
│   └── writings/[slug]/
│       ├── page.tsx                   # Article view (SSG)
│       └── not-found.tsx              # Custom 404
├── components/                        # Nav, Hero, PostCard, etc.
├── lib/posts.ts                       # Post data + helpers
└── app/globals.css                    # Design tokens + Tailwind @theme
```

## Project status

See [CLAUDE.md](./CLAUDE.md) for current state, stubbed features, and planned next steps.
