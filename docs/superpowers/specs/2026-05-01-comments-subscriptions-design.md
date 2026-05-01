# Design spec — Comments + Subscriptions
**Date:** 2026-05-01
**Status:** Approved for implementation

---

## Overview

Two features added to the Random Musings blog:

1. **Comments** — a section at the end of every post where readers leave their name and a comment. All comments are held for approval before appearing publicly. Dimpy approves via Notion (same workflow as publishing posts). Johny has visibility through Notion directly.

2. **Subscriptions** — the existing subscribe form is wired to Resend Audiences. When Dimpy publishes a new post, a broadcast email (title + excerpt + link) is sent to all subscribers automatically via a Notion automation.

Both features use **Resend** as the email provider.

---

## Decisions log

| Decision | Choice | Reason |
|---|---|---|
| Comment storage | Notion (new Comments DB) | Familiar to Dimpy; approval UX identical to publishing posts |
| Comment form fields | Name + Comment only | Lowest friction; anonymous-friendly |
| Comment approval notified | Dimpy (email) | She's the author; Johny has Notion visibility |
| Email provider | Resend | Simple API, generous free tier, handles both transactional + broadcast |
| Subscriber list storage | Resend Audiences | Built-in unsubscribe compliance (CAN-SPAM / GDPR) |
| Subscriber trigger | Separate `/api/notify-subscribers` endpoint | Clean separation from ISR revalidation; easier duplicate guard |
| Subscriber email style | Standard (title + excerpt + CTA button) | Warm and personal; gives readers a taste without feeling like marketing |

---

## Feature 1 — Comments

### Notion schema — new `Comments` database

Create a new full-page database called `Comments` inside the same Notion workspace. Property names are exact (code reads by string):

| Property | Type | Notes |
|---|---|---|
| `Name` | Title | Commenter's display name |
| `Comment` | Text | The comment body |
| `Post Slug` | Text | Slug of the article being commented on (e.g. `oh-no-not-again`) |
| `Status` | Select | `Pending` (default) · `Approved` · `Rejected` |
| `Submitted At` | Date | Set by the API on creation |

Connect the Notion integration (`Random Musings Site`) to the Comments database with **Insert + Read** permissions. The integration already has Read on Writings; it will also need **Update** on Writings for `/api/notify-subscribers` to set the `Notified` checkbox — update the integration capabilities in Notion settings.

Add `NOTION_COMMENTS_DATABASE_ID` to Vercel env vars (and `.env.example`).

### API routes

#### `POST /api/comments`
Accepts a comment submission from the blog. Writes a new row to the Comments Notion DB with Status = Pending, then sends a notification email to Dimpy via Resend.

Request body:
```json
{ "name": "string", "comment": "string", "slug": "string", "postTitle": "string" }
```

Validation:
- `name`: required, 1–80 chars, strip HTML
- `comment`: required, 1–1000 chars, strip HTML
- `slug`: required, must match `^[a-z0-9-]+$`
- `postTitle`: required (used in the notification email subject)

Rate limiting: basic in-memory check — max 3 submissions per IP per hour. Returns 429 if exceeded. (Honeypot field in the form provides a second layer.)

Response:
- `200 { ok: true }` — comment queued for approval
- `400 { ok: false, error: string }` — validation failure
- `429 { ok: false, error: "Too many submissions" }` — rate limited
- `500` — Notion or Resend error (logged, not surfaced to user)

#### `GET /api/comments?slug=<slug>`
Returns all `Approved` comments for a given post slug, sorted oldest-first.

Response:
```json
{ "comments": [{ "name": "string", "comment": "string", "submittedAt": "YYYY-MM-DD" }] }
```

Cached at the Next.js page level (`revalidate = 60`). On-demand revalidation of `/writings/<slug>` via the existing webhook will also refresh comments.

### Notification email to Dimpy (Resend transactional)

Sent from: `noreply@d-island-girl.com` (or the Resend-provided domain)
To: Dimpy's email address (stored as `DIMPY_EMAIL` env var)
Subject: `New comment on "{{ postTitle }}"`

Body (plain text + HTML):
> Someone left a comment on **{{ postTitle }}**.
>
> **Name:** {{ name }}
> **Comment:** {{ comment }}
>
> [Approve or reject in Notion →]

The Notion link goes to the Comments database filtered to Pending.

### UI — `CommentsSection` component

New client component `src/components/CommentsSection.tsx`. Placed at the bottom of `src/app/writings/[slug]/page.tsx`, below `<NotionRenderer>` and above `<ArticleNav>`.

**Displays:**
- Section heading: "Thoughts & reflections" (or similar warm label)
- List of approved comments (name + comment + date), fetched client-side from `GET /api/comments?slug=`
- Comment submission form: Name field + Comment textarea + Submit button
- States: idle · submitting · success ("Your comment is in — thank you!") · error

