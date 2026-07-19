// Shared test doubles: a fake same-site POST request, a minimal D1 emulator, and
// a routing fetch mock for Turnstile + Resend.

export function makeRequest(fields, opts = {}) {
  const {
    method = 'POST',
    origin = 'https://pole2.app',
    contentType = 'application/x-www-form-urlencoded',
    ip = '203.0.113.7',
    rawBody, // when set, bypass field encoding (for size tests)
  } = opts;
  const body =
    rawBody !== undefined
      ? rawBody
      : new URLSearchParams(
          Object.fromEntries(
            Object.entries(fields).filter(([, v]) => v !== undefined),
          ),
        ).toString();
  const headers = new Headers();
  if (origin) headers.set('Origin', origin);
  if (contentType) headers.set('Content-Type', contentType);
  if (ip) headers.set('CF-Connecting-IP', ip);
  headers.set('Content-Length', String(new TextEncoder().encode(body).length));
  const init = { method, headers };
  if (method !== 'GET' && method !== 'HEAD') init.body = body;
  return new Request('https://pole2.app/api/x', init);
}

export class MockDB {
  constructor() {
    this.waitlist = new Map();
    this.support = new Map();
    this.calls = [];
    this.failRun = false;
  }
  prepare(sql) {
    const db = this;
    return {
      sql,
      bind(...args) {
        return {
          run: async () => {
            db.calls.push({ sql, args });
            if (db.failRun) throw new Error('d1 down');
            if (/INSERT INTO waitlist/i.test(sql)) {
              const email = args[0];
              if (!db.waitlist.has(email)) db.waitlist.set(email, args);
              return { success: true };
            }
            if (/INSERT INTO support/i.test(sql)) {
              const id = args[0];
              if (!db.support.has(id))
                db.support.set(id, { args, status: 'pending', notifiedAt: null });
              return { success: true };
            }
            if (/UPDATE support/i.test(sql)) {
              const [status, notifiedAt, id] = args;
              const row = db.support.get(id);
              if (row) {
                row.status = status;
                row.notifiedAt = notifiedAt;
              }
              return { success: true };
            }
            return { success: true };
          },
        };
      },
    };
  }
}

export function installFetch({ turnstile = true, resendOk = true, capture } = {}) {
  const original = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    const u = String(url);
    if (u.includes('siteverify')) {
      return { ok: true, json: async () => ({ success: turnstile }) };
    }
    if (u.includes('api.resend.com')) {
      if (capture) capture(JSON.parse(options.body));
      return { ok: resendOk, json: async () => ({ id: 'x' }) };
    }
    return { ok: false, json: async () => ({}) };
  };
  return () => {
    globalThis.fetch = original;
  };
}

export const ENV = {
  TURNSTILE_SECRET: 'test-secret',
  IP_HASH_SECRET: 'ip-secret',
  RESEND_API_KEY: 're_test',
  SUPPORT_FROM: 'Pole² Support <support@pole2.app>',
  NOTIFY_EMAIL: 'support@pole2.app',
};

export const validToken = { 'cf-turnstile-response': 'tok' };
