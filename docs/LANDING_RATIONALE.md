# Pole² Landing — Rationale

*Milestone 13. A public home for Pole² — the first place someone should **feel**
what it is. Not a marketing page. It must read like the app: calm, ordered,
private, permanent.*

This document explains every major decision, why each section exists, what was
deliberately left out, and a critical self-review. It is faithful to
`docs/BRAND_BIBLE.md`, `docs/BRAND_UX_MANIFESTO.md`, and `docs/DESIGN_SYSTEM.md`
in the Flutter project (the source of truth for the brand).

---

## Stack: Astro (static)

**Why Astro.** The page's job is feeling + one email field. It is content, not
an application. Astro ships **zero JavaScript by default** — the output is HTML +
CSS — which is the fastest, most accessible, most SEO-friendly thing a page can
be. Islands let *only* the waitlist form carry a sliver of JS, progressively
enhanced. Static generation means it deploys to any host for `pole2.it`
(Netlify / Vercel / Cloudflare Pages / GitHub Pages) with no server.

**Why not Next.js / React.** A React SPA ships a runtime (tens of KB of JS) to
render a page that needs almost none, hurting load, battery, and the calm we're
trying to convey. Next is superb for apps; this is a document.

**Why not plain HTML.** Astro gives components (Wordmark, TurtleShell,
HexTexture, WaitlistForm), a layout with SEO/OG in one place, a sitemap, and a
clean path to a second page later — at *zero* runtime cost over hand-written
HTML. Best of both.

**Design tokens are mirrored, not imported.** The exact hex values, fonts, and
motion feel are copied from the app's tokens into `src/styles/global.css`, so the
site is visibly the same product. The brand fonts (Inter, Work Sans) are the
same files the app bundles — self-hosted, never fetched at runtime, honouring the
offline/privacy principle even here.

---

## The page, section by section

Every section maps to one of the three — and only three — goals: **explain**,
**make felt**, **collect an email**. Anything that served none was cut.

1. **Hero.** Communicates everything in seconds: the wordmark (brand), the motto
   (*Custodisci ciò che conta. Conta ciò che custodisci.*), one calm sentence
   describing the *feeling* not features, one primary CTA, and the guardian
   turtle breathing slowly. A one-line privacy reassurance sits under the CTA
   because privacy is a core promise, not fine print. **No nav, no login, no
   pricing** — nothing to decide but "yes, tell me when it's ready."

2. **Perché esiste (Why).** Names the real problem in the user's own terms:
   *we don't lose objects, we lose their story* — receipts, manuals, warranties,
   purchase memories, maintenance history. This is the emotional core: it reduces
   the anxiety of "where's the receipt when I need it?" Presented as calm chips,
   not a feature grid.

3. **Come ci si sente (How it feels).** Three *conceptual* steps — **Conserva ·
   Respira · Ritrova** — deliberately not a feature list. "Respira" (breathe)
   carries the peace-of-mind promise and the turtle's calm. It says how using
   Pole² *feels*, not what buttons it has.

4. **Privacy.** Given its own strong, petrol-on-dark section (the most confident
   surface) because privacy is one of the strongest product messages: everything
   on your device, no ads, no tracking, no mandatory cloud, and future sharing
   always user-controlled. Closes with the manifesto line: *protegge i tuoi
   interessi, non le sue metriche.*

