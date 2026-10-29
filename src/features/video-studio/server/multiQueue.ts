/* eslint-disable react-func/max-lines-per-function -- Each statement set is a durable outbox transition. */
/* eslint-disable @typescript-eslint/naming-convention -- SQLite fields. */
import { AUTOMATION_GAP_MS, automationClock } from '../automation';

import { SQL_UUID } from './multiControl';
import { PublicationRow } from './publishingStore';
import { StudioEnv } from './runtime';

export interface DeliveryRow extends PublicationRow {
  destination_id: string;
  connection_id: string;
}

export const enqueueDeliveries = async (env: StudioEnv): Promise<void> => {
  if (env.STUDIO_ENABLED !== '1') return;
  const now = Date.now();
  await env.VIDEO_STUDIO_DB.prepare(
    `INSERT OR IGNORE INTO studio_deliveries(id,run_id,destination_id,owner,platform,job_id,connection_id,connection_revision,organization_id,channel_id,text,media_until,created_at,updated_at)
 SELECT ${SQL_UUID},t.id,d.id,t.owner,d.platform,t.job_id,d.connection_id,c.revision,d.organization_id,d.channel_id,
  json_extract(t.plan,'$.caption')||char(10)||COALESCE((SELECT GROUP_CONCAT(value,' ') FROM json_each(t.plan,'$.hashtags')),''),j.expires_at,?,?
 FROM studio_automation_tasks t JOIN studio_task_destinations td ON td.task_id=t.id
 JOIN studio_destinations d ON d.id=td.destination_id AND d.revision=td.revision JOIN studio_buffer_connections c ON c.id=d.connection_id
 JOIN studio_jobs j ON j.id=t.job_id AND j.owner=t.owner
 WHERE t.day=? AND t.status IN ('submitted','completed') AND j.status='completed' AND j.output_key IS NOT NULL AND j.expires_at>?
 AND d.paused=0 AND d.disconnected=0 AND c.disconnected=0 AND EXISTS(SELECT 1 FROM studio_multi_control WHERE active=1 AND maintenance=0)
 AND EXISTS(SELECT 1 FROM studio_automation_settings WHERE owner=t.owner AND enabled=1)
 AND NOT EXISTS(SELECT 1 FROM studio_deliveries p WHERE p.run_id=t.id AND p.destination_id=d.id) ORDER BY t.slot,d.id LIMIT 27`,
  )
    .bind(now, now, automationClock(now).day, now + 86400000)
    .run();
};
export const claimDelivery = async (env: StudioEnv): Promise<DeliveryRow | null> => {
  const now = Date.now();
  return env.VIDEO_STUDIO_DB.prepare(
    `UPDATE studio_deliveries SET status=CASE WHEN status='queued' THEN 'sending' ELSE status END,lease=?,lease_until=?,attempts=attempts+1,updated_at=? WHERE id=(SELECT p.id FROM studio_deliveries p JOIN studio_buffer_connections c ON c.id=p.connection_id JOIN studio_destinations d ON d.id=p.destination_id WHERE ((p.status='queued' AND EXISTS(SELECT 1 FROM studio_automation_tasks t WHERE t.id=p.run_id AND t.day=? AND t.next_at<=?) AND d.paused=0 AND d.disconnected=0 AND c.disconnected=0 AND d.connection_id=p.connection_id AND d.last_sent_at<=? AND EXISTS(SELECT 1 FROM studio_automation_settings WHERE owner=p.owner AND enabled=1) AND NOT EXISTS(SELECT 1 FROM studio_deliveries a WHERE a.destination_id=p.destination_id AND a.status='sending' AND a.lease_until>?)) OR p.status='pending') AND p.next_at<=? AND p.lease_until<=? AND p.media_until>? AND c.cooldown_until<=? ORDER BY p.next_at,p.created_at,p.destination_id LIMIT 1) AND EXISTS(SELECT 1 FROM studio_multi_control WHERE active=1 AND maintenance=0) RETURNING *`,
  )
    .bind(
      crypto.randomUUID(),
      now + 120000,
      now,
      automationClock(now).day,
      now,
      now - AUTOMATION_GAP_MS,
      now,
      now,
      now,
      now,
      now,
    )
    .first<DeliveryRow>();
};
export const recoverDeliveries = async (env: StudioEnv): Promise<void> => {
  const now = Date.now();
  const db = env.VIDEO_STUDIO_DB;
  await db.batch([
    db
      .prepare(
        "UPDATE studio_destinations SET last_sent_at=MAX(last_sent_at,?) WHERE EXISTS(SELECT 1 FROM studio_deliveries WHERE destination_id=studio_destinations.id AND status='sending' AND lease_until<=?)",
      )
      .bind(now, now),
    db
      .prepare(
        "UPDATE studio_deliveries SET status='unknown',error='BUFFER_UNCERTAIN',lease=NULL,lease_until=0,updated_at=? WHERE status='sending' AND lease_until<=?",
      )
      .bind(now, now),
    db
      .prepare(
        "UPDATE studio_deliveries SET status='unknown',error='BUFFER_UNCERTAIN',lease=NULL,lease_until=0,updated_at=? WHERE status='pending' AND created_at<? AND lease_until<=?",
      )
      .bind(now, now - 86400000, now),
    db
      .prepare(
        "UPDATE studio_deliveries SET status=CASE WHEN status='queued' THEN 'cancelled' ELSE 'unknown' END,error='BUFFER_EXPIRED',lease=NULL,lease_until=0,updated_at=? WHERE status IN ('queued','pending') AND media_until<=?",
      )
      .bind(now, now),
    db
      .prepare(
        "UPDATE studio_deliveries SET status='cancelled',error='AUTOMATION_MISSED',updated_at=? WHERE status='queued' AND EXISTS(SELECT 1 FROM studio_automation_tasks t WHERE t.id=run_id AND t.day<?)",
      )
      .bind(now, automationClock(now).day),
    db
      .prepare(
        "UPDATE studio_deliveries SET status='cancelled',error='PUBLISHING_PAUSED',updated_at=? WHERE status='queued' AND EXISTS(SELECT 1 FROM studio_destinations d JOIN studio_buffer_connections c ON c.id=d.connection_id WHERE d.id=destination_id AND (d.paused=1 OR d.disconnected=1 OR c.disconnected=1))",
      )
      .bind(now),
    db
      .prepare('DELETE FROM studio_publications WHERE created_at<? AND media_until<?')
      .bind(now - 30 * 86400000, now),
    db.prepare('DELETE FROM studio_automation_runs WHERE created_at<?').bind(now - 30 * 86400000),
    db
      .prepare('DELETE FROM studio_deliveries WHERE created_at<? AND media_until<?')
      .bind(now - 30 * 86400000, now),
    db
      .prepare(
        'DELETE FROM studio_task_destinations WHERE task_id IN (SELECT id FROM studio_automation_tasks WHERE created_at<?)',
      )
      .bind(now - 30 * 86400000),
    db.prepare('DELETE FROM studio_automation_tasks WHERE created_at<?').bind(now - 30 * 86400000),
    db
      .prepare('DELETE FROM studio_day_destinations WHERE day<?')
      .bind(new Date(now - 32 * 86400000).toISOString().slice(0, 10)),
    db
      .prepare('DELETE FROM studio_automation_days WHERE day<?')
      .bind(new Date(now - 32 * 86400000).toISOString().slice(0, 10)),
  ]);
};
