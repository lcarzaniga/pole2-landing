import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  originAllowed,
  isFormContentType,
  readLimitedForm,
  hmacIpKey,
} from '../functions/_lib/security.js';
import { makeRequest } from './helpers.js';

test('originAllowed accepts the allowlist and rejects others', () => {
  assert.ok(originAllowed(makeRequest({}, { origin: 'https://pole2.app' })));
  assert.ok(originAllowed(makeRequest({}, { origin: 'https://pole2.it' })));
  assert.equal(
    originAllowed(makeRequest({}, { origin: 'https://evil.example' })),
    false,
  );
  assert.equal(originAllowed(makeRequest({}, { origin: '' })), false); // missing Origin
});

test('isFormContentType', () => {
  assert.ok(isFormContentType(makeRequest({})));
  assert.equal(
    isFormContentType(makeRequest({}, { contentType: 'application/json' })),
    false,
  );
});

test('readLimitedForm enforces a size cap', async () => {
  const small = await readLimitedForm(makeRequest({ email: 'a@b.it' }), 8192);
  assert.equal(small.get('email'), 'a@b.it');
  const big = await readLimitedForm(
    makeRequest({}, { rawBody: 'x'.repeat(9000) }),
    8192,
  );
  assert.equal(big, null);
});

test('hmacIpKey is deterministic, 64-hex, and not the raw IP', async () => {
  const req = makeRequest({}, { ip: '203.0.113.9' });
  const a = await hmacIpKey(req, 'secret');
  const b = await hmacIpKey(req, 'secret');
  assert.equal(a, b);
  assert.match(a, /^[0-9a-f]{64}$/);
  assert.ok(!a.includes('203.0.113.9'));
  const other = await hmacIpKey(req, 'different-secret');
  assert.notEqual(a, other);
});
