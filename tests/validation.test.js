import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeEmail,
  isValidCategory,
  categoryLabel,
  topicKey,
  validateMessage,
  sanitizeShort,
  stripCrlf,
  isUuid,
  isChecked,
  CATEGORIES,
  TOPIC_KEYS,
} from '../functions/_lib/validation.js';

test('normalizeEmail trims and lowercases', () => {
  assert.equal(normalizeEmail('  Tu@Esempio.IT '), 'tu@esempio.it');
});

test('normalizeEmail rejects invalid addresses', () => {
  for (const bad of [
    '',
    'nope',
    'a@b',
    'a b@c.it',
    'a@@b.it',
    'a@b.it\nBcc: x@y.it', // header-injection attempt
    123,
    null,
  ]) {
    assert.equal(normalizeEmail(bad), null, `should reject: ${String(bad)}`);
  }
});

test('category allowlist (legacy Italian labels still accepted)', () => {
  assert.ok(isValidCategory('Problema tecnico'));
  assert.ok(isValidCategory('Privacy e dati'));
  assert.equal(isValidCategory('Spam'), false);
  assert.equal(isValidCategory(''), false);
  assert.equal(CATEGORIES.length, 5);
});

test('stable topic keys are the primary submitted values', () => {
  assert.deepEqual(TOPIC_KEYS, [
    'question',
    'technical',
    'suggestion',
    'privacy',
    'other',
  ]);
  for (const k of TOPIC_KEYS) {
    assert.ok(isValidCategory(k), `key should validate: ${k}`);
  }
  // A stable key normalizes to itself; a legacy label maps back to its key.
  assert.equal(topicKey('technical'), 'technical');
  assert.equal(topicKey('Problema tecnico'), 'technical');
  assert.equal(topicKey('nope'), null);
});

test('categoryLabel stores one canonical label per key', () => {
  // The localized site submits a key; a cached page may submit the IT label —
  // both are stored as the same canonical (Italian) label.
  assert.equal(categoryLabel('technical'), 'Problema tecnico');
  assert.equal(categoryLabel('Problema tecnico'), 'Problema tecnico');
  assert.equal(categoryLabel('privacy'), 'Privacy e dati');
  assert.equal(categoryLabel('other'), 'Altro');
  assert.equal(categoryLabel('Spam'), null);
});

test('message length bounds 10–4000', () => {
  assert.equal(validateMessage('short'), null);
  assert.equal(validateMessage('x'.repeat(9)), null);
  assert.equal(validateMessage('x'.repeat(10)), 'x'.repeat(10));
  assert.equal(validateMessage('x'.repeat(4000)).length, 4000);
  assert.equal(validateMessage('x'.repeat(4001)), null);
  assert.equal(validateMessage('   trimmed message   '), 'trimmed message');
});

test('sanitizeShort caps and strips newlines', () => {
  assert.equal(sanitizeShort('1.0.15'), '1.0.15');
  assert.equal(sanitizeShort('a\r\nb'), 'a b');
  assert.equal(sanitizeShort('x'.repeat(50), 32).length, 32);
  assert.equal(sanitizeShort('   '), null);
  assert.equal(sanitizeShort(null), null);
});

test('stripCrlf removes CR/LF', () => {
  assert.equal(stripCrlf('a\r\nb\nc'), 'a b c');
});

test('isUuid', () => {
  assert.ok(isUuid('123e4567-e89b-12d3-a456-426614174000'));
  assert.equal(isUuid('not-a-uuid'), false);
  assert.equal(isUuid(''), false);
});

test('isChecked accepts common truthy encodings', () => {
  for (const v of ['on', 'true', '1', 'yes']) assert.ok(isChecked(v));
  for (const v of ['', 'off', 'false', undefined]) assert.equal(isChecked(v), false);
});
