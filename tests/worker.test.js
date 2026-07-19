import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker.js';
import { MockDB, ENV } from './helpers.js';

const ctx = { waitUntil() {} };

function req(path, { method = 'GET', origin = 'https://pole2.app', body } = {}) {
  const headers = new Headers();
  if (origin) headers.set('Origin', origin);
  const init = { method, headers };
  if (body !== undefined) {
    headers.set('Content-Type', 'application/x-www-form-urlencoded');
    init.body = body;
  }
  return new Request('https://pole2.app' + path, init);
}

// A fresh env with a stubbed ASSETS binding that echoes the path it was asked for.
function env() {
  return {
    ...ENV,
    DB: new MockDB(),
    ASSETS: {
      fetch: async (r) =>
        new Response('ASSET ' + new URL(r.url).pathname, { status: 200 }),
    },
  };
}

test('GET /api/waitlist → 405 JSON from the handler', async () => {
  const res = await worker.fetch(req('/api/waitlist'), env(), ctx);
  assert.equal(res.status, 405);
  assert.match(res.headers.get('content-type') || '', /application\/json/);
});

test('GET /api/support → 405 JSON from the handler', async () => {
  const res = await worker.fetch(req('/api/support'), env(), ctx);
  assert.equal(res.status, 405);
  assert.match(res.headers.get('content-type') || '', /application\/json/);
});

test('a valid POST reaches the existing handler (honeypot → 200)', async () => {
  // The honeypot branch lives ONLY in the real handler — a 200 here proves the
  // Worker delegates to it rather than re-implementing anything.
  const res = await worker.fetch(
    req('/api/waitlist', {
      method: 'POST',
      body: 'email=a@esempio.it&consent=on&company=ACME',
    }),
    env(),
    ctx,
  );
  assert.equal(res.status, 200);
});

test('a POST reaches the handler origin check (bad origin → 403)', async () => {
  const res = await worker.fetch(
    req('/api/support', {
      method: 'POST',
      origin: 'https://evil.example',
      body: 'x=1',
    }),
    env(),
    ctx,
  );
  assert.equal(res.status, 403);
});

test('unknown /api/* → JSON 404 (from the Worker router)', async () => {
  const res = await worker.fetch(req('/api/nope'), env(), ctx);
  assert.equal(res.status, 404);
  assert.match(res.headers.get('content-type') || '', /application\/json/);
});

test('non-API paths delegate to ASSETS', async () => {
  for (const p of ['/', '/supporto/', '/releases/latest.json']) {
    const res = await worker.fetch(req(p), env(), ctx);
    assert.equal(res.status, 200);
    assert.equal(await res.text(), 'ASSET ' + p);
  }
});

test('the Worker imports the real handlers (no duplicated business logic)', async () => {
  // Structural guard: the entrypoint source references the handler modules and
  // does not redefine validation/D1/Turnstile logic.
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../worker.js', import.meta.url), 'utf8');
  assert.ok(src.includes("from './functions/api/waitlist.js'"));
  assert.ok(src.includes("from './functions/api/support.js'"));
  assert.ok(!/verifyTurnstile|INSERT INTO|normalizeEmail/.test(src));
});
