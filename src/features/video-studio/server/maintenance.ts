/* eslint-disable react-func/max-lines-per-function -- A bounded cron pass reconciles leases before cleanup and redispatch. */
/* eslint-disable no-restricted-syntax -- Native Workers iterators keep bounded state transitions sequential; this module never enters the browser bundle. */
/* eslint-disable no-await-in-loop -- Bounded streaming, cleanup and polling operations must finish sequentially before the next step. */
/* eslint-disable import/prefer-default-export -- Named boundary handlers are shared by the website and isolated integration entrypoint. */
/* eslint-disable @typescript-eslint/naming-convention -- Preserve standard HTTP headers, provider payloads and D1 column names at the boundary. */
import { cairoDay } from '../validation';

import { dispatchJob, JobRow } from './jobs';
import { StudioEnv } from './runtime';

/** Bounded, restartable cron work. D1 leases are the source of truth across Worker/Modal restarts. */
export const maintainStudio = async (env: StudioEnv): Promise<void> => {
  if (!env.VIDEO_STUDIO_DB || !env.VIDEO_STUDIO_PRIVATE) return;
  const now = Date.now();
  const db = env.VIDEO_STUDIO_DB;
  const lost = await db
    .prepare(
      "SELECT * FROM studio_jobs WHERE (status IN ('preparing','rendering','uploading','cancel_requested') AND lease_until<?) OR (status='queued' AND created_at<?) LIMIT 40",
    )
    .bind(now, now - 1200000)
    .all<JobRow>();
  for (const row of lost.results) {
    const cancelled = row.status === 'cancel_requested';
    const retry = !cancelled && row.status !== 'queued' && row.attempt < 2;
    let status = cancelled ? 'cancelled' : 'failed';
    if (retry) status = 'queued';
    const changed = await db
      .prepare(
        'UPDATE studio_jobs SET status=?,error=?,attempt=attempt+?,progress=CASE WHEN ? THEN 0 ELSE progress END,finished_at=?,lease_until=0,dispatch_at=0,call_id=NULL,charged=?,output_key=NULL,output_size=0 WHERE id=? AND attempt=? AND status=? AND lease_until<=? RETURNING id',
      )
      .bind(
        status,
        cancelled ? null : 'RENDERER_TIMEOUT',
        Number(retry),
        Number(retry),
        retry ? null : now,
        cancelled ? row.charged : 0,
        row.id,
        row.attempt,
        row.status,
        now,
      )
      .first();
    if (changed && row.output_key) await env.VIDEO_STUDIO_PRIVATE.delete(row.output_key);
  }
  const expiredJobs = await db
    .prepare(
      'SELECT * FROM studio_jobs WHERE expires_at<=? AND (output_key IS NOT NULL OR manifest!=?) LIMIT 100',
    )
    .bind(now, '{}')
    .all<JobRow>();
  for (const row of expiredJobs.results) {
    if (row.output_key) await env.VIDEO_STUDIO_PRIVATE.delete(row.output_key);
    await db
      .prepare(
        "UPDATE studio_jobs SET status='expired',manifest='{}',output_key=NULL,output_size=0,lease_until=0 WHERE id=? AND expires_at<=?",
      )
      .bind(row.id, now)
      .run();
  }
  const assets = await db
    .prepare(
      "SELECT id,object_key FROM studio_assets WHERE expires_at<=? OR status='failed' LIMIT 100",
    )
    .bind(now)
    .all<{ id: string; object_key: string }>();
  for (const asset of assets.results) {
    await env.VIDEO_STUDIO_PRIVATE.delete(asset.object_key);
    await db.prepare('DELETE FROM studio_assets WHERE id=?').bind(asset.id).run();
  }
  await db.batch([
    db.prepare('DELETE FROM studio_projects WHERE expires_at<=?').bind(now),
    db
      .prepare(
        "DELETE FROM studio_jobs WHERE expires_at<=? AND day<? AND output_key IS NULL AND manifest='{}'",
      )
      .bind(now, cairoDay(now)),
    db.prepare('DELETE FROM studio_rates WHERE expires_at<=?').bind(now),
    db
      .prepare(
        "UPDATE studio_assets SET status='failed' WHERE status IN ('pending','receiving','uploaded') AND created_at<?",
      )
      .bind(now - 1800000),
  ]);
  if (env.STUDIO_ENABLED !== '1') return;
  const queued = await db
    .prepare(
      "SELECT * FROM studio_jobs WHERE status='queued' AND expires_at>? AND dispatch_at<? ORDER BY created_at LIMIT 2",
    )
    .bind(now, now - 60000)
    .all<JobRow>();
  for (const row of queued.results) {
    try {
      await dispatchJob(env, row);
    } catch {
      /* The next cron run retries the durable outbox. */
    }
  }
};
