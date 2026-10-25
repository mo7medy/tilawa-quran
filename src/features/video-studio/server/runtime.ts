/* eslint-disable @typescript-eslint/naming-convention -- Preserve standard HTTP headers, provider payloads and D1 column names at the boundary. */
import type { D1Database, R2Bucket } from '@cloudflare/workers-types';

import { StudioError } from '../validation';

export interface StudioEnv {
  VIDEO_STUDIO_DB: D1Database;
  VIDEO_STUDIO_PRIVATE: R2Bucket;
  VIDEO_STUDIO_ASSETS: R2Bucket;
  VIDEO_STUDIO_BACKGROUNDS?: R2Bucket;
  STUDIO_ENABLED?: string;
  STUDIO_ORIGIN: string;
  STUDIO_SIGNING_SECRET: string;
  STUDIO_MODAL_URL: string;
  STUDIO_MODAL_KEY: string;
  STUDIO_MODAL_SECRET: string;
  STUDIO_TURNSTILE_SECRET: string;
  STUDIO_TURNSTILE_SITE_KEY: string;
}
export const studioEnv = (env: StudioEnv): StudioEnv => {
  if (
    !env.VIDEO_STUDIO_DB ||
    !env.VIDEO_STUDIO_PRIVATE ||
    !env.VIDEO_STUDIO_ASSETS ||
    !env.STUDIO_SIGNING_SECRET
  ) {
    throw new StudioError('STUDIO_NOT_CONFIGURED', 503);
  }
  return env;
};
export const json = (data: unknown, status = 200): Response =>
  Response.json(data, {
    status,
    headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' },
  });
