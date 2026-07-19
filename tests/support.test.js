import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleSupport } from '../functions/api/support.js';
import { makeRequest, MockDB, installFetch, ENV, validToken } from './helpers.js';

// No waitUntil → the background notification is awaited inline, so status
// updates are observable deterministically after the handler resolves.
const ctx = (request, env) => ({ request, env });

const base = (over = {}) => ({
  email: 'user@esempio.it',
  category: 'Problema tecnico',
  message: 'Qualcosa non va quando apro l’app.',
  privacy: 'on',
  ...validToken,
  ...over,
});

test('D1 success + Resend success → ok and status sent', async () => {
  let payload;
  const restore = installFetch({ turnstile: true, resendOk: true, capture: (p) => (payload = p) });
  const env = { ...ENV, DB: new MockDB() };
  const res = await handleSupport(ctx(makeRequest(base()), env));
  restore();
  assert.equal(res.status, 200);
  const row = [...env.DB.support.values()][0];
  assert.equal(row.status, 'sent');
  assert.ok(row.notifiedAt);
  // Reply-To is a header field, NOT inserted into the message body.
  assert.equal(payload.reply_to, 'user@esempio.it');
  assert.ok(!payload.text.includes('user@esempio.it'));
  assert.equal(payload.subject, '[Pole²] Problema tecnico'); // subject from the fixed enum
});

test('D1 success + Resend failure still returns user success, records failed', async () => {
  const restore = installFetch({ turnstile: true, resendOk: false });
  const env = { ...ENV, DB: new MockDB() };
  const res = await handleSupport(ctx(makeRequest(base()), env));
  restore();
  assert.equal(res.status, 200); // user is never told their message was lost
  const row = [...env.DB.support.values()][0];
  assert.equal(row.status, 'failed');
  assert.equal(row.notifiedAt, null);
});

test('D1 failure returns failure', async () => {
  const restore = installFetch({ turnstile: true });
  const db = new MockDB();
  db.failRun = true;
  const res = await handleSupport(ctx(makeRequest(base()), { ...ENV, DB: db }));
  restore();
  assert.equal(res.status, 500);
});

test('a repeated submission id is idempotent', async () => {
  const restore = installFetch({ turnstile: true });
  const env = { ...ENV, DB: new MockDB() };
  const id = '123e4567-e89b-12d3-a456-426614174000';
  await handleSupport(ctx(makeRequest(base({ submission_id: id })), env));
  await handleSupport(ctx(makeRequest(base({ submission_id: id })), env));
  restore();
  assert.equal(env.DB.support.size, 1); // one row despite two posts
});

test('invalid category is rejected', async () => {
  const env = { ...ENV, DB: new MockDB() };
  const res = await handleSupport(ctx(makeRequest(base({ category: 'Spam' })), env));
  assert.equal(res.status, 400);
  assert.equal(env.DB.calls.length, 0);
});

test('too-short and too-long messages are rejected', async () => {
  const env = { ...ENV, DB: new MockDB() };
  const short = await handleSupport(ctx(makeRequest(base({ message: 'corto' })), env));
  assert.equal(short.status, 400);
  const long = await handleSupport(
    ctx(makeRequest(base({ message: 'x'.repeat(4001) })), { ...ENV, DB: new MockDB() }),
  );
  assert.equal(long.status, 400);
});

test('missing privacy acknowledgment is rejected', async () => {
  const env = { ...ENV, DB: new MockDB() };
  const res = await handleSupport(ctx(makeRequest(base({ privacy: undefined })), env));
  assert.equal(res.status, 400);
});

test('failed Turnstile is rejected', async () => {
  const restore = installFetch({ turnstile: false });
  const env = { ...ENV, DB: new MockDB() };
  const res = await handleSupport(ctx(makeRequest(base()), env));
  restore();
  assert.equal(res.status, 403);
  assert.equal(env.DB.calls.length, 0);
});

test('honeypot returns calm success with no write and no notification', async () => {
  const env = { ...ENV, DB: new MockDB() };
  const res = await handleSupport(ctx(makeRequest(base({ company: 'ACME' })), env));
  assert.equal(res.status, 200);
  assert.equal(env.DB.calls.length, 0);
});

test('unsupported Origin is rejected', async () => {
  const env = { ...ENV, DB: new MockDB() };
  const res = await handleSupport(
    ctx(makeRequest(base(), { origin: 'https://evil.example' }), env),
  );
  assert.equal(res.status, 403);
});

test('oversized body is rejected before parsing', async () => {
  const env = { ...ENV, DB: new MockDB() };
  const res = await handleSupport(
    ctx(makeRequest({}, { rawBody: 'message=' + 'x'.repeat(20000) }), env),
  );
  assert.equal(res.status, 413);
});
