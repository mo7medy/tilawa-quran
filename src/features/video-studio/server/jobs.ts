/* eslint-disable react-func/max-lines-per-function -- The idempotent quota reservation and durable dispatch are one job creation transaction flow. */
/* eslint-disable @typescript-eslint/naming-convention -- Preserve standard HTTP headers, provider payloads and D1 column names at the boundary. */
import { ResolvedVideoManifest, StudioOwner, VideoRenderJob } from '../contracts';
import { assert, cairoDay, policy } from '../validation';

import { resolveManifest } from './content';
import { sha256 } from './crypto';
import { callModal, dispatchJob } from './jobTransport';
import { getProject } from './projects';
import { StudioEnv } from './runtime';

export interface JobRow {
  id: string;
  owner: string;
  project_id: string;
  status: VideoRenderJob['status'];
  progress: number;
  attempt: number;
  error: string;
  created_at: number;
  expires_at: number;
  output_key: string;
  output_reserved: number;
  manifest: string;
  call_id: string;
  lease_until: number;
  charged: number;
  dispatch_at: number;
}
export const jobView = (row: JobRow): VideoRenderJob => ({
  id: row.id,
  projectId: row.project_id,
  status: row.status,
  progress: row.progress,
  attempt: row.attempt,
  error: row.error,
  createdAt: row.created_at,
  expiresAt: row.expires_at,
});
export const getJob = async (env: StudioEnv, owner: StudioOwner, id: string): Promise<JobRow> => {
  const row = await env.VIDEO_STUDIO_DB.prepare(
    'SELECT * FROM studio_jobs WHERE id=? AND owner=? AND expires_at>?',
  )
    .bind(id, owner.id, Date.now())
    .first<JobRow>();
  assert(row, 'NOT_FOUND', 404);
  return row;
};
export { quota, downloadUrl, callModal, dispatchJob } from './jobTransport';
export const createJob = async (
  env: StudioEnv,
  owner: StudioOwner,
  projectId: string,
  idempotency: string,
  previewHash: string,
): Promise<VideoRenderJob> => {
  assert(env.STUDIO_ENABLED === '1', 'STUDIO_PAUSED', 503);
  assert(/^[0-9a-f-]{36}$/.test(idempotency), 'INVALID_INPUT');
  const existing = await env.VIDEO_STUDIO_DB.prepare(
    'SELECT * FROM studio_jobs WHERE owner=? AND idempotency=?',
  )
    .bind(owner.id, idempotency)
    .first<JobRow>();
  if (existing) {
    assert(existing.project_id === projectId, 'INVALID_INPUT', 409);
    return jobView(existing);
  }
  const project = await getProject(env, owner, projectId);
  const manifest = await resolveManifest(env, owner, project.spec);
  assert((await manifestHash(manifest)) === previewHash, 'PREVIEW_CHANGED', 409);
  const now = Date.now();
  const id = crypto.randomUUID();
  const reserve = Math.min(
    100 * 1048576,
    Math.ceil((manifest.durationMs / 1000) * 550000) + 2097152,
  );
  try {
    await env.VIDEO_STUDIO_DB.prepare(
      'INSERT INTO studio_jobs(id,owner,project_id,revision,day,daily_limit,duration_ms,manifest,idempotency,created_at,expires_at,storage_limit,output_reserved) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)',
    )
      .bind(
        id,
        owner.id,
        project.id,
        project.revision,
        cairoDay(now),
        policy(owner.registered).daily,
        manifest.durationMs,
        JSON.stringify(manifest),
        idempotency,
        now,
        now + policy(owner.registered).artifactMs,
        policy(owner.registered).storage,
        reserve,
      )
      .run();
  } catch (error) {
    const concurrent = await env.VIDEO_STUDIO_DB.prepare(
      'SELECT * FROM studio_jobs WHERE owner=? AND idempotency=?',
    )
      .bind(owner.id, idempotency)
      .first<JobRow>();
    if (concurrent) {
      assert(concurrent.project_id === projectId, 'INVALID_INPUT', 409);
      return jobView(concurrent);
    }
    throw error;
  }
  const row = await getJob(env, owner, id);
  // A durable queued record is the outbox. Cron retries dispatch if the response is lost.
  try {
    await dispatchJob(env, row);
  } catch {
    /* The durable dispatcher will retry; no process-local background task. */
  }
  return jobView(row);
};
export const manifestHash = async (manifest: ResolvedVideoManifest): Promise<string> => {
  const normalized = JSON.parse(JSON.stringify(manifest)) as ResolvedVideoManifest;
  if (normalized.spec.background.type === 'upload') {
    normalized.background.url = normalized.spec.background.value;
  }
  return sha256(JSON.stringify(normalized));
};
export const cancelJob = async (env: StudioEnv, owner: StudioOwner, id: string): Promise<void> => {
  const row = await getJob(env, owner, id);
  if (['completed', 'cancelled', 'failed', 'expired'].includes(row.status)) return;
  await env.VIDEO_STUDIO_DB.prepare(
    "UPDATE studio_jobs SET status=CASE WHEN status='queued' THEN 'cancelled' ELSE 'cancel_requested' END WHERE id=? AND owner=? AND status IN ('queued','preparing','rendering','uploading')",
  )
    .bind(id, owner.id)
    .run();
  if (row.call_id) {
    try {
      await callModal(env, '/cancel', { callId: row.call_id });
    } catch {
      /* Heartbeat and lease reconciliation also cancel. */
    }
  }
};
