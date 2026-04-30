# Pilot rollout plan — 3 articles, then full backfill

> **Historical, kept for reference.** This plan was executed on 2026-04-26.
> All 26 articles are migrated and the site shipped to production.
> Read this only if you need to understand the cutover sequence we used,
> or if you're doing a similar migration on another project.

A small-batch cutover that lets you validate the system end-to-end before
moving all 26 articles. Total time: ~30 minutes of focused work.

---

## Why pilot first

The risk in a CMS migration is rendering fidelity — does a Notion page look
identical to the original markdown article? Easier to catch issues with 3
posts than with 26. Once 3 look right, the remaining 23 are mechanical.

---

## Pilot post selection

The 3 posts to migrate first should stress-test different content shapes:

| Slot | Suggested post | Why |
|---|---|---|
| 1. Most-recent + introspective | `oh-no-not-again` | Newest post. Plain prose, mid-length. The "fresh off the pen" hero card. |
| 2. Bold-heading content | `forgive-us-our-sins` | Uses the `**bold**` heading-then-body pattern. Tests that the markdown→Notion bold conversion preserves intent. |
| 3. Short + punchy | `jimmy-and-the-strawberries` | Short prose. Tests that brevity still looks editorially complete (no awkward whitespace). |

These are picked from across the date range so the listing page also exercises sorting.

---

## Step-by-step

### 1. Setup (one-time, ~15 min)

Follow `docs/deployment.md` steps 1–5 to install deps, configure Notion, set env vars locally and in Vercel.

### 2. Run pilot import (~30 sec)

```bash
IMPORT_LIMIT=3 IMPORT_STATUS=Draft npm run import:notion
```

The script sorts files alphabetically — to get the specific 3 posts above, either rename their files temporarily or run individual imports by editing the `files` slice in the script. **Easier path: just import as Draft, manually pick which 3 to flip to Published in Notion.**

### 3. Review in Notion (~5 min)

Open each draft post in Notion. Check:

- Title rendered correctly
- Slug matches the original URL (e.g., `oh-no-not-again`)
- Excerpt text intact
- Category mapped to a sensible bucket
- Body paragraphs preserved with `**bold**` correctly converted to bold runs
- Publish Date set

If anything looks wrong, fix it in Notion (her workflow going forward).

### 4. Flip 3 chosen posts to Published

Set Status = `Published` for the 3 chosen posts. Leave the rest as Draft.

### 5. Deploy preview branch (~3 min)

```bash
git checkout -b feat/notion-cms
git add .
git commit -m "feat: Notion CMS backbone + pilot 3 posts"
git push -u origin feat/notion-cms
```

Vercel builds a preview URL.

### 6. Side-by-side comparison (~10 min)

Open production (`https://www.d-island-girl.com`) and preview side-by-side. For each pilot post, compare:

| Element | Production (markdown) | Preview (Notion) | Match? |
|---|---|---|---|
| Title rendering | | | |
| Excerpt / pull-quote | | | |
| Body paragraph spacing | | | |
| Bold formatting | | | |
| Date display | | | |
| Prev/Next navigation | | | |
| Category chip | | | |

Listing pages:

| Element | Production | Preview | Match? |
|---|---|---|---|
| `/` "Fresh off the pen" cards | | | |
| `/` "From the notebook" grid | | | |
| `/writings` filter chips | | | |
| `/writings` search behavior | | | |

### 7. Decision point

- **All match → backfill the rest.** Continue to step 8.
- **Discrepancies found → fix in renderer, redeploy preview, recompare.** Don't merge until parity.

### 8. Backfill remaining 23 (~3 min)

Drop `IMPORT_LIMIT`:

```bash
npm run import:notion
```

Existing 3 are skipped (idempotent). 23 new drafts created in Notion.

### 9. Bulk-flip to Published in Notion

In the Writings database, multi-select all Draft rows → set Status = Published.

### 10. Revalidate + verify on preview

```bash
curl "https://<preview-url>.vercel.app/api/revalidate?secret=$REVALIDATE_SECRET"
```

Refresh `/` and `/writings` on preview. Confirm all 26 posts now appear.

### 11. Merge → production

```bash
git checkout main
git merge feat/notion-cms
git push
```

Production now reads from Notion. The markdown files in `content/posts/` stay in the repo as a durable backup (don't delete them yet — keep at least until you're confident in the new system after a few weeks of real use).

---

## What to watch in the first week

- **Notion API rate limits.** 3 requests/sec average. Personal blog traffic won't get close.
- **Image expiring URLs.** Notion-hosted images use signed URLs that expire after ~1 hour. ISR refreshes them at most every 60s, so the only failure mode is a cached page going stale right before someone loads an image. Mitigation if it bites: lower `revalidate` to 30s or move images to a CDN. None of the current 26 posts have images, so this is theoretical for now.
- **Vercel build time.** Build now fetches from Notion at build → expect +20–40s vs. the markdown version. Acceptable.

---

## What to delete after 30 days of stable operation

- `content/posts/*.md` — markdown source no longer needed once Notion is the source of truth and you've verified backups.
- `gray-matter` dependency — only used by the migration script and old data layer.
- `scripts/import-to-notion.ts` — one-shot, can move to a git tag for archival.

Keeping them costs nothing and provides peace of mind. Suggest revisiting in May 2026.
