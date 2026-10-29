/* eslint-disable react-func/max-lines-per-function, no-nested-ternary -- Snapshot and grouped task inserts form the bounded daily planning operation. */
/* eslint-disable @typescript-eslint/naming-convention -- SQLite fields. */
import type { D1PreparedStatement } from '@cloudflare/workers-types';

import { AUTOMATION_HOURS, automationClock } from '../automation';
import { assert } from '../validation';

import { multiControl, SQL_UUID } from './multiControl';
import { StudioEnv } from './runtime';

// Find a local slot through IANA conversion, including Cairo's daylight saving transitions.
export const cairoSlotAt = (day: string, slot: number): number => {
  const utc = Date.parse(`${day}T${String(AUTOMATION_HOURS[slot]).padStart(2, '0')}:00:00Z`);
  const probe = automationClock(utc);
  return utc - (probe.hour - AUTOMATION_HOURS[slot]) * 3600000;
};
export const activeTaskTarget = `EXISTS(SELECT 1 FROM studio_task_destinations td JOIN studio_destinations d ON d.id=td.destination_id AND d.revision=td.revision JOIN studio_buffer_connections c ON c.id=d.connection_id WHERE td.task_id=studio_automation_tasks.id AND d.paused=0 AND d.disconnected=0 AND c.disconnected=0)`;

export const planMultiDay = async (
  env: StudioEnv,
  owner: string,
  now = Date.now(),
): Promise<void> => {
  const { day, hour } = automationClock(now);
  const control = await multiControl(env);
  assert(control?.active && !control.maintenance, 'AUTOMATION_PAUSED', 409);
  const db = env.VIDEO_STUDIO_DB;
  if (
    await db
      .prepare('SELECT day FROM studio_automation_days WHERE owner=? AND day=?')
      .bind(owner, day)
      .first()
  ) {
    return;
  }
  // All plan records commit together. Set-based inserts keep the Free-plan query count constant.
  await db.batch([
    db
      .prepare(
        'UPDATE studio_destinations SET daily_count=next_count,paused=CASE WHEN next_count>0 AND disconnected=0 THEN 0 ELSE 1 END WHERE owner=? AND effective_day<=?',
      )
      .bind(owner, day),
    db
      .prepare('UPDATE studio_multi_control SET mode=next_mode WHERE id=1 AND effective_day<=?')
      .bind(day),
    db
      .prepare(
        'INSERT OR IGNORE INTO studio_day_destinations(owner,day,destination_id,daily_count,revision) SELECT owner,?,id,CASE WHEN paused=0 AND disconnected=0 THEN daily_count ELSE 0 END,revision FROM studio_destinations WHERE owner=? AND NOT EXISTS(SELECT 1 FROM studio_automation_days WHERE owner=? AND day=?)',
      )
      .bind(day, owner, owner, day),
    db
      .prepare(
        'INSERT OR IGNORE INTO studio_automation_days(owner,day,mode,created_at) SELECT ?,?,mode,? FROM studio_multi_control WHERE id=1',
      )
      .bind(owner, day, now),
    ...dayTaskStatements(env, owner, day, hour, now),
  ]);
};

export const pauseDestinationWork = async (env: StudioEnv, id: string): Promise<void> => {
  const now = Date.now();
  await env.VIDEO_STUDIO_DB.batch([
    env.VIDEO_STUDIO_DB.prepare(
      "UPDATE studio_deliveries SET status='cancelled',error='PUBLISHING_PAUSED',updated_at=? WHERE destination_id=? AND status='queued'",
    ).bind(now, id),
    env.VIDEO_STUDIO_DB.prepare(
      `UPDATE studio_automation_tasks SET status='skipped',error='PUBLISHING_PAUSED',lease=NULL,lease_until=0,updated_at=? WHERE status IN ('queued','planning','ready') AND NOT ${activeTaskTarget}`,
    ).bind(now),
  ]);
};

export const dayTaskStatements = (
  env: StudioEnv,
  owner: string,
  day: string,
  hour: number,
  now: number,
): D1PreparedStatement[] => {
  const db = env.VIDEO_STUDIO_DB;
  const slots = [0, 1, 2].map((slot) => cairoSlotAt(day, slot));
  return [
    db
      .prepare(
        `INSERT OR IGNORE INTO studio_automation_tasks(id,owner,day,slot,stream_key,status,error,next_at,created_at,updated_at)
   SELECT ${SQL_UUID},a.owner,a.day,s.slot,CASE WHEN a.mode='shared' THEN 'shared' ELSE d.destination_id END,
    CASE WHEN ? > s.hour THEN 'skipped' ELSE 'queued' END,CASE WHEN ?>s.hour THEN 'AUTOMATION_MISSED' ELSE NULL END,
    CASE s.slot WHEN 0 THEN ? WHEN 1 THEN ? ELSE ? END,?,?
   FROM studio_automation_days a JOIN studio_day_destinations d ON d.owner=a.owner AND d.day=a.day
   CROSS JOIN (SELECT 0 AS slot,9 AS hour UNION ALL SELECT 1,14 UNION ALL SELECT 2,19) s
   WHERE a.owner=? AND a.day=? AND d.daily_count>s.slot
   GROUP BY a.owner,a.day,s.slot,CASE WHEN a.mode='shared' THEN 'shared' ELSE d.destination_id END`,
      )
      .bind(hour, hour, ...slots, now, now, owner, day),
    db
      .prepare(
        `INSERT OR IGNORE INTO studio_task_destinations(task_id,destination_id,revision)
   SELECT t.id,d.destination_id,d.revision FROM studio_automation_tasks t JOIN studio_day_destinations d ON d.owner=t.owner AND d.day=t.day
   WHERE t.owner=? AND t.day=? AND d.daily_count>t.slot AND (t.stream_key='shared' OR t.stream_key=d.destination_id)`,
      )
      .bind(owner, day),
  ];
};
