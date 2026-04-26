# Notion database schema — Random Musings CMS

This is the source-of-truth spec for the Notion database that powers the site.
Build it once, share it with the writer, and the site reads from it.

---

## 1. Create the database

1. In **your** Notion workspace (Option A ownership: Johny owns, Dimpy gets Can edit), create a new page called `Random Musings`.
2. Inside it, add a **Full-page database**. Name it `Writings`.
3. Add the properties below. **Property names are case-sensitive — type them exactly as written**, the code reads them by name.

---

## 2. Properties

| Property name | Type | Required | Notes |
|---|---|---|---|
| `Title` | Title | Yes | Article headline. This is the default Notion title field — just rename it. |
| `Slug` | Text | Yes | URL slug. Lowercase, hyphenated. **Must match existing slugs for the 26 already-published pieces** (e.g. `oh-no-not-again`). The import script handles this. |
| `Excerpt` | Text | Yes | 1–2 sentence summary. Shown on cards and as the pull-quote at the top of each article. |
| `Category` | Select | Yes | One of the 10 controlled categories below. Drives the filter UI on `/writings` and the colored tag on cards. |
| `Sub-tags` | Multi-select | No | Optional finer-grained tags. Not shown in UI yet — reserved for future search/filtering. |
| `Publish Date` | Date | Yes | Date for sort order + display. Format on site: `Month DD, YYYY`. |
| `Status` | Select | Yes | `Draft` / `Published` / `Scheduled`. Only `Published` rows appear on the site. |
| `Featured` | Checkbox | No | Optional. Top 3 most-recent `Published` posts always appear in "Fresh off the pen" — `Featured` is reserved for manual override later if needed. |
| `Cover` | Files & media | No | Optional cover image. Not used in the current design but supported for future. |

---

## 3. `Category` Select options (create these now)

Add all ten upfront so the import script can map cleanly:

1. `Self-growth`
2. `Mental health`
3. `Self`
4. `Life & lifestyle`
5. `People & relationships`
6. `Books & poetry`
7. `Food`
8. `Perspective`
9. `Pop culture`
10. `Joy & inspiration`

> **Why these:** Consolidated from 30+ thin tags in the original markdown frontmatter. Keeps the `/writings` filter row scannable (currently 8 chips max). She can still tag finely via `Sub-tags`.

---

## 4. `Status` Select options

1. `Draft` — invisible to the site
2. `Published` — live
3. `Scheduled` — invisible to the site, reserved for future scheduled-publish feature

---

## 5. Recommended database views (for her writing UX)

In the Notion database, create these views:

| View | Filter | Sort |
|---|---|---|
| **All** | (none) | Publish Date ↓ |
| **Published** | Status = Published | Publish Date ↓ |
| **Drafts** | Status = Draft | Last edited ↓ |
| **By category** | (none) | Group by Category |

---

## 6. Sharing with the writer

1. Click **Share** on the `Writings` database page.
2. Invite her email.
3. Set permission to **Can edit** (NOT Full access — Can edit prevents her from accidentally renaming properties or deleting the database).

---

## 7. Connecting the integration

1. Go to https://www.notion.so/my-integrations
2. Click **+ New integration**.
3. Name it `Random Musings Site`. Associate it with your workspace. Internal integration. Permissions: **Read content** only (no write needed for the site).
4. Copy the **Internal Integration Token** — this is `NOTION_TOKEN`.
5. Open the `Writings` database page → top-right `•••` menu → **Connections** → **Add connection** → search for `Random Musings Site` → confirm.
6. Open the database as a full page → copy the URL. The 32-char hex string is the `NOTION_DATABASE_ID`.

Both values go into Vercel env vars (see `docs/deployment.md`).

---

## 8. Writing workflow (her side, once live)

1. Open the `Writings` database in Notion.
2. Click `+ New` to add a row.
3. Fill in: Title, Slug, Excerpt, Category, Publish Date.
4. Click into the page (the title row) and write the article body.
5. When ready: set Status to `Published`. The site updates within ~60 seconds.
6. To edit a published article: just edit the page. Changes appear within ~60 seconds.

That's the entire workflow. No code, no deploys, no Git.
