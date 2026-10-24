// OpenNext creates this module during the Cloudflare build.
// eslint-disable-next-line import/no-unresolved
import openNext from './.open-next/worker.js';
import { handleStudio } from './src/features/video-studio/server/api';
import { maintainStudio } from './src/features/video-studio/server/maintenance';
import { getVisitorLocaleRedirect } from './src/tilawa/visitorLocale';

// Keep generated Durable Object and other adapter exports available.
// eslint-disable-next-line import/no-unresolved
export * from './.open-next/worker.js';

export default {
  ...openNext,
  scheduled(_event, env, ctx) {
    ctx.waitUntil(maintainStudio(env));
  },
  fetch(request, env, ctx) {
    if (new URL(request.url).pathname.startsWith('/api/video-studio/')) {
      return handleStudio(request, env);
    }
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
