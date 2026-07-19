// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Static site (SSG). Zero JS ships unless a component opts in; the only script
// on the page is the tiny progressive-enhancement for the waitlist form.
export default defineConfig({
  // Canonical public domain. pole2.it must remain an alias serving the SAME
  // Cloudflare Pages deployment so /releases/latest.json keeps working for the
  // installed app (see README → custom-domain notes). This value only affects
  // canonical/OG/sitemap URLs, not what is actually served on either domain.
  site: 'https://pole2.app',
  integrations: [sitemap()],
  compressHTML: true,
  build: { inlineStylesheets: 'auto' },
  // Italian only — the app is Italian-only for now (see the Flutter project).
  i18n: {
    defaultLocale: 'it',
    locales: ['it'],
  },
});
