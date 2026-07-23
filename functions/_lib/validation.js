// Pure validation / normalization helpers — no I/O, so they are unit-testable.

/** Trim + lowercase + shape-check an email. Returns the normalized address, or
 *  null when it is not a plausible single address. Rejects whitespace and
 *  characters that could enable header injection. */
export function normalizeEmail(raw) {
  if (typeof raw !== 'string') return null;
  const e = raw.trim().toLowerCase();
  if (e.length < 3 || e.length > 254) return null;
  // No control chars, spaces, or header/quoting metacharacters.
  if (/[\s<>()[\]\\,;:"]/.test(e)) return null;
  if (/[\r\n]/.test(e)) return null;
  // Exactly one @, a non-empty local part, and a dotted domain.
  if (!/^[^@]+@[^@]+\.[^@]+$/.test(e)) return null;
  return e;
}

/** Stable support-topic keys (the localized site submits these, not a
 *  translated label). The stored category and the email subject are derived
 *  ONLY from this allowlist, so they can never carry user-controlled header
 *  content. */
export const TOPIC_KEYS = Object.freeze([
  'question',
  'technical',
  'suggestion',
  'privacy',
  'other',
]);

/** Canonical (Italian) label stored in D1 and used for the notification
 *  subject — one stable value per key, independent of the sender's language. */
export const TOPIC_LABEL = Object.freeze({
  question: 'Domanda',
  technical: 'Problema tecnico',
  suggestion: 'Suggerimento',
  privacy: 'Privacy e dati',
  other: 'Altro',
});

/** Legacy Italian labels a cached pre-1.0.26 page might still POST. Mapped back
 *  to their stable key so older clients keep working during the rollout. */
const LEGACY_LABEL_TO_KEY = Object.freeze({
  Domanda: 'question',
  'Problema tecnico': 'technical',
  Suggerimento: 'suggestion',
  'Privacy e dati': 'privacy',
  Altro: 'other',
});

/** The fixed categories (canonical labels) — kept for compatibility with any
 *  caller importing CATEGORIES; derived from the allowlist above. */
export const CATEGORIES = Object.freeze(TOPIC_KEYS.map((k) => TOPIC_LABEL[k]));

/** Normalize a submitted category to its stable key, or null if unknown.
 *  Accepts a stable key (the localized site) or a legacy Italian label. */
export function topicKey(c) {
  if (typeof c !== 'string') return null;
  if (TOPIC_KEYS.includes(c)) return c;
  return LEGACY_LABEL_TO_KEY[c] || null;
}

export function isValidCategory(c) {
  return topicKey(c) !== null;
}

/** The canonical label to store for a submitted category (null if invalid). */
export function categoryLabel(c) {
  const k = topicKey(c);
  return k ? TOPIC_LABEL[k] : null;
}

/** Support message: trimmed, 10–4000 chars. Returns the trimmed message or null. */
export function validateMessage(raw) {
  if (typeof raw !== 'string') return null;
  const m = raw.trim();
  if (m.length < 10 || m.length > 4000) return null;
  return m;
}

/** A short, single-line, bounded value (e.g. app version/build). Strips CR/LF and
 *  tabs, caps the length, and returns null when empty. */
export function sanitizeShort(raw, max = 32) {
  if (typeof raw !== 'string') return null;
  const s = raw.trim().replace(/[\r\n\t]+/g, ' ').slice(0, max).trim();
  return s.length ? s : null;
}

/** Remove CR/LF from a string used in an email field, to prevent header injection. */
export function stripCrlf(s) {
  return typeof s === 'string' ? s.replace(/[\r\n]+/g, ' ') : s;
}

/** True for a canonical v4-ish UUID (used for the client-supplied submission id). */
export function isUuid(s) {
  return (
    typeof s === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
  );
}

/** Accept the common truthy checkbox encodings for a required consent field. */
export function isChecked(v) {
  return v === 'on' || v === 'true' || v === '1' || v === 'yes';
}
