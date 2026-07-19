import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  originAllowed,
  isFormContentType,
  readLimitedForm,
  hmacIpKey,
} from '../functions/_lib/security.js';
import { makeRequest } from './helpers.js';

test('originAllowed accepts the eight exact allowed origins', () => {
  const accepted = [
    'https://pole2.app',
    'https://www.pole2.app',
    'https://pole2.it',
    'https://www.pole2.it',
    'https://pole2.site',
    'https://www.pole2.site',
    'https://pole2.online',
    'https://www.pole2.online',
  ];
  for (const origin of accepted) {
    assert.ok(originAllowed(makeRequest({}, { origin })), `accept: ${origin}`);
  }
});

test('originAllowed rejects look-alikes, subdomains, wrong scheme, and empty', () => {
  const rejected = [
    'https://evil.example',
    'http://pole2.app', // wrong scheme
    'https://pole2.app.evil.com', // suffix spoof
    'https://evilpole2.app', // prefix spoof
    'https://sub.pole2.app', // arbitrary subdomain (not www)
    'https://pole2.site.evil.com',
    'https://www.pole2.online.evil.com',
    'https://pole2.app:8443', // port variant
    'https://pole2.dev', // unrelated TLD
    '', // missing Origin
  ];
  for (const origin of rejected) {
    assert.equal(originAllowed(makeRequest({}, { origin })), false, `reject: ${origin}`);
  }
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
