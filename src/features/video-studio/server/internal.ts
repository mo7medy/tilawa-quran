/* eslint-disable react-func/max-lines-per-function -- Keep the lease and attempt-guarded render state transitions together for auditability. */
/* eslint-disable import/prefer-default-export -- Named boundary handlers are shared by the website and isolated integration entrypoint. */
import { ResolvedVideoManifest } from '../contracts';
import { assert, record } from '../validation';

import { capability, verify } from './crypto';
import { completeAsset } from './internalAsset';
import { writeOutput } from './internalOutput';
import { JobRow } from './jobs';
import { json, StudioEnv } from './runtime';

export const internalRequest = async (
  env: StudioEnv,
  path: string[],
  req: Request,
  body: string,
): Promise<Response> => {
  const now = Date.now();
  if (path[0] === 'output') return writeOutput(env, path, req);
  const timestamp = req.headers.get('x-studio-time') ?? '';
  assert(
    Math.abs(now - Number(timestamp)) <= 300000 &&
      (await verify(
        env.STUDIO_SIGNING_SECRET,
        `${timestamp}.${body}`,
        req.headers.get('x-studio-signature') ?? '',
      )),
    'FORBIDDEN',
    403,
  );
  const data = record(JSON.parse(body));
  if (path[0] === 'asset') return completeAsset(env, data);
  const id = String(data.jobId);
  const attempt = Number(data.attempt);
  if (path[0] === 'claim') {
    const row = await env.VIDEO_STUDIO_DB.prepare(
      "UPDATE studio_jobs SET status='preparing',error=NULL,lease_until=?,started_at=COALESCE(started_at,?) WHERE id=? AND attempt=? AND status='queued' AND expires_at>? AND (SELECT COUNT(*) FROM studio_jobs WHERE status IN ('preparing','rendering','uploading','cancel_requested') AND lease_until>?)<2 RETURNING *",
    )
      .bind(now + 300000, now, id, attempt, now, now)
      .first<JobRow>();
    assert(row, 'LEASE_UNAVAILABLE', 409);
    const manifest = JSON.parse(row.manifest) as ResolvedVideoManifest;
    // Refresh expiring upload capabilities at execution time, not queue time.
    if (manifest.spec.background.type === 'upload') {
      const asset = await env.VIDEO_STUDIO_DB.prepare(
        "SELECT id FROM studio_assets WHERE id=? AND owner=? AND status='ready' AND expires_at>?",
      )
        .bind(manifest.spec.background.value, row.owner, now)
        .first();
      assert(asset, 'BACKGROUND_EXPIRED');
      const assetId = manifest.spec.background.value;
      manifest.background.url = `${
        env.STUDIO_ORIGIN
      }/api/video-studio/file/${assetId}?token=${await capability(
        env.STUDIO_SIGNING_SECRET,
        `asset:${assetId}`,
        now + 3600000,
      )}`;
    }
    return json({
      manifest,
      outputUrl: `${
        env.STUDIO_ORIGIN
      }/api/video-studio/internal/output/${id}/${attempt}?token=${await capability(
        env.STUDIO_SIGNING_SECRET,
        `output:${id}:${attempt}`,
        now + 1800000,
      )}`,
    });
  }
  const row = await env.VIDEO_STUDIO_DB.prepare(
    'SELECT * FROM studio_jobs WHERE id=? AND attempt=? AND expires_at>?',
  )
    .bind(id, attempt, now)
    .first<JobRow>();
  assert(
    row &&
      ['preparing', 'rendering', 'uploading', 'cancel_requested'].includes(row.status) &&
      row.lease_until > now,
    'LEASE_LOST',
    409,
  );
  if (row.status === 'cancel_requested') {
    await env.VIDEO_STUDIO_DB.prepare(
      "UPDATE studio_jobs SET status='cancelled',lease_until=0,finished_at=?,output_key=NULL,output_size=0 WHERE id=? AND attempt=? AND status='cancel_requested'",
    )
      .bind(now, id, attempt)
      .run();
    if (row.output_key) await env.VIDEO_STUDIO_PRIVATE.delete(row.output_key);
    return json({ cancel: true });
  }
  if (path[0] === 'progress') {
    const status = String(data.status);
    assert(['preparing', 'rendering', 'uploading'].includes(status), 'INVALID_STATE');
    const order = ['preparing', 'rendering', 'uploading'];
    assert(order.indexOf(status) >= order.indexOf(row.status), 'INVALID_STATE', 409);
    await env.VIDEO_STUDIO_DB.prepare(
      "UPDATE studio_jobs SET status=?,progress=MAX(progress,?),lease_until=?,charged=MAX(charged,?),render_started_at=CASE WHEN ?='rendering' THEN COALESCE(render_started_at,?) ELSE render_started_at END WHERE id=? AND attempt=? AND status=?",
    )
      .bind(
        status,
        Math.max(0, Math.min(99, Math.floor(Number(data.progress) || 0))),
        now + 300000,
        Number(status !== 'preparing'),
        status,
        now,
        id,
        attempt,
        row.status,
      )
      .run();
    return json({ cancel: false });
  }
  if (path[0] === 'finish') {
    if (data.success === true) {
      assert(row.status === 'uploading' && row.output_key, 'INVALID_STATE', 409);
      const output = await env.VIDEO_STUDIO_PRIVATE.head(row.output_key);
      assert(output && output.size > 0, 'OUTPUT_UNAVAILABLE');
      await env.VIDEO_STUDIO_DB.prepare(
        "UPDATE studio_jobs SET status='completed',progress=100,lease_until=0,finished_at=? WHERE id=? AND attempt=? AND status='uploading'",
      )
        .bind(now, id, attempt)
        .run();
    } else {
      const error = /^[A-Z_]{3,50}$/.test(String(data.error))
        ? String(data.error)
        : 'RENDER_FAILED';
      const retry = data.retryable === true && row.attempt < 2;
      await env.VIDEO_STUDIO_DB.prepare(
        'UPDATE studio_jobs SET status=?,error=?,attempt=attempt+?,progress=0,finished_at=?,dispatch_at=0,call_id=NULL,lease_until=0,charged=0,output_key=NULL,output_size=0 WHERE id=? AND attempt=? AND status=?',
      )
        .bind(
          retry ? 'queued' : 'failed',
          error,
          Number(retry),
          retry ? null : now,
          id,
          attempt,
          row.status,
        )
        .run();
      if (row.output_key) await env.VIDEO_STUDIO_PRIVATE.delete(row.output_key);
    }
    return json({ ok: true });
  }
  assert(false, 'NOT_FOUND', 404);
  return json({});
};
