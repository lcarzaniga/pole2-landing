// Request-level security helpers: origin allowlist, content-type + size guards,
// keyed IP hashing (never the raw IP), and Turnstile verification. Web APIs only.

// Same-site origins allowed to POST the forms. The canonical domain, the two
// live domains, and the legacy aliases — each with its www variant, and each an
// EXACT match. No wildcards, no suffix/contains checks: arbitrary subdomains and
// look-alikes are rejected.
export const ALLOWED_ORIGINS = Object.freeze([
  'https://pole2.app',
  'https://www.pole2.app',
  'https://pole2.it',
  'https://www.pole2.it',
  'https://pole2.site',
  'https://www.pole2.site',
  'https://pole2.online',
  'https://www.pole2.online',
]);

/** Require a same-site Origin header that EXACTLY matches the allowlist (blocks
 *  cross-site POSTs and subdomain/look-alike spoofs). */
export function originAllowed(request) {
  const origin = request.headers.get('Origin');
  return !!origin && ALLOWED_ORIGINS.includes(origin);
}

export function isFormContentType(request) {
  const ct = (request.headers.get('Content-Type') || '').toLowerCase();
  return (
    ct.startsWith('application/x-www-form-urlencoded') ||
    ct.startsWith('multipart/form-data')
  );
}

/** Read the body with a hard size cap *before* parsing. Returns URLSearchParams,
 *  or null when the body is too large or unreadable. */
export async function readLimitedForm(request, maxBytes = 8192) {
  const declared = Number(request.headers.get('Content-Length') || '0');
  if (Number.isFinite(declared) && declared > maxBytes) return null;
  let buf;
  try {
    buf = await request.arrayBuffer();
  } catch {
    return null;
  }
  if (buf.byteLength > maxBytes) return null;
  const text = new TextDecoder().decode(buf);
  return new URLSearchParams(text);
}

/** The raw client IP for Turnstile's remoteip only — never stored. */
export function clientIp(request) {
  return request.headers.get('CF-Connecting-IP') || undefined;
}

/** A stable, non-reversible abuse key derived from the IP via HMAC-SHA256 with a
 *  server secret. The raw IP is never stored or logged. */
export async function hmacIpKey(request, secret) {
  const ip = clientIp(request) || '';
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret || ''),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(ip));
  return [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Server-side Turnstile verification. Fails closed on any error or missing config. */
export async function verifyTurnstile(token, secret, remoteip, fetchImpl = fetch) {
  if (!token || !secret) return false;
  const body = new URLSearchParams({ secret, response: token });
  if (remoteip) body.set('remoteip', remoteip);
  try {
    const res = await fetchImpl(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      },
    );
    const data = await res.json();
    return data && data.success === true;
  } catch {
    return false;
  }
}
