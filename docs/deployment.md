# Deployment guide — Notion-as-CMS rollout

End-to-end steps to take this branch from local clone → live on Vercel.

---

## 1. Install new dependencies (~30 seconds)

```bash
npm install
```

This adds:

- `@notionhq/client` — official Notion SDK
- `dotenv` — env loader for the migration script
- `tsx` — TypeScript runner for the migration script

---

## 2. Set up Notion (~10 minutes)

Follow `docs/notion-schema.md` end-to-end:

1. Create the `Writings` database with the exact properties listed.
2. Create the integration at https://www.notion.so/my-integrations.
3. Connect the integration to the database (Connections menu).
4. Copy the integration token + database ID.

---

## 3. Configure local env (~1 minute)

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in:

| Variable | Where to get it |
|---|---|
| `NOTION_TOKEN` | Internal integration token from step 2 |
| `NOTION_DATABASE_ID` | 32-char hex from the Writings database URL (between the workspace name and the `?v=...` query) |
| `REVALIDATE_SECRET` | Generate with `openssl rand -hex 32` |
| `NEXT_PUBLIC_SITE_URL` | Already defaulted to `https://www.d-island-girl.com` |

---

## 4. Pilot migration (3 articles) (~30 seconds)

```bash
IMPORT_LIMIT=3 IMPORT_STATUS=Draft npm run import:notion
```

This imports the first 3 markdown posts as **Drafts** in Notion. Open them in Notion, eyeball the formatting, and flip Status to `Published` when satisfied.

Then run dev server:

```bash
npm run dev
```

Visit http://localhost:3000 and verify the 3 published posts render correctly.

---

## 5. Add env vars to Vercel (~2 minutes)

In the Vercel dashboard → Project → Settings → Environment Variables, add the same four variables (NOTION_TOKEN, NOTION_DATABASE_ID, REVALIDATE_SECRET, NEXT_PUBLIC_SITE_URL) for **Production, Preview, and Development**.

Or via CLI:

```bash
vercel env add NOTION_TOKEN
vercel env add NOTION_DATABASE_ID
vercel env add REVALIDATE_SECRET
vercel env add NEXT_PUBLIC_SITE_URL
```

---

## 6. Deploy preview branch (~2 minutes)

```bash
git checkout -b feat/notion-cms
git add .
git commit -m "feat: switch posts data layer to Notion CMS"
git push -u origin feat/notion-cms
```

Vercel will build a Preview URL (visible in the GitHub PR). Verify the 3 articles render correctly on the preview URL — same as local but on Vercel infra.

---

## 7. Backfill remaining 23 articles (~5 minutes)

Once preview looks right:

```bash
npm run import:notion
```

(no IMPORT_LIMIT this time, defaults to all 26 — script skips slugs already in Notion).

In Notion, flip Status of each new draft to `Published`.

Hit the revalidation endpoint to refresh the cache:

```bash
curl "https://random-musings-blog.vercel.app/api/revalidate?secret=YOUR_SECRET"
```

(or visit the URL in a browser).

---

## 8. Merge to main → production deploy (~1 minute)

```bash
git checkout main
git merge feat/notion-cms
git push
```

Vercel auto-deploys. Production now reads from Notion.

---

## 9. (Optional) Wire Notion automation for hands-off publishing

In Notion → `Writings` database → `+ New automation`:

- Trigger: When **Status** is set to **Published**
- Action: Send webhook to `https://www.d-island-girl.com/api/revalidate?secret=YOUR_SECRET&slug={Slug}`

Now her workflow is: write in Notion → flip to Published → site updates within seconds. No manual cache bust.

---

## Verification checklist

After deploying, verify:

- [ ] `/` loads and shows the 3 most recent posts in "Fresh off the pen"
- [ ] `/writings` loads with all published posts + filter chips for active categories
- [ ] An article page (e.g. `/writings/oh-no-not-again`) loads with body, pull-quote, prev/next nav
- [ ] `/rss.xml` returns valid XML with all posts
- [ ] `/sitemap.xml` returns valid XML
- [ ] OG image: visit https://www.opengraph.xyz/url/{your-article-url} to preview
- [ ] Edit a post in Notion, hit `/api/revalidate?secret=...`, refresh the article — change appears

---

## Rollback

If anything is broken in production:

1. **Fastest:** revert the commit on `main` and push. Vercel redeploys the markdown version.
2. **Granular:** the markdown files in `content/posts/` are still in git history. The previous `src/lib/posts.ts` reads from them. `git revert` of the migration commit restores the old behavior.

The markdown is the durable backup. Keep it in the repo.
