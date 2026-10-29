/* eslint-disable react-func/max-lines-per-function -- Legacy enqueue retains its migration fence. */
/* eslint-disable @typescript-eslint/naming-convention -- D1 result fields retain their storage names. */
import { AutomationPlan } from '../automation';

import { legacySqlGuard } from './multiControl';
import { PublicationRow, PublisherRow } from './publishingStore';
import { StudioEnv } from './runtime';

export const enqueuePublications = async (
  env: StudioEnv,
  connection: PublisherRow,
): Promise<void> => {
  if (!connection.enabled || env.STUDIO_ENABLED !== '1') return;
  const now = Date.now();
  const runs = await env.VIDEO_STUDIO_DB.prepare(
    "SELECT a.id,a.plan,a.job_id,j.expires_at FROM studio_automation_runs a JOIN studio_jobs j ON j.id=a.job_id AND j.owner=a.owner WHERE a.owner=? AND a.created_at>=? AND a.status IN ('submitted','completed') AND j.status='completed' AND j.expires_at>? AND j.output_key IS NOT NULL AND NOT EXISTS(SELECT 1 FROM studio_publications p WHERE p.run_id=a.id AND p.platform=?) ORDER BY a.created_at LIMIT 3",
  )
    .bind(connection.owner, connection.activated_at, now + 86400000, connection.platform)
    .all<{ id: string; plan: string; job_id: string; expires_at: number }>();
  const guard = await legacySqlGuard(env);
  const inserts = runs.results.map((run) => {
    const plan = JSON.parse(run.plan) as AutomationPlan;
    return env.VIDEO_STUDIO_DB.prepare(
      `INSERT OR IGNORE INTO studio_publications(id,run_id,platform,owner,job_id,connection_revision,organization_id,channel_id,text,media_until,created_at,updated_at) SELECT ?,?,?,?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM studio_publisher WHERE owner=? AND revision=? AND platform=? AND enabled=1)${guard}`,
    ).bind(
      crypto.randomUUID(),
      run.id,
      connection.platform,
      connection.owner,
      run.job_id,
      connection.revision,
      connection.organization_id,
      connection.channel_id,
      `${plan.caption}\n${plan.hashtags.join(' ')}`,
      run.expires_at,
      now,
      now,
      connection.owner,
      connection.revision,
      connection.platform,
    );
  });
  if (inserts.length) await env.VIDEO_STUDIO_DB.batch(inserts);
};
export const claimPublication = async (env: StudioEnv): Promise<PublicationRow | null> => {
  const now = Date.now();
  const guard = await legacySqlGuard(env);
  return env.VIDEO_STUDIO_DB.prepare(
    `UPDATE studio_publications SET status=CASE WHEN status='queued' THEN 'sending' ELSE status END,lease=?,lease_until=?,attempts=attempts+1,updated_at=? WHERE id=(SELECT p.id FROM studio_publications p JOIN studio_publisher c ON c.owner=p.owner AND c.revision=p.connection_revision AND c.platform=p.platform WHERE ((p.status='queued' AND c.enabled=1) OR p.status='pending') AND p.next_at<=? AND p.lease_until<? AND p.media_until>? ORDER BY p.created_at LIMIT 1)${guard} RETURNING *`,
  )
    .bind(crypto.randomUUID(), now + 120000, now, now, now, now)
    .first<PublicationRow>();
};
export const recoverPublications = async (env: StudioEnv): Promise<void> => {
  const now = Date.now();
  await env.VIDEO_STUDIO_DB.batch([
    env.VIDEO_STUDIO_DB.prepare(
      "UPDATE studio_publications SET status='unknown',error='BUFFER_UNCERTAIN',lease=NULL,lease_until=0,updated_at=? WHERE status='sending' AND lease_until<?",
    ).bind(now, now),
    env.VIDEO_STUDIO_DB.prepare(
      "UPDATE studio_publications SET status='unknown',error='BUFFER_UNCERTAIN',lease=NULL,lease_until=0,updated_at=? WHERE status='pending' AND created_at<? AND lease_until<?",
    ).bind(now, now - 86400000, now),
    env.VIDEO_STUDIO_DB.prepare(
      "UPDATE studio_publications SET status=CASE WHEN status='queued' THEN 'cancelled' ELSE 'unknown' END,error='BUFFER_EXPIRED',lease=NULL,lease_until=0,updated_at=? WHERE status IN ('queued','pending') AND (media_until<=? OR NOT EXISTS(SELECT 1 FROM studio_publisher c WHERE c.owner=studio_publications.owner AND c.revision=studio_publications.connection_revision AND c.platform=studio_publications.platform))",
    ).bind(now, now),
    env.VIDEO_STUDIO_DB.prepare(
      'DELETE FROM studio_publications WHERE created_at<? AND media_until<?',
    ).bind(now - 30 * 86400000, now),
  ]);
};
