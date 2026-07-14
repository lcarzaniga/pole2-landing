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

## Waiting list

No backend yet. To attach a provider, pass an `endpoint` to `<WaitlistForm />`
(or set `data-endpoint`); it POSTs `{ email }` form-encoded. See the component
header and `docs/LANDING_RATIONALE.md`.

## Deploy (Cloudflare Pages)

Static output → any host. On **Cloudflare Pages**:

1. Dashboard → **Workers & Pages → Create → Pages → Connect to Git**, authorize
   GitHub, pick `lcarzaniga/pole2-landing`.
2. Build settings — Framework preset **Astro**, Build command `npm run build`,
   Output directory `dist`. (Node 20 is pinned via `.node-version`.)
3. **Save and Deploy** → a `*.pages.dev` URL builds in ~1 min. Every push to
   `master` redeploys.
4. Custom domain: project → **Custom domains → Set up a domain** → `pole2.it`
   (and `www`). Requires `pole2.it` to be on Cloudflare DNS (add the site and
   point the registrar's nameservers at Cloudflare).

`robots.txt`, `_headers` (immutable caching + security headers), and the sitemap
are already in the build. **Before launch:** subset the fonts to `woff2` and
generate a raster OG image (see `docs/LANDING_RATIONALE.md`).
