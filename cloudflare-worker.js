// OpenNext creates this module during the Cloudflare build.
// eslint-disable-next-line import/no-unresolved
import openNext from './.open-next/worker.js';
import { getVisitorLocaleRedirect } from './src/tilawa/visitorLocale';

// Keep generated Durable Object and other adapter exports available.
// eslint-disable-next-line import/no-unresolved
export * from './.open-next/worker.js';

export default {
  ...openNext,
  fetch(request, env, ctx) {
    // Use trusted Workers metadata directly; no zone header transform or GPS permission is required.
    const redirect = getVisitorLocaleRedirect(request, request.cf?.country);
    if (redirect) {
      return new Response(null, {
        status: 307,
        headers: { Location: redirect.href, 'Cache-Control': 'private, no-store' },
      });
    }
    return openNext.fetch(request, env, ctx);
  },
};
