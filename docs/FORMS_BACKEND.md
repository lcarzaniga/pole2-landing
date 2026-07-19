# Forms backend (waitlist + support) — Cloudflare Worker + Static Assets + D1

The landing has a real backend for two forms, served by the **same Cloudflare
Worker** that serves the static site (no separate host, no CORS):

- **Waitlist** — `POST /api/waitlist` → `functions/api/waitlist.js`
- **Support** — `POST /api/support` → `functions/api/support.js`
- Shared helpers — `functions/_lib/*.js`
- Worker entrypoint/router — `worker.js`
- Worker config — `wrangler.jsonc`
- Schema — `migrations/0001_forms.sql`

## Deployment model (IMPORTANT): Worker + Static Assets, **not** Pages

Production is a **Cloudflare Worker with a Static Assets binding**, not a classic
Pages project. Consequences:

- The Pages **`functions/` auto-routing convention does not apply** — a Worker
  never scans a repo-root `functions/` directory. Those files are now just JS
  modules **imported by `worker.js`** (the single `main` entrypoint), which
  routes `/api/waitlist` and `/api/support` to the existing handlers and hands
  everything else to `env.ASSETS.fetch(request)`.
- **`pages_build_output_dir` alone would NOT fix this.** That key is a *Pages*
  build setting; it only tells a Pages build where the static output is and
  enables the Pages `functions/` convention. On a Worker there is no
  `functions/` routing at all, so `pages_build_output_dir` is ignored/irrelevant.
  The fix requires a **Worker entrypoint** (`main`) plus an **`assets`** binding
  with `run_worker_first: ["/api/*"]` — exactly what `wrangler.jsonc` adds.

### `wrangler.jsonc` essentials
- `main: ./worker.js`, `assets.directory: ./dist`, `assets.binding: ASSETS`,
  `assets.run_worker_first: ["/api/*"]` (Worker runs first only for the API;
  all other traffic is served straight from static assets),
  `assets.html_handling: auto-trailing-slash` (preserves Astro's clean URLs).
- `d1_databases: [{ binding: DB, database_name: pole2-forms, database_id: … }]`.
- `vars: { NOTIFY_EMAIL, SUPPORT_FROM }` — **non-secret** public values, declared
  so a config-driven deploy never drops them.
- ⚠️ **`name` must equal the existing production Worker's name** (dashboard →
  Workers & Pages). Verify/edit it **before** the first config deploy, or the
  build targets/creates the wrong Worker.

### Bindings/vars preserved on a config deploy
- **Secrets** (`TURNSTILE_SECRET`, `IP_HASH_SECRET`, `RESEND_API_KEY`) are **not**
  in `wrangler.jsonc`; secrets are stored encrypted and **persist across
  deploys** (config never contains or deletes them). Keep them dashboard-managed
  (or `wrangler secret put`).
- **`DB`** and **`ASSETS`** come from `wrangler.jsonc` (same DB name/id → no
  change).
- **`NOTIFY_EMAIL` / `SUPPORT_FROM`** are in `vars` (non-secret) → preserved.
- **`PUBLIC_TURNSTILE_SITE_KEY`** is a **build-time** variable (baked into
  `./dist` by Astro during `npm run build`); it lives in the **Workers Builds
  build environment**, not as a Worker runtime var, and is unaffected by
  `wrangler.jsonc`. Keep it set in the build config.

### Exact production build / deploy commands
The Git-connected **Workers Builds** must run:
- **Build command:** `npm run build`  (Astro → `./dist`; requires
  `PUBLIC_TURNSTILE_SITE_KEY` in the build env)
- **Deploy command:** `npx wrangler deploy`  (uploads `worker.js` + `./dist`
  assets + `DB` binding using `wrangler.jsonc`)

Local (needs Node ≥ 22): `npm run build && npx wrangler deploy --dry-run` to
validate the config without deploying; `npm run deploy` to deploy.

### Post-deploy verification (the fix worked)
```
curl -s -o /dev/null -w "%{http_code} %{content_type}\n" https://pole2.app/api/waitlist
curl -s -o /dev/null -w "%{http_code} %{content_type}\n" https://pole2.app/api/support
```
Both must return **`405 application/json`** (the handlers' POST-only guard) —
**not** the Astro HTML `404`. A `404 text/html` means the Worker/assets routing
still isn't picking up `worker.js`.

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
