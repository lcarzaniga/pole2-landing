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

## Deploy

`npm run build` → deploy `dist/` as static files. Set the domain to `pole2.it`
and add a `robots.txt`. Before launch: subset the fonts to `woff2` and generate a
raster OG image (see rationale).
