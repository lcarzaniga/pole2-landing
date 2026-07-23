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
  // Bilingual (Pole² 1.0.26): Italian is canonical at the root; English lives
  // under /en/ (prefixDefaultLocale:false keeps every existing Italian URL).
  i18n: {
    defaultLocale: 'it',
    locales: ['it', 'en'],
    routing: {
      prefixDefaultLocale: false,
      redirectToDefaultLocale: false,
    },
  },
});
