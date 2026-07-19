import { stripCrlf } from './validation.js';

// Plain-text support notification via Resend. The user's address is set as the
// Reply-To *header field* through the API (never inserted into the body), so
// pressing Reply in the mailbox writes straight back to the user.
//
// From:     SUPPORT_FROM  (e.g. "Pole² Support <support@pole2.app>")
// To:       NOTIFY_EMAIL  (support@pole2.app — routed onward outside this repo)
// Reply-To: the validated user email
//
// The subject is derived only from the fixed category enum, so it can never
// carry user-controlled header content. Returns true only on a 2xx from Resend.
export async function sendNotification(env, msg, fetchImpl = fetch) {
  const { RESEND_API_KEY, SUPPORT_FROM, NOTIFY_EMAIL } = env || {};
  if (!RESEND_API_KEY || !SUPPORT_FROM || !NOTIFY_EMAIL) return false;

  const subject = `[Pole²] ${msg.category}`;
  const appLine = msg.appVersion
    ? `App: ${msg.appVersion}${msg.appBuild ? ` (${msg.appBuild})` : ''}`
    : null;
  const body = [
    `Categoria: ${msg.category}`,
    appLine,
    `Data (UTC): ${msg.createdAt}`,
    `ID: ${msg.id}`,
    '',
    msg.message, // user-authored; carried only in the JSON body, never a header
  ]
    .filter((l) => l !== null)
    .join('\n');

  const payload = {
    from: SUPPORT_FROM,
    to: [NOTIFY_EMAIL],
    reply_to: stripCrlf(msg.replyTo),
    subject,
    text: body,
  };

  try {
    const res = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return res.ok === true;
  } catch {
    return false;
  }
}
