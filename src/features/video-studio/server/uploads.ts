/* eslint-disable @typescript-eslint/naming-convention -- Preserve standard HTTP headers, provider payloads and D1 column names at the boundary. */
/* eslint-disable react-func/max-lines-per-function -- The streamed upload, probe dispatch and failure cleanup share one state transition boundary. */
import type { ReadableStream as WorkerStream } from '@cloudflare/workers-types';

import { StudioOwner } from '../contracts';
import { assert, policy } from '../validation';

import { capability } from './crypto';
import { callModal } from './jobs';
import { StudioEnv } from './runtime';

export interface UploadRow {
  id: string;
  owner: string;
  object_key: string;
  size: number;
  mime: string;
  status: string;
  expires_at: number;
}
export const getUpload = async (
  env: StudioEnv,
  owner: StudioOwner,
  id: string,
): Promise<UploadRow> => {
  const row = await env.VIDEO_STUDIO_DB.prepare(
    'SELECT * FROM studio_assets WHERE id=? AND owner=? AND expires_at>?',
  )
    .bind(id, owner.id, Date.now())
    .first<UploadRow>();
  assert(row, 'NOT_FOUND', 404);
  return row;
};
export const initUpload = async (
  env: StudioEnv,
  owner: StudioOwner,
  mime: string,
  size: number,
): Promise<{ id: string }> => {
  assert(env.STUDIO_ENABLED === '1', 'STUDIO_PAUSED', 503);
  assert(['image/jpeg', 'image/png', 'image/webp', 'video/mp4'].includes(mime), 'INVALID_FILE');
  const max = mime === 'video/mp4' ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
  assert(Number.isInteger(size) && size > 0 && size <= max, 'FILE_TOO_LARGE', 413);
  const id = crypto.randomUUID();
  const now = Date.now();
  const limits = policy(owner.registered);
  const row = await env.VIDEO_STUDIO_DB.prepare(
    "INSERT INTO studio_assets(id,owner,registered,object_key,size,mime,created_at,expires_at) SELECT ?,?,?,?,?,?,?,? WHERE COALESCE((SELECT SUM(size) FROM studio_assets WHERE owner=? AND expires_at>? AND status!='failed'),0)+COALESCE((SELECT SUM(CASE WHEN status IN ('queued','preparing','rendering','uploading','cancel_requested') THEN output_reserved ELSE output_size END) FROM studio_jobs WHERE owner=? AND expires_at>?),0)+?<=? RETURNING id",
  )
    .bind(
      id,
      owner.id,
      Number(owner.registered),
      `uploads/${id}`,
      size,
      mime,
      now,
      now + limits.artifactMs,
      owner.id,
      now,
      owner.id,
      now,
      size,
      limits.storage,
    )
    .first();
  assert(row, 'STORAGE_LIMIT', 429);
  return { id };
};
/** FixedLengthStream preserves the known length required by R2, while also rejecting truncated/oversized bodies. */
export const putStream = async (
  env: StudioEnv,
  key: string,
  request: Request,
  size: number,
  mime: string,
): Promise<void> => {
  assert(
    Number(request.headers.get('content-length')) === size && request.body,
    'INVALID_FILE',
    413,
  );
  const Constructor = (
    globalThis as unknown as {
      FixedLengthStream: new (length: number) => TransformStream<Uint8Array, Uint8Array>;
    }
  ).FixedLengthStream;
  const bounded = new Constructor(size);
  await Promise.all([
    request.body.pipeTo(bounded.writable),
    env.VIDEO_STUDIO_PRIVATE.put(key, bounded.readable as unknown as WorkerStream, {
      httpMetadata: { contentType: mime },
    }),
  ]);
};
export const receiveUpload = async (
  env: StudioEnv,
  owner: StudioOwner,
  id: string,
  request: Request,
): Promise<void> => {
  const row = await getUpload(env, owner, id);
  assert(row.status === 'pending', 'INVALID_STATE', 409);
  const claimed = await env.VIDEO_STUDIO_DB.prepare(
    "UPDATE studio_assets SET status='receiving' WHERE id=? AND status='pending' RETURNING id",
  )
    .bind(id)
    .first();
  assert(claimed, 'INVALID_STATE', 409);
  let phase = 'stream';
  try {
    await putStream(env, row.object_key, request, row.size, row.mime);
    await env.VIDEO_STUDIO_DB.prepare("UPDATE studio_assets SET status='uploaded' WHERE id=?")
      .bind(id)
      .run();
    phase = 'probe';
    await probeUpload(env, row);
  } catch (error) {
    // eslint-disable-next-line no-console -- Phase and error type only; never include file data, URLs or credentials.
    console.error(
      JSON.stringify({
        event: 'studio_upload_failure',
        phase,
        category: error instanceof Error ? error.name : 'Unknown',
      }),
    );
    await env.VIDEO_STUDIO_PRIVATE.delete(row.object_key);
    await env.VIDEO_STUDIO_DB.prepare("UPDATE studio_assets SET status='failed' WHERE id=?")
      .bind(id)
      .run();
    throw error;
  }
};
export const probeUpload = async (env: StudioEnv, row: UploadRow): Promise<void> => {
  const token = await capability(
    env.STUDIO_SIGNING_SECRET,
    `asset:${row.id}`,
    Date.now() + 3600000,
  );
  await callModal(env, '/probe', {
    assetId: row.id,
    mime: row.mime,
    size: row.size,
    url: `${env.STUDIO_ORIGIN}/api/video-studio/file/${row.id}?token=${token}`,
  });
};
