/* eslint-disable import/prefer-default-export -- Named workflow entrypoints keep server imports explicit. */
/* eslint-disable @typescript-eslint/naming-convention -- SQLite columns. */
/* eslint-disable react-func/max-lines-per-function -- One bounded cron pass reconciles output, reserves a slot, and advances one leased phase. */
import { automationClock } from '../automation';

import { enqueueAutomation } from './automationSchedule';
import { stepAutomation } from './automationStep';
import { AutomationRunRow, readAutomationSettings } from './automationStore';
import { studioFailure } from './errors';
import { maintainMultiAutomation } from './multiAutomation';
import { multiControl, legacySqlGuard } from './multiControl';
import { migrateMultiPublishing } from './multiMigration';
import { StudioEnv } from './runtime';

export const maintainAutomation = async (env: StudioEnv): Promise<void> => {
  if (!env.VIDEO_STUDIO_DB || !env.STUDIO_AUTOMATION_EMAIL_HASH) return;
  const control = await multiControl(env);
  if (control?.maintenance) {
    if (!control.active && !control.cutover_day) await migrateMultiPublishing(env);
    return;
  }
  if (control?.cutover_day && !control.active) return;
  if (control?.active) {
    await maintainMultiAutomation(env);
    return;
  }
  const now = Date.now();
  const db = env.VIDEO_STUDIO_DB;
  const { day } = automationClock(now);
  await db.batch([
    db
      .prepare(
        "UPDATE studio_automation_runs SET status=CASE WHEN (SELECT status FROM studio_jobs WHERE id=job_id)='completed' THEN 'completed' ELSE 'failed' END,error=(SELECT error FROM studio_jobs WHERE id=job_id),updated_at=? WHERE status='submitted' AND EXISTS(SELECT 1 FROM studio_jobs WHERE id=job_id AND status IN ('completed','failed','cancelled','expired'))",
      )
      .bind(now),
    db
      .prepare(
        "UPDATE studio_automation_runs SET status='failed',error='AUTOMATION_MISSED',lease=NULL,lease_until=0,updated_at=? WHERE day<? AND status IN ('queued','planning','ready')",
      )
      .bind(now, day),
    db
      .prepare(
        "UPDATE studio_automation_runs SET status='failed',error='AUTOMATION_RETRIES_EXHAUSTED',lease=NULL,lease_until=0,updated_at=? WHERE status='planning' AND attempt>=3 AND lease_until<=?",
      )
      .bind(now, now),
    db.prepare('DELETE FROM studio_automation_runs WHERE created_at<?').bind(now - 30 * 86400000),
    db.prepare('DELETE FROM studio_automation_cache WHERE expires_at<?').bind(now),
    db
      .prepare('DELETE FROM studio_automation_ai_budget WHERE day<?')
      .bind(new Date(now - 3 * 86400000).toISOString().slice(0, 10)),
  ]);
  const settings = await readAutomationSettings(env);
  if (!settings?.enabled || env.STUDIO_ENABLED !== '1' || !env.AI) return;
  await enqueueAutomation(env, settings, now);
  const pending = await db
    .prepare(
      "SELECT * FROM studio_automation_runs WHERE owner=? AND day=? AND status IN ('queued','planning','ready') AND next_at<=? AND lease_until<=? AND (status='ready' OR attempt<3) AND failures<3 ORDER BY created_at LIMIT 1",
    )
    .bind(settings.owner, day, now, now)
    .first<AutomationRunRow>();
  if (!pending) return;
  const lease = crypto.randomUUID();
  const guard = await legacySqlGuard(env);
  const claimed = await db
    .prepare(
      `UPDATE studio_automation_runs SET status=CASE WHEN status='ready' THEN 'ready' ELSE 'planning' END,attempt=attempt+CASE WHEN status='ready' THEN 0 ELSE 1 END,lease=?,lease_until=?,updated_at=? WHERE id=? AND lease_until<=? AND EXISTS(SELECT 1 FROM studio_automation_settings WHERE owner=? AND enabled=1)${guard} RETURNING *`,
    )
    .bind(lease, now + 600000, now, pending.id, now, settings.owner)
    .first<AutomationRunRow>();
  if (!claimed) return;
  try {
    await stepAutomation(env, claimed);
  } catch (error) {
    const { code } = studioFailure(error);
    if (['OWNER_BUSY', 'AUTOMATION_INTERVAL'].includes(code)) {
      await db
        .prepare(
          'UPDATE studio_automation_runs SET error=?,lease=NULL,lease_until=0,next_at=?,updated_at=? WHERE id=? AND lease=?',
        )
        .bind(code, now + 60000, now, claimed.id, lease)
        .run();
      return;
    }
    // Bounded retries; selected projects are immutable. Normal render jobs retain their own retry policy.
    await db
      .prepare(
        "UPDATE studio_automation_runs SET failures=failures+1,status=CASE WHEN failures>=2 OR (attempt>=3 AND status!='ready') OR ? IN ('AUTOMATION_AI_LIMIT','AUTOMATION_PAUSED','DAILY_LIMIT','GLOBAL_LIMIT','STORAGE_LIMIT','AUTOMATION_READER_EXCLUDED') THEN 'failed' WHEN status='ready' THEN 'ready' ELSE 'queued' END,error=?,lease=NULL,lease_until=0,next_at=?,updated_at=? WHERE id=? AND lease=?",
      )
      .bind(code, code, now + 60000, now, claimed.id, lease)
      .run();
  }
};
