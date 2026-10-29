/* eslint-disable @typescript-eslint/naming-convention -- HTTP headers and D1 column names. */
import { StudioOwner, StudioQuota } from '../contracts';
import { assert, policy, cairoDay, nextCairoDay } from '../validation';

import { capability } from './crypto';
import type { JobRow } from './jobs';
import { multiControl } from './multiControl';
import { StudioEnv } from './runtime';

export const quota = async (env: StudioEnv, owner: StudioOwner): Promise<StudioQuota> => {
  const limits = policy(owner.registered);
  const scope = (await multiControl(env)) ? " AND quota_class='manual'" : '';
  const now = Date.now();
  const result = await env.VIDEO_STUDIO_DB.prepare(
    `SELECT COUNT(*) AS count FROM studio_jobs WHERE owner=? AND day=?${scope} AND (charged=1 OR status IN ('queued','preparing','rendering','uploading','completed','cancel_requested'))`,
  )
    .bind(owner.id, cairoDay())
    .first<{ count: number }>();
  const files = await env.VIDEO_STUDIO_DB.prepare(
    `SELECT COALESCE((SELECT SUM(size) FROM studio_assets WHERE owner=? AND expires_at>? AND status!='failed'),0)+COALESCE((SELECT SUM(CASE WHEN status IN ('queued','preparing','rendering','uploading','cancel_requested') THEN output_reserved ELSE output_size END) FROM studio_jobs WHERE owner=? AND expires_at>?${scope}),0) AS bytes`,
  )
    .bind(owner.id, now, owner.id, now)
    .first<{ bytes: number }>();
  return {
    remaining: Math.max(0, limits.daily - result.count),
    limit: limits.daily,
    maxDurationMs: limits.durationMs,
    storageBytes: files.bytes,
    storageLimit: limits.storage,
    resetAt: nextCairoDay(),
    available: env.STUDIO_ENABLED === '1',
  };
};
export const callModal = async (
  env: StudioEnv,
  path: string,
  payload: unknown,
): Promise<Record<string, unknown>> => {
  assert(
    env.STUDIO_MODAL_URL && env.STUDIO_MODAL_KEY && env.STUDIO_MODAL_SECRET,
    'RENDERER_UNAVAILABLE',
    503,
  );
  const response = await fetch(`${env.STUDIO_MODAL_URL.replace(/\/$/, '')}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Modal-Key': env.STUDIO_MODAL_KEY,
      'Modal-Secret': env.STUDIO_MODAL_SECRET,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000),
    // Workers supports manual/follow only. Reject redirects below without forwarding credentials.
    redirect: 'manual',
  });
  assert(response.ok, 'RENDERER_UNAVAILABLE', 503);
  return response.json();
};
export const dispatchJob = async (env: StudioEnv, row: JobRow): Promise<void> => {
  if (row.status !== 'queued') return;
  const claim = await env.VIDEO_STUDIO_DB.prepare(
    "UPDATE studio_jobs SET dispatch_at=? WHERE id=? AND attempt=? AND status='queued' AND (call_id IS NULL OR call_id='') AND dispatch_at<? RETURNING id",
  )
    .bind(Date.now(), row.id, row.attempt, Date.now() - 60000)
    .first();
  if (!claim) return;
  const result = await callModal(env, '/jobs', { jobId: row.id, attempt: row.attempt });
  await env.VIDEO_STUDIO_DB.prepare('UPDATE studio_jobs SET call_id=? WHERE id=? AND attempt=?')
    .bind(String(result.callId ?? ''), row.id, row.attempt)
    .run();
};
export const downloadUrl = async (env: StudioEnv, row: JobRow): Promise<string> => {
  assert(row.status === 'completed' && row.output_key, 'NOT_READY', 409);
  const expires = Math.min(row.expires_at, Date.now() + 600000);
  return `${env.STUDIO_ORIGIN}/api/video-studio/download/${row.id}?token=${await capability(
    env.STUDIO_SIGNING_SECRET,
    `download:${row.id}`,
    expires,
  )}`;
};
