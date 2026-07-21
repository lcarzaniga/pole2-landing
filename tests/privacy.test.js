import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const PRIVACY = join(process.cwd(), 'dist', 'privacy', 'index.html');
const html = () => readFileSync(PRIVACY, 'utf8');

// Plain text of the page: tags removed and whitespace collapsed, so the checks
// survive inline <strong> markup and source line wrapping. Skipped until built.
const privacyText = () =>
  html()
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');

test('privacy states the technical-cookie facts accurately', { skip: !existsSync(PRIVACY) }, () => {
  const t = privacyText();
  // The dedicated technical-cookie section, worded for the Garante's
  // strictly-necessary rules (no prior consent, browser-managed).
  assert.ok(t.includes('Cookie e strumenti tecnici'), 'the technical-cookie section must exist');
  assert.ok(
    t.includes('non utilizza cookie pubblicitari, di profilazione o di analisi delle visite'),
    'must state no advertising/profiling/analytics cookies',
  );
  assert.ok(
    t.includes('strettamente necessari'),
    'must describe strictly-necessary technical tools',
  );
  assert.ok(
    t.includes('non è richiesto il consenso preventivo'),
    'must state no prior consent is required for strictly-necessary tools',
  );
  assert.ok(
    t.includes('impostazioni del browser'),
    'must point users to browser settings to manage/delete cookies',
  );

  // Accurate Turnstile wording — technical signals + possibly strictly-necessary
  // identifiers/local storage, never used for ads/profiling/visit analytics.
  assert.ok(
    t.includes('elaborando segnali tecnici del dispositivo e della connessione'),
    'Turnstile must be described as processing technical device/connection signals',
  );
  assert.ok(
    t.includes('identificatori o memoria locale strettamente necessari alla sicurezza'),
    'Turnstile may use strictly-necessary security identifiers/local storage',
  );
  assert.ok(
    t.includes('non impiegati da Pole² per pubblicità, profilazione o analisi delle visite'),
    'Turnstile signals must not be used by Pole² for ads/profiling/analytics',
  );
});

test('the old absolute "senza cookie" claim is gone', { skip: !existsSync(PRIVACY) }, () => {
  const raw = html();
  assert.ok(!raw.includes('senza cookie'), 'no universal "senza cookie" claim may remain');
  assert.ok(
    !raw.includes('verifica anti-spam senza cookie'),
    'the old Turnstile "senza cookie" line must be gone',
  );
});

test('privacy preserves the core disclosures and canonical', { skip: !existsSync(PRIVACY) }, () => {
  const raw = html();
  const t = privacyText();
  // No analytics / no advertising or profiling (app + site).
  assert.ok(t.includes('non c’è analitica né tracciamento'), 'app "no analytics/tracking" fact preserved');
  // Provider disclosures intact.
  assert.ok(t.includes('Cloudflare'), 'Cloudflare disclosure preserved');
  assert.ok(t.includes('Resend'), 'Resend disclosure preserved');
  assert.ok(t.includes('Cloudflare Turnstile'), 'Turnstile disclosure preserved');
  // Ko-fi remains an external mention only — never an embedded widget/iframe.
  assert.ok(t.includes('Ko-fi'), 'Ko-fi disclosure preserved');
  assert.ok(!/ko-?fi\.com\/widget|storage\.ko-?fi\.com|<iframe[^>]*ko-?fi/i.test(raw), 'no embedded Ko-fi widget');
  // Canonical stays pole2.app-only.
  assert.ok(
    raw.includes('<link rel="canonical" href="https://pole2.app/privacy'),
    'canonical must remain pole2.app-only',
  );
});

test('privacy introduces no tracker or cookie-banner/CMP', { skip: !existsSync(PRIVACY) }, () => {
  const raw = html().toLowerCase();
  // Common analytics/tracking signatures must be absent.
  for (const sig of [
    'google-analytics',
    'googletagmanager',
    'gtag(',
    'plausible.io',
    'matomo',
    'fbevents',
    'hotjar',
    'clarity.ms',
    'segment.com',
  ]) {
    assert.ok(!raw.includes(sig), `tracker signature must be absent: ${sig}`);
  }
  // No consent-management platform / cookie-banner markup or accept-all buttons.
  for (const sig of [
    'cookiebot',
    'iubenda',
    'usercentrics',
    'onetrust',
    'cookieconsent',
    'cookie-banner',
    'cookie-consent',
    'accetta i cookie',
    'rifiuta i cookie',
    'accetta tutti',
  ]) {
    assert.ok(!raw.includes(sig), `cookie-banner/CMP markup must be absent: ${sig}`);
  }
});
