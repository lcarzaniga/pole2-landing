import {
  normalizeEmail,
  isValidCategory,
  validateMessage,
  sanitizeShort,
  isUuid,
  isChecked,
} from '../_lib/validation.js';
import {
  originAllowed,
  isFormContentType,
  readLimitedForm,
  hmacIpKey,
  clientIp,
  verifyTurnstile,
} from '../_lib/security.js';
import { ok, fail } from '../_lib/respond.js';
import { sendNotification } from '../_lib/notify.js';

/** POST /api/support — write one support message to D1 (authoritative), then send
 *  the notification in the background. Success is returned as soon as the durable
 *  D1 write succeeds; a later notification failure never tells the user their
 *  message was lost, and never encourages a duplicate. The submission id makes
 *  retries idempotent (ON CONFLICT(id) DO NOTHING). */
export async function handleSupport(context) {
  const { request, env, waitUntil } = context;

  if (request.method !== 'POST') return fail(405);
  if (!originAllowed(request)) return fail(403);
  if (!isFormContentType(request)) return fail(415);

  // Messages can reach ~4000 chars; allow a bounded body, still tightly capped.
  const form = await readLimitedForm(request, 16384);
  if (!form) return fail(413);

  // Honeypot: calm success, no write, no notify.
  if ((form.get('company') || '').trim() !== '') return ok();

  const email = normalizeEmail(form.get('email'));
  const category = form.get('category');
  const message = validateMessage(form.get('message'));
  const appVersion = sanitizeShort(form.get('app_version'), 32);
  const appBuild = sanitizeShort(form.get('app_build'), 16);

  if (!email) return fail(400);
  if (!isValidCategory(category)) return fail(400);
  if (!message) return fail(400);
  if (!isChecked(form.get('privacy'))) return fail(400);

  const human = await verifyTurnstile(
    form.get('cf-turnstile-response'),
    env.TURNSTILE_SECRET,
    clientIp(request),
  );
  if (!human) return fail(403);

  // Client-supplied id makes retries idempotent; fall back to a server id.
  const submitted = form.get('submission_id');
  const id = isUuid(submitted) ? submitted : crypto.randomUUID();
  const ipKey = await hmacIpKey(request, env.IP_HASH_SECRET);
  const now = new Date().toISOString();

  try {
    await env.DB.prepare(
      'INSERT INTO support ' +
        '(id, email, category, message, app_version, app_build, created_at, ' +
        'privacy_ack_at, ip_key, notification_status, notified_at) ' +
        "VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,'pending',NULL) " +
        'ON CONFLICT(id) DO NOTHING',
    )
      .bind(id, email, category, message, appVersion, appBuild, now, now, ipKey)
      .run();
  } catch {
    return fail(500);
  }

  // Background notification — never blocks or fails the user's success.
  const notify = sendNotification(env, {
    id,
    category,
    message,
    appVersion,
    appBuild,
    createdAt: now,
    replyTo: email,
  }).then(async (sent) => {
    try {
      await env.DB.prepare(
        'UPDATE support SET notification_status = ?1, notified_at = ?2 WHERE id = ?3',
      )
        .bind(sent ? 'sent' : 'failed', sent ? new Date().toISOString() : null, id)
        .run();
    } catch {
      /* status is internal only; a failed status update is non-fatal */
    }
  });

  if (typeof waitUntil === 'function') waitUntil(notify);
  else await notify;

  return ok();
}

export const onRequestPost = handleSupport;
