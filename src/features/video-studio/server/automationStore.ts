/* eslint-disable @typescript-eslint/naming-convention -- SQLite column names are a persistent wire contract. */
import { AutomationPlan, AutomationRun, AutomationSettings, AutomationState } from '../automation';
import { StudioOwner } from '../contracts';
import { assert } from '../validation';

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
  const [rows, budget] = await Promise.all([
    env.VIDEO_STUDIO_DB.prepare(
      'SELECT * FROM studio_automation_runs WHERE owner=? ORDER BY created_at DESC LIMIT 60',
    )
      .bind(owner.id)
      .all<AutomationRunRow>(),
    env.VIDEO_STUDIO_DB.prepare('SELECT calls FROM studio_automation_ai_budget WHERE day=?')
      .bind(new Date().toISOString().slice(0, 10))
      .first<{ calls: number }>(),
  ]);
  return {
    configured: !!env.AI && env.STUDIO_ENABLED === '1',
    settings: settings ? automationSettings(settings) : null,
    runs: rows.results.map(automationRun),
    aiCallsToday: budget?.calls ?? 0,
  };
};
export const configureAutomation = async (
  env: StudioEnv,
  owner: StudioOwner,
  enabled: unknown,
  optionalThird: unknown,
): Promise<void> => {
  assert(typeof enabled === 'boolean' && typeof optionalThird === 'boolean', 'INVALID_INPUT');
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
