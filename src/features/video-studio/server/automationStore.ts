/* eslint-disable react-func/max-lines-per-function -- Legacy-compatible reads and emergency pause transitions share the owner boundary. */
/* eslint-disable @typescript-eslint/naming-convention -- SQLite column names are a persistent wire contract. */
import { AutomationPlan, AutomationRun, AutomationSettings, AutomationState } from '../automation';
import { StudioOwner } from '../contracts';
import { assert } from '../validation';

import { multiControl, auditStudio } from './multiControl';
import { StudioEnv } from './runtime';

export interface AutomationSettingsRow {
  owner: string;
  enabled: number;
  optional_third: number;
  activated_at: number;
}
export interface AutomationRunRow {
  id: string;
  owner: string;
  day: string;
  slot: number;
  status: AutomationRun['status'];
  attempt: number;
  lease: string | null;
  lease_until: number;
  plan: string | null;
  project_id: string | null;
  job_id: string | null;
  error: string | null;
  created_at: number;
}
export const automationSettings = (row: AutomationSettingsRow): AutomationSettings => ({
  owner: row.owner,
  enabled: !!row.enabled,
  optionalThird: !!row.optional_third,
  activatedAt: row.activated_at,
});
export const automationRun = (row: AutomationRunRow): AutomationRun => ({
  id: row.id,
  day: row.day,
  slot: row.slot,
  status: row.status,
  attempt: row.attempt,
  error: row.error,
  plan: row.plan ? (JSON.parse(row.plan) as AutomationPlan) : null,
  projectId: row.project_id,
  jobId: row.job_id,
  createdAt: row.created_at,
});
export const readAutomationSettings = (env: StudioEnv): Promise<AutomationSettingsRow | null> =>
  env.VIDEO_STUDIO_DB.prepare(
    'SELECT * FROM studio_automation_settings WHERE id=1',
  ).first<AutomationSettingsRow>();

export const readAutomation = async (
  env: StudioEnv,
  owner: StudioOwner,
): Promise<AutomationState> => {
  const settings = await readAutomationSettings(env);
  assert(!settings || settings.owner === owner.id, 'FORBIDDEN', 403);
  const control = await multiControl(env);
  const multi = !!control?.active;
  const destinations = multi
    ? await env.VIDEO_STUDIO_DB.prepare(
        'SELECT id,name,daily_count,next_count,paused FROM studio_destinations WHERE owner=? AND disconnected=0',
      )
        .bind(owner.id)
        .all<{
          id: string;
          name: string;
          daily_count: number;
          next_count: number;
          paused: number;
        }>()
    : null;
  const [rows, budget] = await Promise.all([
    env.VIDEO_STUDIO_DB.prepare(
      `SELECT * FROM ${
        multi ? 'studio_automation_tasks' : 'studio_automation_runs'
      } WHERE owner=? ORDER BY created_at DESC LIMIT 120`,
    )
      .bind(owner.id)
      .all<AutomationRunRow>(),
    env.VIDEO_STUDIO_DB.prepare(
      `SELECT calls FROM ${
        multi ? 'studio_multi_ai_budget' : 'studio_automation_ai_budget'
      } WHERE day=?`,
    )
      .bind(new Date().toISOString().slice(0, 10))
      .first<{ calls: number }>(),
  ]);
  return {
    configured: !!env.AI && env.STUDIO_ENABLED === '1',
    settings: settings ? automationSettings(settings) : null,
    runs: rows.results.map(automationRun),
    aiCallsToday: budget?.calls ?? 0,
    ...(multi
      ? {
          managed: {
            mode: control.mode,
            destinations: destinations.results.map((d) => ({
              id: d.id,
              name: d.name,
              dailyCount: d.daily_count,
              nextCount: d.next_count,
              paused: !!d.paused,
            })),
          },
        }
      : {}),
  };
};
export const configureAutomation = async (
  env: StudioEnv,
  owner: StudioOwner,
  enabled: unknown,
  optionalThird: unknown,
): Promise<void> => {
  assert(typeof enabled === 'boolean' && typeof optionalThird === 'boolean', 'INVALID_INPUT');
  const control = await multiControl(env);
  if (control?.active) {
    const settings = await readAutomationSettings(env);
    assert(settings?.owner === owner.id, 'FORBIDDEN', 403);
    assert(enabled === false, 'PUBLISHING_REFRESH_REQUIRED', 409);
    await env.VIDEO_STUDIO_DB.batch([
      env.VIDEO_STUDIO_DB.prepare(
        'UPDATE studio_automation_settings SET enabled=0,updated_at=? WHERE owner=?',
      ).bind(Date.now(), owner.id),
      env.VIDEO_STUDIO_DB.prepare(
        "UPDATE studio_automation_tasks SET status='skipped',error='AUTOMATION_PAUSED',lease=NULL,lease_until=0 WHERE owner=? AND status IN ('queued','planning','ready')",
      ).bind(owner.id),
      env.VIDEO_STUDIO_DB.prepare(
        "UPDATE studio_deliveries SET status='cancelled',error='PUBLISHING_PAUSED' WHERE owner=? AND status='queued'",
      ).bind(owner.id),
    ]);
    await auditStudio(env, owner.id, owner.id, 'automation.emergency-stop', 'global');
    return;
  }

  assert(!enabled || (!!env.AI && env.STUDIO_ENABLED === '1'), 'AUTOMATION_UNAVAILABLE', 503);
  const now = Date.now();
  const changed = await env.VIDEO_STUDIO_DB.prepare(
    'INSERT INTO studio_automation_settings(id,owner,enabled,optional_third,updated_at,activated_at) VALUES(1,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET enabled=excluded.enabled,optional_third=excluded.optional_third,updated_at=excluded.updated_at,activated_at=CASE WHEN studio_automation_settings.enabled=0 AND excluded.enabled=1 THEN excluded.activated_at ELSE studio_automation_settings.activated_at END WHERE owner=excluded.owner RETURNING owner',
  )
    .bind(owner.id, Number(enabled), Number(optionalThird), now, now)
    .first();
  assert(changed, 'FORBIDDEN', 403);
  if (!enabled) {
    // In-flight renders remain in the normal library and can be cancelled there.
    await env.VIDEO_STUDIO_DB.prepare(
      "UPDATE studio_automation_runs SET status='skipped',error='AUTOMATION_PAUSED',lease=NULL,lease_until=0,updated_at=? WHERE owner=? AND status IN ('queued','planning','ready')",
    )
      .bind(now, owner.id)
      .run();
  }
};
