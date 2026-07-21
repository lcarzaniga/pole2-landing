import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const GUIDE = join(process.cwd(), 'dist', 'guida', 'index.html');
const html = () => readFileSync(GUIDE, 'utf8');

// The guide is the pre-beta safety document: assert it actually states the
// essential facts a person needs before installing, updating, backing up and
// restoring. Skipped until the site is built.
// Plain text of the guide: tags removed and whitespace collapsed, so the checks
// survive inline <strong> markup and source line wrapping.
const guideText = () =>
  html()
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');

test('the guide states the essential safety facts', { skip: !existsSync(GUIDE) }, () => {
  const h = guideText();
  const needles = [
    'Android 7.0',
    'APK Android universale',
    'Google Play',
    // in-place update preserves data + never uninstall first
    'mantiene i tuoi dati',
    'Non disinstallare',
    // Backup
    'manuale e locale',
    'dimenticata non è recuperabile',
    'nel cloud né un account',
    'dove salvare il file',
    // Restore replaces, stages, rolls back, close+reopen, fresh backup first
    'sostituisce',
    'non li unisce',
    'copia di sicurezza',
    'torna automaticamente',
    'si chiude e va riaperta',
    'nuovo backup dei dati',
    // Safe updates
    'consigliare un backup',
    'continuare senza backup',
    'non si installano mai da soli',
    'blocca un aggiornamento mentre un ripristino',
    'SHA-256',
    // Troubleshooting privacy warning
    'non inviare',
    'Installa app sconosciute',
  ];
  for (const n of needles) {
    assert.ok(h.includes(n), `guide must state: ${n}`);
  }
});

test('the guide links to the official GitHub Releases and the core pages', { skip: !existsSync(GUIDE) }, () => {
  const h = html();
  assert.ok(
    h.includes('https://github.com/lcarzaniga/pole2-app/releases'),
    'must link the official GitHub Releases page',
  );
  for (const path of ['/privacy', '/supporto', '/novita']) {
    assert.ok(h.includes(`href="${path}"`), `must link ${path}`);
  }
});

test('the guide invents no Play Store link', { skip: !existsSync(GUIDE) }, () => {
  const h = html();
  assert.ok(!h.includes('play.google.com'), 'no Play Store link may appear');
});

test('the guide canonical stays pole2.app', { skip: !existsSync(GUIDE) }, () => {
  const h = html();
  assert.ok(
    h.includes('<link rel="canonical" href="https://pole2.app/guida'),
    'canonical must remain pole2.app-only',
  );
});
