/* eslint-disable no-nested-ternary, max-lines -- Quota class and engine guards are selected only from trusted server arguments. */
/* eslint-disable react-func/max-lines-per-function -- The idempotent quota reservation and durable dispatch are one job creation transaction flow. */
/* eslint-disable @typescript-eslint/naming-convention -- Preserve standard HTTP headers, provider payloads and D1 column names at the boundary. */
import { AUTOMATION_GAP_MS } from '../automation';
import { ResolvedVideoManifest, StudioOwner, VideoRenderJob } from '../contracts';
import { assert, cairoDay, policy } from '../validation';

import { resolveManifest } from './content';
import { sha256 } from './crypto';
import { callModal, dispatchJob } from './jobTransport';
import { multiControl } from './multiControl';
import { activeTaskTarget } from './multiSchedule';
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
  automationGuard?: { id: string; lease: string; multi?: boolean },
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
  const migrated = !!(await multiControl(env));
  const legacyGuard = migrated
    ? ` AND NOT EXISTS(SELECT 1 FROM studio_multi_control WHERE maintenance=1 OR active=1 OR cutover_day!='')`
    : '';
  const table = automationGuard?.multi ? 'studio_automation_tasks' : 'studio_automation_runs';
  const multiGuard = `EXISTS(SELECT 1 FROM studio_automation_tasks r JOIN studio_automation_settings s ON s.owner=r.owner WHERE r.id=? AND r.lease=? AND r.status='ready' AND r.day=? AND s.enabled=1 AND EXISTS(SELECT 1 FROM studio_multi_control WHERE active=1 AND maintenance=0) AND ${activeTaskTarget.replaceAll(
    'studio_automation_tasks.id',
    'r.id',
  )})`;
  try {
    const insert = env.VIDEO_STUDIO_DB.prepare(
      `INSERT INTO studio_jobs(id,owner,project_id,revision,day,daily_limit,duration_ms,manifest,idempotency,created_at,expires_at,storage_limit,output_reserved${
        migrated ? ',quota_class' : ''
      }) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?${migrated ? ',?' : ''} WHERE ${
        automationGuard
          ? automationGuard.multi
            ? multiGuard
            : `EXISTS(SELECT 1 FROM studio_automation_runs r JOIN studio_automation_settings s ON s.owner=r.owner WHERE r.id=? AND r.lease=? AND r.status='ready' AND s.enabled=1)${legacyGuard} AND NOT EXISTS(SELECT 1 FROM studio_jobs j JOIN studio_automation_runs r ON r.job_id=j.id WHERE r.owner=? AND j.created_at>?)`
          : '1'
      }`,
    ).bind(
      id,
      owner.id,
      project.id,
      project.revision,
      cairoDay(now),
      automationGuard?.multi && migrated ? 30 : policy(owner.registered).daily,
      manifest.durationMs,
      JSON.stringify(manifest),
      idempotency,
      now,
      now + policy(owner.registered).artifactMs,
      automationGuard?.multi && migrated ? 10 * 1073741824 : policy(owner.registered).storage,
      reserve,
      ...(migrated ? [automationGuard?.multi ? 'automation' : 'manual'] : []),
      ...(automationGuard
        ? automationGuard.multi
          ? [automationGuard.id, automationGuard.lease, cairoDay(now)]
          : [automationGuard.id, automationGuard.lease, owner.id, now - AUTOMATION_GAP_MS]
        : []),
    );
    if (automationGuard) {
      // Job reservation and automation tracking commit together, even if pause or dispatch races.
      await env.VIDEO_STUDIO_DB.batch([
        insert,
        env.VIDEO_STUDIO_DB.prepare(
          `UPDATE ${table} SET status='submitted',job_id=?,lease=NULL,lease_until=0,error=NULL,updated_at=? WHERE id=? AND lease=? AND EXISTS(SELECT 1 FROM studio_jobs WHERE id=? AND owner=?)`,
        ).bind(id, now, automationGuard.id, automationGuard.lease, id, owner.id),
      ]);
    } else {
      await insert.run();
    }
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
    "UPDATE studio_jobs SET finished_at=CASE WHEN status='queued' THEN ? ELSE finished_at END,status=CASE WHEN status='queued' THEN 'cancelled' ELSE 'cancel_requested' END WHERE id=? AND owner=? AND status IN ('queued','preparing','rendering','uploading')",
  )
    .bind(Date.now(), id, owner.id)
    .run();
  if (row.call_id) {
    try {
      await callModal(env, '/cancel', { callId: row.call_id });
    } catch {
      /* Heartbeat and lease reconciliation also cancel. */
    }
  }
};
