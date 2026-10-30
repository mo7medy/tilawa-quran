/* eslint-disable import/prefer-default-export -- Named bounded Cron entrypoint. */
/* eslint-disable @typescript-eslint/naming-convention -- SQLite fields. */
/* eslint-disable react-func/max-lines-per-function -- A bounded cron pass advances one durable leased phase. */
import { automationClock } from '../automation';

import { stepAutomation } from './automationStep';
import { AutomationRunRow, readAutomationSettings } from './automationStore';
import { studioFailure } from './errors';
import { activeTaskTarget, planMultiDay } from './multiSchedule';
import { StudioEnv } from './runtime';

export const maintainMultiAutomation = async (env: StudioEnv): Promise<void> => {
  const now = Date.now();
  const { day } = automationClock(now);
  const db = env.VIDEO_STUDIO_DB;
  await db.batch([
    db
      .prepare(
        "UPDATE studio_automation_tasks SET status=CASE WHEN (SELECT status FROM studio_jobs WHERE id=job_id)='completed' THEN 'completed' ELSE 'failed' END,error=(SELECT error FROM studio_jobs WHERE id=job_id),updated_at=? WHERE status='submitted' AND EXISTS(SELECT 1 FROM studio_jobs WHERE id=job_id AND status IN ('completed','failed','cancelled','expired'))",
      )
      .bind(now),
    db
      .prepare(
        "UPDATE studio_automation_tasks SET status='skipped',error='AUTOMATION_MISSED',lease=NULL,lease_until=0,updated_at=? WHERE day<? AND status IN ('queued','planning','ready')",
      )
      .bind(now, day),
    db
      .prepare(
        `UPDATE studio_automation_tasks SET status='skipped',error='PUBLISHING_PAUSED',lease=NULL,lease_until=0,updated_at=? WHERE status IN ('queued','planning','ready') AND NOT ${activeTaskTarget}`,
      )
      .bind(now),
    db
      .prepare(
        "UPDATE studio_automation_tasks SET status='failed',error='AUTOMATION_RETRIES_EXHAUSTED',lease=NULL,lease_until=0,updated_at=? WHERE status='planning' AND attempt>=3 AND lease_until<=?",
      )
      .bind(now, now),
    db.prepare('DELETE FROM studio_automation_cache WHERE expires_at<?').bind(now),
    db
      .prepare('DELETE FROM studio_automation_ai_budget WHERE day<?')
      .bind(new Date(now - 3 * 86400000).toISOString().slice(0, 10)),
    db
      .prepare('DELETE FROM studio_multi_ai_budget WHERE day<?')
      .bind(new Date(now - 3 * 86400000).toISOString().slice(0, 10)),
    db
      .prepare('DELETE FROM studio_buffer_usage WHERE day<?')
      .bind(new Date(now - 32 * 86400000).toISOString().slice(0, 10)),
    db.prepare('DELETE FROM studio_studio_audit WHERE created_at<?').bind(now - 90 * 86400000),
  ]);
  const settings = await readAutomationSettings(env);
  if (!settings?.enabled || env.STUDIO_ENABLED !== '1' || !env.AI) return;
  await planMultiDay(env, settings.owner, now);
  // One planning lease for the owner also serializes three-day passage exclusion.
  // Ready work runs first; planning never consumes another model call while a render is active.
  const row = await db
    .prepare(
      `UPDATE studio_automation_tasks SET status=CASE WHEN status='ready' THEN 'ready' ELSE 'planning' END,attempt=attempt+CASE WHEN status='ready' THEN 0 ELSE 1 END,lease=?,lease_until=?,updated_at=? WHERE id=(SELECT t.id FROM studio_automation_tasks t WHERE t.owner=? AND t.day=? AND t.status IN ('queued','planning','ready') AND t.next_at<=? AND t.lease_until<=? AND (t.status='ready' OR t.attempt<3) AND t.failures<3 AND NOT EXISTS(SELECT 1 FROM studio_automation_tasks a WHERE a.owner=t.owner AND a.lease_until>?) AND NOT EXISTS(SELECT 1 FROM studio_jobs j WHERE j.owner=t.owner AND j.status IN ('queued','preparing','rendering','uploading','cancel_requested')) ORDER BY CASE WHEN t.status='ready' THEN 0 ELSE 1 END,t.slot,t.created_at,t.stream_key LIMIT 1) AND EXISTS(SELECT 1 FROM studio_multi_control WHERE active=1 AND maintenance=0) AND EXISTS(SELECT 1 FROM studio_automation_settings WHERE enabled=1) RETURNING *`,
    )
    .bind(crypto.randomUUID(), now + 600000, now, settings.owner, day, now, now, now)
    .first<AutomationRunRow>();
  if (!row) return;
  try {
    await stepAutomation(env, row, true);
  } catch (error) {
    const { code } = studioFailure(error);
    if (code === 'OWNER_BUSY') {
      await db
        .prepare(
          'UPDATE studio_automation_tasks SET lease=NULL,lease_until=0,next_at=?,error=? WHERE id=? AND lease=?',
        )
        .bind(now + 60000, code, row.id, row.lease)
        .run();
      return;
    }
    await db
      .prepare(
        "UPDATE studio_automation_tasks SET failures=failures+1,status=CASE WHEN failures>=2 OR (attempt>=3 AND status!='ready') OR ? IN ('AUTOMATION_AI_LIMIT','AUTOMATION_PAUSED','DAILY_LIMIT','GLOBAL_LIMIT','STORAGE_LIMIT','AUTOMATION_READER_EXCLUDED') THEN 'failed' WHEN status='ready' THEN 'ready' ELSE 'queued' END,error=?,lease=NULL,lease_until=0,next_at=?,updated_at=? WHERE id=? AND lease=?",
      )
      .bind(code, code, now + 60000, now, row.id, row.lease)
      .run();
  }
};