**Honeypot spam guard:** a visually hidden `<input name="website" tabIndex={-1} />` field. If it has a value on submission, the API silently accepts but discards the comment.

**Empty state:** "Be the first to leave a thought." — shown when no approved comments exist.

---

## Feature 2 — Subscriptions

### `POST /api/subscribe`

Wires the existing `SubscribeSection.tsx` form to Resend Audiences.

Request body: `{ "email": "string" }`

Validation:
- Valid email format
- Max length 254 chars

Behaviour:
- Calls Resend Contacts API to add the email to the configured Audience
- If the email already exists in the audience, Resend returns a no-op — treat as success
- Returns `200 { ok: true }` on success

Env vars needed: `RESEND_API_KEY`, `RESEND_AUDIENCE_ID`

### `POST /api/notify-subscribers`

Triggered by a new Notion automation when Status → Published on a Writings row.

Query params: `?secret=<REVALIDATE_SECRET>&slug=<slug>`

Behaviour:
1. Validate secret (same `REVALIDATE_SECRET` used by `/api/revalidate`)
2. Fetch the post from Notion by slug
3. Check the `Notified` checkbox — if already `true`, return `200 { ok: true, skipped: true }`
4. Send broadcast email via Resend to the full Audience
5. Set `Notified = true` on the Writings row via Notion API
6. Return `200 { ok: true, sent: true }`

Env vars needed: `RESEND_API_KEY`, `RESEND_AUDIENCE_ID`, `RESEND_FROM_EMAIL`

### Notion changes to Writings DB

Add one new property to the existing Writings database:

| Property | Type | Notes |
|---|---|---|
| `Notified` | Checkbox | Checked automatically by `/api/notify-subscribers` after broadcast. Prevents duplicate sends on re-publish or edits. |

### New Notion automation

In the Writings database:
- Trigger: Status changes to `Published`
- Action: POST to `https://www.d-island-girl.com/api/notify-subscribers?secret=<REVALIDATE_SECRET>&slug={Slug}`

This is a second automation alongside the existing revalidation one. Both fire on publish; they are independent.

### Subscriber email template

**Subject:** `New on Random Musings — {{ postTitle }}`
**From:** `Dimpy <hello@d-island-girl.com>` (or the Resend-provided domain)

```
[Random Musings wordmark]

New piece

{{ postTitle }}

{{ excerpt }}

[Read the full piece →]  ← accent-colored button

—
Written with honesty & a large cup of chai
d-island-girl.com · Unsubscribe
```

Resend handles the unsubscribe link injection automatically when sending to an Audience.

### `SubscribeSection.tsx` changes

Replace the `▼▼▼ REPLACE THIS BLOCK ▼▼▼` placeholder in `handleSubmit` with a real `fetch('POST /api/subscribe', { email })` call. No other UI changes needed — the success/error states are already built.

---

## New env vars

Add to `.env.example` and Vercel (Production + Preview + Development):

```
RESEND_API_KEY=re_...
RESEND_AUDIENCE_ID=...           # From Resend dashboard → Audiences
RESEND_FROM_EMAIL=hello@d-island-girl.com
DIMPY_EMAIL=dimpy@...            # Notification recipient for new comments
NOTION_COMMENTS_DATABASE_ID=... # 32-char ID of the new Comments DB
```

---

## New files

```
src/
├── app/
│   └── api/
│       ├── comments/route.ts          # GET + POST
│       ├── subscribe/route.ts         # POST
│       └── notify-subscribers/route.ts # POST
└── components/
    └── CommentsSection.tsx            # Comment form + approved comments list
```

---

## Caveats & known constraints

- **No email for commenters.** Since we collect name-only, we cannot notify a commenter when their comment is approved. This is acceptable for v1.
- **Rate limiting is in-memory.** On Vercel's serverless functions, each instance has its own memory — the 3/hr limit is per-instance, not global. Sufficient for a personal blog; the honeypot provides additional protection.
- **Notion image URL expiry doesn't affect comments.** No images in comments.
- **Resend free tier** is 3,000 emails/month. A personal blog with a small subscriber list won't approach this.
- **`Notified` checkbox must be set before the Writings DB is shared with Dimpy** — she'll see the new field and should understand it's managed automatically.
- **Notion API write permissions.** The existing integration token has Insert + Read for Writings. `/api/notify-subscribers` needs Update permission on Writings (to set `Notified`). Update the integration capabilities in Notion settings before testing.
- **Resend domain verification required.** To send from `hello@d-island-girl.com` or `noreply@d-island-girl.com`, the domain must be verified in the Resend dashboard (DNS records → add to Namecheap). Until verified, Resend can only send from their shared domain. Do this before wiring the Notion automations.
