/* eslint-disable no-nested-ternary, max-lines, import/prefer-default-export -- One bounded credential-free report maps effective destination states. */
/* eslint-disable @typescript-eslint/naming-convention -- SQLite fields. */
/* eslint-disable react-func/max-lines-per-function -- Return one bounded, credential-free administration snapshot. */
import { AUTOMATION_GAP_MS, automationClock } from '../automation';
import { StudioAdminState } from '../multiPublishing';
import { assert } from '../validation';

import { AutomationRunRow, automationRun, readAutomationSettings } from './automationStore';
import { multiControl, tomorrowCairo } from './multiControl';
import { DeliveryRow } from './multiQueue';
import { cairoSlotAt } from './multiSchedule';
import { ConnectionRow, DestinationRow } from './multiStore';
import { StudioEnv } from './runtime';

interface DestinationStats extends DestinationRow {
  required: number;
  generated: number;
  pending: number;
  published: number;
  failed: number;
  next_at: number | null;
}
export const adminState = async (env: StudioEnv, owner: string): Promise<StudioAdminState> => {
  const now = Date.now();
  const { day } = automationClock(now);
  const control = await multiControl(env);
  assert(control, 'AUTOMATION_UNAVAILABLE', 503);
  const db = env.VIDEO_STUDIO_DB;
  const [settings, connections, destinations, runs, publications, usage, ai, audit] =
    await Promise.all([
      readAutomationSettings(env),
      db
        .prepare(
          'SELECT c.id,c.name,c.account_id,c.disconnected,c.cooldown_until,COALESCE(u.calls,0) AS calls FROM studio_buffer_connections c LEFT JOIN studio_buffer_usage u ON u.connection_id=c.id AND u.day=? WHERE c.owner=? ORDER BY c.created_at',
        )
        .bind(new Date(now).toISOString().slice(0, 10), owner)
        .all<
          Pick<ConnectionRow, 'id' | 'name' | 'account_id' | 'disconnected' | 'cooldown_until'> & {
            calls: number;
          }
        >(),
      db
        .prepare(
          `SELECT d.*,COALESCE((SELECT daily_count FROM studio_day_destinations WHERE owner=d.owner AND destination_id=d.id AND day=?),0) AS required,
      (SELECT COUNT(*) FROM studio_task_destinations td JOIN studio_automation_tasks t ON t.id=td.task_id JOIN studio_jobs j ON j.id=t.job_id WHERE td.destination_id=d.id AND t.day=? AND j.status='completed') AS generated,
      (SELECT COUNT(*) FROM studio_deliveries p JOIN studio_automation_tasks t ON t.id=p.run_id WHERE p.destination_id=d.id AND t.day=? AND p.status IN ('queued','sending','pending')) AS pending,
      (SELECT COUNT(*) FROM studio_deliveries p JOIN studio_automation_tasks t ON t.id=p.run_id WHERE p.destination_id=d.id AND t.day=? AND p.status='published') AS published,
      (SELECT COUNT(*) FROM studio_task_destinations td JOIN studio_automation_tasks t ON t.id=td.task_id WHERE td.destination_id=d.id AND t.day=? AND (t.status='failed' OR EXISTS(SELECT 1 FROM studio_deliveries p WHERE p.run_id=t.id AND p.destination_id=d.id AND p.status IN ('failed','unknown','review')))) AS failed,
      (SELECT MIN(t.next_at) FROM studio_task_destinations td JOIN studio_automation_tasks t ON t.id=td.task_id WHERE td.destination_id=d.id AND td.revision=d.revision AND t.day=? AND t.status IN ('queued','planning','ready','submitted')) AS next_at
      FROM studio_destinations d WHERE d.owner=? ORDER BY d.created_at`,
        )
        .bind(day, day, day, day, day, day, owner)
        .all<DestinationStats>(),
      db
        .prepare(
          'SELECT t.*, (SELECT GROUP_CONCAT(destination_id) FROM studio_task_destinations WHERE task_id=t.id) AS targets FROM studio_automation_tasks t WHERE owner=? ORDER BY created_at DESC,slot DESC LIMIT 120',
        )
        .bind(owner)
        .all<AutomationRunRow & { targets: string | null }>(),
      db
        .prepare(
          'SELECT id,run_id,destination_id,platform,text,status,error,external_url FROM studio_deliveries WHERE owner=? ORDER BY created_at DESC LIMIT 180',
        )
        .bind(owner)
        .all<DeliveryRow>(),
      db
        .prepare(
          "SELECT (SELECT COUNT(*) FROM studio_jobs WHERE owner=? AND quota_class='automation' AND day=? AND (charged=1 OR status IN ('queued','preparing','rendering','uploading','completed','cancel_requested'))) AS renders,COALESCE((SELECT SUM(CASE WHEN status IN ('queued','preparing','rendering','uploading','cancel_requested') THEN output_reserved ELSE output_size END) FROM studio_jobs WHERE owner=? AND quota_class='automation' AND expires_at>?),0) AS bytes",
        )
        .bind(owner, day, owner, now)
        .first<{ renders: number; bytes: number }>(),
      db
        .prepare('SELECT calls FROM studio_multi_ai_budget WHERE day=?')
        .bind(new Date(now).toISOString().slice(0, 10))
        .first<{ calls: number }>(),
      db
        .prepare(
          'SELECT id,actor,action,subject,detail,created_at FROM studio_studio_audit WHERE owner=? ORDER BY created_at DESC LIMIT 100',
        )
        .bind(owner)
        .all<{
          id: string;
          actor: string;
          action: string;
          subject: string;
          detail: string;
          created_at: number;
        }>(),
    ]);
  return {
    active: !!control.active,
    maintenance: !!control.maintenance,
    enabled: !!settings?.enabled,
    day,
    mode: control.mode,
    nextMode: control.next_mode,
    effectiveDay: control.effective_day,
    connections: connections.results.map((c) => ({
      id: c.id,
      name: c.name,
      accountId: c.account_id,
      disconnected: !!c.disconnected,
      cooldownUntil: c.cooldown_until,
      callsToday: c.calls,
    })),
    destinations: destinations.results.map((d) => ({
      id: d.id,
      connectionId: d.connection_id,
      channelId: d.channel_id,
      platform: d.platform,
      name: d.name,
      eligible: !!d.eligible,
      paused: !!d.paused,
      disconnected: !!d.disconnected,
      dailyCount: d.daily_count,
      nextCount: d.next_count,
      effectiveDay: d.effective_day,
      nextAt: d.disconnected
        ? null
        : d.paused
        ? d.next_count > 0
          ? cairoSlotAt(d.effective_day, 0)
          : null
        : d.next_at
        ? Math.max(d.next_at, now, d.last_sent_at + AUTOMATION_GAP_MS)
        : d.next_count > 0
        ? cairoSlotAt(tomorrowCairo(now), 0)
        : null,
      required: d.required,
      generated: d.generated,
      pending: d.pending,
      published: d.published,
      failed: d.failed,
    })),
    runs: runs.results.map((r) => ({
      ...automationRun(r),
      destinationIds: r.targets?.split(',') ?? [],
    })),
    publications: publications.results.map((p) => ({
      id: p.id,
      runId: p.run_id,
      destinationId: p.destination_id,
      platform: p.platform,
      caption: p.text.split('\n')[0],
      status: p.status,
      error: p.error,
      externalUrl: p.external_url,
    })),
    usage: {
      renders: usage.renders,
      renderLimit: 30,
      storageBytes: usage.bytes,
      storageLimit: 10 * 1073741824,
      aiCalls: ai?.calls ?? 0,
      aiLimit: 60,
    },
    audit: audit.results.map((a) => ({
      id: a.id,
      actor: a.actor,
      action: a.action,
      subject: a.subject,
      detail: a.detail,
      createdAt: a.created_at,
    })),
  };
};
