# Pole² — Landing

The public home / waiting-list page for **Pole²**. A calm, static, Italian-only
site built with [Astro](https://astro.build) — zero JS by default, self-hosted
brand fonts, deployable to any static host for `pole2.it`.

It intentionally mirrors the app's design system (see `docs/LANDING_RATIONALE.md`
and the brand docs in the Flutter project).

## Develop

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # -> dist/  (static)
npm run preview    # serve the built site
```

## Structure

```
src/
  layouts/Base.astro        # <head>, SEO/OG, JSON-LD, skip link, scroll-reveal
  pages/index.astro         # the one page (hero → why → how → privacy → story → waitlist)
  components/
    Wordmark.astro          # Pole² wordmark (Work Sans)
    TurtleShell.astro       # the guardian (generated honeycomb SVG, slow breathing)
    HexTexture.astro        # faint background honeycomb
    WaitlistForm.astro      # provider-agnostic email capture (no backend yet)
  styles/global.css         # design tokens mirrored from the app
public/
  fonts/                    # Inter + Work Sans (self-hosted variable fonts)
  favicon.svg, og.svg
```

## Forms (waitlist + support)

Real backend on **Cloudflare Pages Functions + D1** (source of truth), with
**Turnstile** and **Resend** (support notification only). Endpoints:
`POST /api/waitlist`, `POST /api/support` (see `functions/`). The waitlist form
now shows success **only** after a durable 2xx — there is no local "fake
success". Support lives at `/supporto`; privacy at `/privacy`.

Setup, D1 migration, secrets, export/delete/purge commands and the exact manual
checklist are in **`docs/FORMS_BACKEND.md`**. Run the Node tests with
`npm test`.

> The private forwarding mailbox for `support@pole2.app` is configured **only**
> in Cloudflare Email Routing (dashboard) and never appears in this repo.

## Deploy (Cloudflare Pages)

Static output → any host. On **Cloudflare Pages**:

1. Dashboard → **Workers & Pages → Create → Pages → Connect to Git**, authorize
   GitHub, pick `lcarzaniga/pole2-landing`.
2. Build settings — Framework preset **Astro**, Build command `npm run build`,
   Output directory `dist`. (Node **22** is pinned via `.node-version` — required
   by Cloudflare's Workers deploy tool `wrangler`.)

> This is a pure static site, so **Pages** (above) is the simplest fit — no
> adapter, no `wrangler`. Cloudflare's newer **Workers** import flow also works:
> it auto-applies the `@astrojs/cloudflare` adapter and deploys via
> `wrangler versions upload`, which needs Node ≥ 22 (hence the pin). The
> SESSION-KV / sharp warnings in that flow are harmless for a static site.
3. **Save and Deploy** → a `*.pages.dev` URL builds in ~1 min. Every push to
   `master` redeploys.
4. Custom domain: project → **Custom domains → Set up a domain** →
   **`pole2.app`** (canonical) and keep **`pole2.it`** as an alias on the **same**
   project so `/releases/latest.json` keeps serving the installed app. Requires
   the domains on Cloudflare DNS. See `docs/FORMS_BACKEND.md` for the pole2.it
   redirect/alias decision.

The `functions/` directory is deployed automatically as Pages Functions (no
adapter, no `wrangler` for the static build). The forms need a **D1** database +
secrets — see **`docs/FORMS_BACKEND.md`** for the one-time setup and the exact
manual checklist.

`robots.txt`, `_headers` (immutable caching + security headers), and the sitemap
are already in the build. **Before launch:** subset the fonts to `woff2` and
generate a raster OG image (see `docs/LANDING_RATIONALE.md`).
