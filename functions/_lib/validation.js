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

/** The fixed support categories. The email subject is derived only from this
 *  allowlist, so it can never carry user-controlled header content. */
export const CATEGORIES = Object.freeze([
  'Domanda',
  'Problema tecnico',
  'Suggerimento',
  'Privacy e dati',
  'Altro',
]);

export function isValidCategory(c) {
  return typeof c === 'string' && CATEGORIES.includes(c);
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
