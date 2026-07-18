# Future beta access — how it must be gated

This is a design note only. **Nothing here is configured yet** (no DNS, no
Cloudflare, no routes). It records how a private beta download area should be
protected when we build it, so we don't accidentally ship fake security.

## Principles

- **The public landing (`pole2.it`) stays public.** No password, no gate. It
  explains the product and links to the voluntary Ko-fi support.
- **A future beta download area may live at `beta.pole2.it`** (a separate
  subdomain), kept out of the public site.
- **Access control belongs at the edge/server, not in the browser.** Use
  **Cloudflare Access** in front of `beta.pole2.it` with an **email allowlist**
  and **one-time PIN** (email OTP). The request is authorized before any beta
  asset is served.

## What does NOT count as security (do not do this)

- Hiding a route, a link, or a section with frontend JavaScript. Anyone can view
  source, read the bundle, or hit the URL directly.
- Checking a password only in client-side JS. The check — and often the secret —
  ships to every visitor.
- Relying on a "secret" `<a>` to a public GitHub release APK. **A publicly
  reachable GitHub APK URL cannot be protected by hiding its link** — the file
  is world-readable regardless of who can see the anchor. If the APK must be
  gated, it has to be served from behind Cloudflare Access (or an equally
  server-side–enforced boundary), not from a public GitHub Releases URL.

## When we implement it (out of scope for now)

1. Create the `beta.pole2.it` subdomain and point it at the beta host.
2. Put a Cloudflare Access application in front of it (email allowlist + OTP).
3. Serve the APK from behind that boundary — not from a public release URL.
