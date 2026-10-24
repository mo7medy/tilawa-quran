/* eslint-disable import/prefer-default-export -- Named boundary handlers are shared by the website and isolated integration entrypoint. */
import { record } from '../validation';

import { json, StudioEnv } from './runtime';

export const completeAsset = async (
  env: StudioEnv,
  data: Record<string, unknown>,
): Promise<Response> => {
  const now = Date.now();

  const metadata = record(data.metadata ?? {});
  const asset = await env.VIDEO_STUDIO_DB.prepare(
    "SELECT mime FROM studio_assets WHERE id=? AND status='uploaded' AND expires_at>?",
  )
    .bind(String(data.assetId), now)
    .first<{ mime: string }>();
  const valid =
    asset &&
    data.valid === true &&
    metadata.mime === asset.mime &&
    Number(metadata.width) > 0 &&
    Number(metadata.height) > 0 &&
    Number(metadata.width) <= 4096 &&
    Number(metadata.height) <= 4096 &&
    (asset.mime !== 'video/mp4' ||
      (metadata.codec === 'h264' &&
        Number(metadata.duration) > 0 &&
        Number(metadata.duration) <= 180));
  await env.VIDEO_STUDIO_DB.prepare(
    "UPDATE studio_assets SET status=?,metadata=? WHERE id=? AND status='uploaded'",
  )
    .bind(valid ? 'ready' : 'failed', JSON.stringify(metadata), String(data.assetId))
    .run();
  return json({ ok: true });
};