5. **Il nome (Brand story).** The origin of "pole pole" — *piano piano*, slowly,
   calmly — and the ² wordplay, told as something to **discover**, not a pitch.
   It rewards curiosity without over-explaining (the Bible: "users don't need to
   understand it immediately").

6. **Lista d'attesa (Waiting list).** One email field, one calm promise ("we'll
   write once, when it's ready"). The single conversion goal, with no pressure.

7. **Footer.** Wordmark + the privacy line, nothing more. No sitemap of links a
   pre-launch product doesn't have.

---

## What was intentionally omitted

- **No navigation bar, no login, no pricing, no app-store badges.** The app
  isn't out; furniture would be fake and would break calm.
- **No feature list, no screenshots-carousel, no comparison table.** The brief
  is to convey *feeling*, and the app's UI is still evolving.
- **No urgency, scarcity, countdowns, "join 10,000 others", or social proof.**
  The manifesto forbids manufactured anxiety; a waitlist for a peace-of-mind
  product must not create the very stress it removes.
- **No cookie banner / analytics / tracking pixels.** There is nothing to
  consent to because we track nothing — which is itself on-brand.
- **No hero video, no autoplay media.** Per the animation rules.
- **No second language.** The app is Italian-only for now; the site matches.
- **No backend.** Per the brief — UI + architecture only (see below).

---

## Waiting list architecture (no backend yet)

`WaitlistForm.astro` is complete UI plus a provider-agnostic submit handler.
Today, with no `endpoint`, it validates and shows the calm confirmation locally.
To attach a provider later (Mailchimp, ConvertKit, Buttondown, self-hosted…),
set the `endpoint` prop (or `data-endpoint`); the handler already POSTs
`{ email }` as form-encoded and handles success/failure calmly. **No redesign
required — only the endpoint changes.** The form also degrades gracefully: it is
real HTML that could POST natively if JS never runs.

---

## Motion

CSS-only, and bound by the same rules as the app: slow, purposeful,
interruptible, and **Reduce Motion compatible**. The turtle breathes (scale
0.99↔1, 7s) and holds still under `prefers-reduced-motion`. Sections reveal once
on scroll via a tiny `IntersectionObserver` — a pure enhancement: without JS, or
with Reduce Motion, everything is simply visible. No parallax, no scroll-jacking,
no autoplay.

---

## Accessibility

- Semantic landmarks (`header`/`main`/`section`/`footer`), one `h1` (the
  wordmark), logical heading order, `aria-labelledby` per section.
- Skip link to `#contenuto`. Visible, calm `:focus-visible` rings (gold) on every
  interactive element.
- Form: real `<label>`, `type=email`, `inputmode`, `autocomplete`, `aria-invalid`
  on error, and an `aria-live` status region for calm feedback.
- Colour: text/background pairs use the app's AA-checked tokens; decorative
  texture and the turtle are `aria-hidden`.
- Reduce Motion fully honoured.

---

## SEO

- Static HTML with real content (crawlable without JS), unique `<title>` and
  meta description, canonical URL, `lang="it"`.
- Open Graph + Twitter card, `og:locale it_IT`, theme-color.
- `WebSite` JSON-LD structured data.
- `@astrojs/sitemap` generates `sitemap-index.xml`; add a `robots.txt` at deploy.

---

## Performance notes

- **~0 KB of framework JS.** The only scripts are the tiny inline `js`-class
  flag, the scroll-reveal observer, and the form handler — all inlined.
- CSS is small and mostly inlined by Astro.
- **Known cost — fonts.** Inter and Work Sans ship as **variable TTF** (~876 KB
  and ~361 KB) because this environment lacks `woff2`/subsetting tooling. They
  load with `font-display: swap` (text paints immediately in a fallback) and only
  Work Sans is preloaded. **The #1 production optimisation is to subset both to
  `woff2`** (typically ~90% smaller); this is a build-tooling task, not a redesign.
- LCP is the hero text/wordmark, painted on the first frame with a system-font
  fallback, swapped to the brand font when ready.

---

## Emotional pass (redesign)

A later review judged the first version *intellectually descriptive* — a good SaaS
landing that **explained** rather than **made felt**. The redesign trades
explanation for recognition and implication:

- **Signature line added:** the visitor's own inner voice, **«So di averlo. Ma
  dov'è?»**, is now the centrepiece of a short narrative section right after the
  hero. It makes a stranger think *"that's me"* before *"I want this app."*
- **Hero** dropped its descriptive sentence for an emotional one (*La pace di
  sapere dov'è ciò a cui tieni.*). The motto lockup stays — it's the verbal
  signature.
- **Feature chips removed.** The list of nouns (receipts, manuals, warranties…)
  became a human refrain in prose — *La ricevuta. La garanzia. Il manuale…*
- **"01/02/03" numbers removed** from the three beats (numbers read as *process/
  work*, the opposite of calm); replaced with a quiet gold hexagon mark. Heading
  reframed from "how it works" to a feeling: *Affidare. E lasciar andare.*
- **Privacy became a confident pillar** — *Pole² funziona senza chiederti nulla.
  Niente cloud. Niente account. Niente abbonamento.* — stated as identity, calm,
  never ideological.
- **CTA** changed from the generic *Avvisami quando sarà disponibile* to **Tienimi
  un posto** — joining something, being kept a place, not entering a mailing list.
- **The guardian is now quietly alive:** besides the slow breath, a rare gold
  shimmer crosses the shell once every ~16s (Reduce-Motion disables it). Not a
  mascot trick — a breath of light that says *someone is watching over this*.

The brand identity was preserved exactly (turtle, honeycomb, petrol, Work Sans
wordmark). This was an improvement, not a restart.

## Brand-consistency pass (M14 — canonical Kobe)

A focused polish milestone, no structural change. The turtle was brought to a
**canonical geometry** (documented in `BRAND_BIBLE.md §10a`,
`DESIGN_SYSTEM.md §3.4a`) as a reusable component, `src/components/Kobe.astro`
(replacing `TurtleShell.astro`):

- **Elliptical shell** (h/v ratio **0.90**, taller than wide) — no longer a
  circle.
- **Tessellated shell scutes** — a regular hex grid fully tessellated across the
  shell and **clipped by the ellipse**, with a recognizable **7-cell core** (1
  central + 6) always present and additional cells continuing to the clipped
  edge. (Corrected from the first M14 pass, which stopped at a lone 7-cell
  "flower"; see the geometry study.) Distinct from the free-cell `HexTexture`.
- **Rounded bullet head** (domed top, softly rounded base) — not a circle.
- Four soft diagonal limbs + a **rounded tail nub** — not a triangle.
- **Figure-ground separation** (Kobe was blending into the petrol hero): a **soft
  warm halo** behind Kobe, a **satin sheen** on the shell, and a darker body tone
  so limbs read against both the light and dark ends of the hero gradient. No
  outlines/shadows/spotlight — Kobe *emerges* rather than being highlighted.
- **Idle presence:** the old shimmer was imperceptible. Replaced with an
  **infrequent** (~9–14 s), clearly-visible satin shimmer, JS-driven so it
  **pauses on inactive tab** and is **off under Reduce Motion**. One-shot, never
  continuous — presence, not engagement.

**Cross-product discrepancy (documented, not silently allowed).** Before M14 the
landing turtle and the Flutter app (`lib/shared/brand/turtle_mascot.dart`) shared
the *same* non-canonical geometry (circular shell, many-cell honeycomb, circular
head, triangular tail). The **landing is now the first corrected implementation**
of the canonical geometry; the **Flutter app is intentionally left unchanged this
milestone** and is to be updated to match later. The canonical spec lives in
`BRAND_BIBLE.md §10a` so both products converge on one Kobe.

## Critical self-review (as if reviewing another team's work)

- **Fonts are the weak point.** Shipping 1.2 MB of TTF is not "extremely fast."
  It's mitigated (swap, single preload, non-blocking) but must be subset to woff2
  before launch. I flagged it rather than hide it.
- **The OG image is an SVG.** Great for fidelity, but several social scrapers
  prefer raster; a 1200×630 PNG should be generated for production (blocked here
  by the lack of a rasteriser).
- **Two big inline hex-texture SVGs** inflate the HTML (~55 KB uncompressed).
  It gzips well, but a single reusable CSS-tiled pattern would be leaner.
- **"Respira" as step 2** is a small risk — it's evocative, not literal. I judged
  it on-brand (peace of mind, the turtle), but it's the one line most worth a
  second opinion.
- **The hero caps at 920 px** so it never becomes an empty petrol expanse on tall
  monitors — a deliberate trade against a strictly full-viewport hero.
- **No analytics** means we can't measure waitlist conversion. That is the
  correct brand call (no tracking), but worth stating plainly: success will be
  judged by the provider's list count once one is attached, nothing more.
- **Copy discipline held:** no "AI", no "organizza la tua vita", no "produttività",
  no "rivoluzionario", no "smart", no hype. Every line aims to reduce anxiety.
