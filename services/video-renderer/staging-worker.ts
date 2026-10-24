import { handleStudio } from '../../src/features/video-studio/server/api';
import { maintainStudio } from '../../src/features/video-studio/server/maintenance';
import type { StudioEnv } from '../../src/features/video-studio/server/runtime';

// Integration-test entrypoint. The complete website uses cloudflare-worker.js and the same handlers.
export default {
  fetch: (request: Request, env: StudioEnv): Promise<Response> => handleStudio(request, env),
  scheduled: (
    _event: unknown,
    env: StudioEnv,
    ctx: { waitUntil: (work: Promise<void>) => void },
  ): void => ctx.waitUntil(maintainStudio(env)),
};
