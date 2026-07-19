import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleWaitlist } from '../functions/api/waitlist.js';
import { makeRequest, MockDB, installFetch, ENV, validToken } from './helpers.js';

const ctx = (request, env = { ...ENV, DB: new MockDB() }) => ({ request, env });

test('valid signup writes to D1 and returns ok', async () => {
  const restore = installFetch({ turnstile: true });
  const env = { ...ENV, DB: new MockDB() };
  const res = await handleWaitlist(
    ctx(makeRequest({ email: 'Tu@Esempio.IT', consent: 'on', ...validToken }), env),
  );
  restore();
  assert.equal(res.status, 200);
  assert.ok(env.DB.waitlist.has('tu@esempio.it')); // normalized
});

test('duplicate signup is idempotent and returns the same success', async () => {
  const restore = installFetch({ turnstile: true });
  const env = { ...ENV, DB: new MockDB() };
  const req = () =>
    makeRequest({ email: 'dup@esempio.it', consent: 'on', ...validToken });
  const a = await handleWaitlist(ctx(req(), env));
  const b = await handleWaitlist(ctx(req(), env));
  restore();
  assert.equal(a.status, 200);
  assert.equal(b.status, 200);
  assert.equal(env.DB.waitlist.size, 1); // no duplicate row, no membership leak
});

test('no fake success when the D1 write fails', async () => {
  const restore = installFetch({ turnstile: true });
  const db = new MockDB();
  db.failRun = true;
  const res = await handleWaitlist(
    ctx(makeRequest({ email: 'x@esempio.it', consent: 'on', ...validToken }), {
      ...ENV,
      DB: db,
    }),
  );
  restore();
  assert.equal(res.status, 500);
});

test('invalid email is rejected before any write', async () => {
  const env = { ...ENV, DB: new MockDB() };
  const res = await handleWaitlist(
    ctx(makeRequest({ email: 'nope', consent: 'on', ...validToken }), env),
  );
  assert.equal(res.status, 400);
  assert.equal(env.DB.calls.length, 0);
});

test('missing consent is rejected', async () => {
  const env = { ...ENV, DB: new MockDB() };
  const res = await handleWaitlist(
    ctx(makeRequest({ email: 'a@esempio.it', ...validToken }), env),
  );
  assert.equal(res.status, 400);
});

test('failed Turnstile is rejected before any write', async () => {
  const restore = installFetch({ turnstile: false });
  const env = { ...ENV, DB: new MockDB() };
  const res = await handleWaitlist(
    ctx(makeRequest({ email: 'a@esempio.it', consent: 'on', ...validToken }), env),
  );
  restore();
  assert.equal(res.status, 403);
  assert.equal(env.DB.calls.length, 0);
});

test('honeypot returns a calm success with no write and no verification', async () => {
  // No fetch installed: if the handler tried to verify Turnstile it would throw.
  const env = { ...ENV, DB: new MockDB() };
  const res = await handleWaitlist(
    ctx(
      makeRequest({ email: 'a@esempio.it', consent: 'on', company: 'ACME', ...validToken }),
      env,
    ),
  );
  assert.equal(res.status, 200);
  assert.equal(env.DB.calls.length, 0);
});

test('unsupported Origin is rejected', async () => {
  const env = { ...ENV, DB: new MockDB() };
  const res = await handleWaitlist(
    ctx(
      makeRequest({ email: 'a@esempio.it', consent: 'on' }, { origin: 'https://evil.example' }),
      env,
    ),
  );
  assert.equal(res.status, 403);
});

test('oversized body is rejected before parsing', async () => {
  const env = { ...ENV, DB: new MockDB() };
  const res = await handleWaitlist(
    ctx(makeRequest({}, { rawBody: 'email=' + 'a'.repeat(9000) }), env),
  );
  assert.equal(res.status, 413);
});

test('non-POST is rejected', async () => {
  const env = { ...ENV, DB: new MockDB() };
  const res = await handleWaitlist(
    ctx(makeRequest({ email: 'a@esempio.it', consent: 'on' }, { method: 'GET' }), env),
  );
  assert.equal(res.status, 405);
});

test('the stored abuse key is a keyed hash, never the raw IP', async () => {
  const restore = installFetch({ turnstile: true });
  const env = { ...ENV, DB: new MockDB() };
  await handleWaitlist(
    ctx(
      makeRequest({ email: 'ip@esempio.it', consent: 'on', ...validToken }, { ip: '203.0.113.42' }),
      env,
    ),
  );
  restore();
  const args = env.DB.waitlist.get('ip@esempio.it');
  const ipKey = args[4];
  assert.match(ipKey, /^[0-9a-f]{64}$/);
  assert.ok(!JSON.stringify(args).includes('203.0.113.42'));
});
