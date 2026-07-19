# Forms backend (waitlist + support) — Cloudflare Pages Functions + D1

The landing has a real backend for two forms, living **inside the same
Cloudflare Pages deployment** (no separate host, no CORS):

- **Waitlist** — `POST /api/waitlist` → `functions/api/waitlist.js`
- **Support** — `POST /api/support` → `functions/api/support.js`
- Shared helpers — `functions/_lib/*.js`
- Schema — `migrations/0001_forms.sql`

**D1 is the source of truth.** Turnstile guards both forms (privacy-first, no
cookies). Resend sends a support notification to `NOTIFY_EMAIL`
(`support@pole2.app`), which **Cloudflare Email Routing** forwards to a private
mailbox configured **only in the dashboard** — that private address never
appears in this repository, in client output, in Functions source, or in logs.

## Bindings & secrets (Cloudflare dashboard / wrangler — never in Git)

| Name | Where | Purpose |
|------|-------|---------|
| `DB` | D1 binding | the D1 database (source of truth) |
| `TURNSTILE_SECRET` | secret | server-side Turnstile verification |
| `RESEND_API_KEY` | secret | support notification email |
| `NOTIFY_EMAIL` | var | `support@pole2.app` (notification To) |
| `SUPPORT_FROM` | var | `Pole² Support <support@pole2.app>` (notification From) |
| `IP_HASH_SECRET` | secret | HMAC key for the abuse IP hash (never store raw IP) |
| `PUBLIC_TURNSTILE_SITE_KEY` | **build** env var | Turnstile widget site key (public; injected at Astro build) |

Only `PUBLIC_TURNSTILE_SITE_KEY` reaches the client (it is public by design). No
other value is ever emitted to the browser.

## Notification email

Plain text, via Resend:

- **From:** `SUPPORT_FROM` (`Pole² Support <support@pole2.app>`)
- **To:** `NOTIFY_EMAIL` (`support@pole2.app`)
- **Reply-To:** the validated user email, set through the Resend API field
  (never inserted as a raw header, never repeated in the body)
- **Subject:** `[Pole²] <category>` — derived only from the fixed category enum
- **Body:** category, app version/build (if any), UTC date, submission id, then
  the user's message. The user's email is **not** duplicated in the body.

## Apply the migration

```bash
# Create the database (one time)
npx wrangler d1 create pole2-forms
# → copy the returned database_id; bind it as DB to the Pages project (Preview + Production)

# Apply the schema
npx wrangler d1 migrations apply pole2-forms            # remote (production)
npx wrangler d1 migrations apply pole2-forms --local    # local dev
```

## Administration (manual — there is NO public admin route)

```bash
# Export the waitlist (CSV-ish)
npx wrangler d1 execute pole2-forms --command \
  "SELECT email, created_at, source FROM waitlist ORDER BY created_at;"

# Find a person's support submissions
npx wrangler d1 execute pole2-forms --command \
  "SELECT id, category, created_at, notification_status FROM support WHERE email = 'user@example.it' ORDER BY created_at DESC;"

# Delete all data for an email (access/erasure request)
npx wrangler d1 execute pole2-forms --command \
  "DELETE FROM waitlist WHERE email = 'user@example.it';"
npx wrangler d1 execute pole2-forms --command \
  "DELETE FROM support  WHERE email = 'user@example.it';"

# Retention purges (run manually; NOT automatic — no scheduled job is configured)
#   Waitlist: after launch, remove rows older than 12 months
npx wrangler d1 execute pole2-forms --command \
  "DELETE FROM waitlist WHERE created_at < datetime('now','-12 months');"
#   Support: remove rows older than 24 months
npx wrangler d1 execute pole2-forms --command \
  "DELETE FROM support WHERE created_at < datetime('now','-24 months');"

# Inspect / retry failed notifications (internal status; never exposed publicly)
npx wrangler d1 execute pole2-forms --command \
  "SELECT id, category, created_at FROM support WHERE notification_status = 'failed' ORDER BY created_at DESC;"
```

> Retention is **not** automatic. There is no scheduled worker; the purges above
> are manual until (and unless) a Cron Trigger is added in a later milestone.

## Optional rate limiting

Cloudflare **dashboard** rate-limiting rules (WAF → Rate limiting) can be added
for `/api/*` (e.g. N requests / minute / IP). **None is configured in this repo**
— the code enforces Origin allowlisting, Turnstile, a honeypot, body-size caps,
and a keyed IP abuse hash, but a dashboard rate-limit rule is an optional extra
you set up manually.

## Manual setup checklist (perform in the Cloudflare / Resend dashboards)

1. Confirm the Pages project is Git-connected to `lcarzaniga/pole2-landing`.
2. Add **`pole2.app`** as a custom domain; keep **`pole2.it`** as an alias on the
   same project so **`/releases/latest.json` keeps working** for the installed
   app. (Decide whether `pole2.it` redirects to `pole2.app`; if you 301, ensure
   `/releases/*` still resolves — `package:http` follows redirects, so a 301 is
   safe, but an alias with no redirect is simplest.)
3. `npx wrangler d1 create pole2-forms`.
4. `npx wrangler d1 migrations apply pole2-forms`.
5. Bind the database as **`DB`** to **Preview and Production**.
6. Create a **Turnstile** widget for `pole2.app` and `pole2.it`.
7. Add its **site key** as the build env var `PUBLIC_TURNSTILE_SITE_KEY`.
8. Add server secrets: `TURNSTILE_SECRET`, `RESEND_API_KEY`, `IP_HASH_SECRET`,
   and vars `NOTIFY_EMAIL=support@pole2.app`, `SUPPORT_FROM=Pole² Support <support@pole2.app>`.
9. Configure **Email Routing**: `support@pole2.app` → your private mailbox
   (dashboard only — not in Git).
10. Verify **`pole2.app`** in Resend with SPF/DKIM so notifications deliver.
11. Confirm `NOTIFY_EMAIL=support@pole2.app`.
12. (Optional) Add a Cloudflare rate-limiting rule for `/api/*`.
13. Deploy (push to `master` triggers the Pages build; Functions deploy with it).
14. Only **after** deploy, perform **one** explicit real waitlist test and **one**
    real support test to confirm end-to-end delivery.
