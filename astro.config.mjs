// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Static site (SSG). Zero JS ships unless a component opts in; the only script
// on the page is the tiny progressive-enhancement for the waitlist form.
export default defineConfig({
  site: 'https://pole2.it',
  integrations: [sitemap()],
  compressHTML: true,
  build: { inlineStylesheets: 'auto' },
  // Italian only — the app is Italian-only for now (see the Flutter project).
  i18n: {
    defaultLocale: 'it',
    locales: ['it'],
  },
});
