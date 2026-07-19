// Worker entrypoint for the Cloudflare **Worker + Static Assets** deployment.
//
// This project is a Worker with a Static Assets binding (NOT a classic Pages
// project), so the repo-root `functions/` convention is never routed. This
// module is the single entrypoint (`main` in wrangler.jsonc): it handles exactly
// the two API routes by delegating to the EXISTING handlers (no validation or
// business logic is duplicated here), and hands everything else to the static
// assets binding.
//
// Routing (with `assets.run_worker_first = ["/api/*"]`, only /api/* reaches this
// Worker; the ASSETS delegation below is a defensive fallback):
//   POST /api/waitlist | /api/support → the existing handler (POST-only; a
//                                       non-POST yields the handler's 405 JSON)
//   any other /api/*                  → 404 JSON (no such endpoint)
//   everything else                   → env.ASSETS.fetch(request) (Astro output)
import { handleWaitlist } from './functions/api/waitlist.js';
import { handleSupport } from './functions/api/support.js';

const API_ROUTES = {
  '/api/waitlist': handleWaitlist,
  '/api/support': handleSupport,
};

function jsonNotFound() {
  return new Response(JSON.stringify({ ok: false }), {
    status: 404,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export default {
  async fetch(request, env, ctx) {
    const path = new URL(request.url).pathname;

    if (path.startsWith('/api/')) {
      const handler = API_ROUTES[path];
      if (!handler) return jsonNotFound();
      // Supply the Worker context the handlers expect. `waitUntil` lets the
      // support handler send its notification in the background.
      return handler({
        request,
        env,
        waitUntil: ctx.waitUntil.bind(ctx),
      });
    }

    // Non-API: serve the built Astro site (clean/trailing-slash handling and the
    // 404 page come from the assets binding).
    return env.ASSETS.fetch(request);
  },
};
