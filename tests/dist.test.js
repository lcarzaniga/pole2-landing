import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = join(process.cwd(), 'dist');

function readAll(dir) {
  let text = '';
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) text += readAll(p);
    else if (/\.(html|js|css|json|txt|xml)$/.test(name)) text += readFileSync(p, 'utf8');
  }
  return text;
}

test('built client output has no private email or secrets', { skip: !existsSync(DIST) }, () => {
  const all = readAll(DIST);
  // The private forwarding address must never appear in client output.
  assert.ok(!all.includes('loris@aruba.it'), 'loris@aruba.it must not be in dist');
  assert.ok(!all.includes('aruba'), 'no reference to the private mail host');
  // Server-only secret names / test values must never be bundled.
  for (const s of ['RESEND_API_KEY', 'TURNSTILE_SECRET', 'IP_HASH_SECRET', 're_test', 'ip-secret']) {
    assert.ok(!all.includes(s), `secret token leaked into dist: ${s}`);
  }
});

test('built pages exist and forms point at the real endpoints', { skip: !existsSync(DIST) }, () => {
  for (const page of ['index.html', 'guida/index.html', 'privacy/index.html', 'supporto/index.html', 'novita/index.html']) {
    assert.ok(existsSync(join(DIST, page)), `missing page: ${page}`);
  }
  const all = readAll(DIST);
  assert.ok(all.includes('/api/waitlist'), 'waitlist must POST to /api/waitlist');
  assert.ok(all.includes('/api/support'), 'support must POST to /api/support');
  // Consent + privacy link are present in the client.
  assert.ok(all.includes('/privacy'), 'a link to /privacy must be present');
  assert.ok(all.includes('name="consent"'), 'waitlist consent field present');
  // No leftover "fake success without a backend" copy path.
  assert.ok(
    !all.includes('anche il percorso usato mentre nessun provider'),
    'the old fake-success fallback must be gone',
  );
});
