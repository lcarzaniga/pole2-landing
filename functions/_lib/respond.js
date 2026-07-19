// Generic JSON responses. Clients only ever learn ok/not-ok — never internal
// detail, never whether an address is already registered.

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };

export function ok() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: JSON_HEADERS,
  });
}

export function fail(status = 400) {
  return new Response(JSON.stringify({ ok: false }), {
    status,
    headers: JSON_HEADERS,
  });
}
