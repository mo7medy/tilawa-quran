/* eslint-disable react-func/max-lines-per-function -- The upload is validated against its lease both before and after the bounded stream. */
/* eslint-disable import/prefer-default-export -- Named boundary handlers are shared by the website and isolated integration entrypoint. */
import { assert } from '../validation';

import { validCapability } from './crypto';
import type { JobRow } from './jobs';
import { json, StudioEnv } from './runtime';
import { putStream } from './uploads';

export const writeOutput = async (
  env: StudioEnv,
  path: string[],
  req: Request,
): Promise<Response> => {
  const now = Date.now();

  const [, id, attemptString] = path;
  const attempt = Number(attemptString);
  assert(
    req.method === 'PUT' &&
      (await validCapability(
        env.STUDIO_SIGNING_SECRET,
        `output:${id}:${attempt}`,
        new URL(req.url).searchParams.get('token') ?? '',
      )),
    'FORBIDDEN',
    403,
  );
  const row = await env.VIDEO_STUDIO_DB.prepare(
    "SELECT * FROM studio_jobs WHERE id=? AND attempt=? AND status='uploading' AND lease_until>? AND expires_at>?",
  )
    .bind(id, attempt, now, now)
    .first<JobRow>();
  assert(row, 'LEASE_LOST', 409);
  const size = Number(req.headers.get('content-length'));
  assert(size > 0 && size <= row.output_reserved, 'FILE_TOO_LARGE', 413);
  const key = `outputs/${id}/${attempt}.mp4`;
  await putStream(env, key, req, size, 'video/mp4');
  const updated = await env.VIDEO_STUDIO_DB.prepare(
    "UPDATE studio_jobs SET output_key=?,output_size=? WHERE id=? AND attempt=? AND status='uploading' AND lease_until>?",
  )
    .bind(key, size, id, attempt, Date.now())
    .run();
  if (!updated.meta.changes) {
    await env.VIDEO_STUDIO_PRIVATE.delete(key);
    assert(false, 'LEASE_LOST', 409);
  }
  return json({ ok: true });
};
