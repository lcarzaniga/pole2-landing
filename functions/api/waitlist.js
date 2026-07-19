import { normalizeEmail, isChecked } from '../_lib/validation.js';
import {
  originAllowed,
  isFormContentType,
  readLimitedForm,
  hmacIpKey,
  clientIp,
  verifyTurnstile,
} from '../_lib/security.js';
import { ok, fail } from '../_lib/respond.js';

/** POST /api/waitlist — store one beta/waitlist email in D1 (the source of truth).
 *  Same success response whether newly inserted or already present; never reveals
 *  membership. A honeypot hit returns a calm success with no write. */
export async function handleWaitlist(context) {
  const { request, env } = context;

  if (request.method !== 'POST') return fail(405);
  if (!originAllowed(request)) return fail(403);
  if (!isFormContentType(request)) return fail(415);

  const form = await readLimitedForm(request, 8192);
  if (!form) return fail(413);

  // Honeypot: bots fill this hidden field. Calm success, no write, no notify.
  if ((form.get('company') || '').trim() !== '') return ok();

  const email = normalizeEmail(form.get('email'));
  if (!email) return fail(400);
  if (!isChecked(form.get('consent'))) return fail(400);

  const human = await verifyTurnstile(
    form.get('cf-turnstile-response'),
    env.TURNSTILE_SECRET,
    clientIp(request),
  );
  if (!human) return fail(403);

  const ipKey = await hmacIpKey(request, env.IP_HASH_SECRET);
  const now = new Date().toISOString();

  try {
    await env.DB.prepare(
      'INSERT INTO waitlist (email, created_at, source, consent_at, ip_key) ' +
        'VALUES (?1, ?2, ?3, ?4, ?5) ON CONFLICT(email) DO NOTHING',
    )
      .bind(email, now, 'landing', now, ipKey)
      .run();
  } catch {
    // Durable write failed → never claim the place was saved.
    return fail(500);
  }

  return ok();
}

export const onRequestPost = handleWaitlist;
