/* eslint-disable import/prefer-default-export -- Named workflow entrypoints keep server imports explicit. */
/* eslint-disable @typescript-eslint/naming-convention -- SQLite wire names. */
/* eslint-disable react-func/max-lines-per-function -- One atomic slot reservation keeps schedule and interval rules together. */
import { AUTOMATION_GAP_MS, automationClock, dueAutomationSlot } from '../automation';
import { assert } from '../validation';

import { AutomationSettingsRow } from './automationStore';
import { StudioEnv } from './runtime';

/**
 * One durable identity per Cairo date/slot, including concurrent cron and manual dispatch.
 * @returns {Promise<string | null>} reserved slot identifier, or null outside the schedule
 */
export const enqueueAutomation = async (
  env: StudioEnv,
  settings: AutomationSettingsRow,
  now: number,
  manual = false,
): Promise<string | null> => {
  if (!settings.enabled || now < settings.activated_at) return null;
  const { day } = automationClock(now);
  const rows = await env.VIDEO_STUDIO_DB.prepare(
    'SELECT slot FROM studio_automation_runs WHERE day=?',
  )
    .bind(day)
    .all<{ slot: number }>();
  const occupied = rows.results.map((r) => r.slot);
  const count = settings.optional_third ? 3 : 2;
  const slot = manual
    ? Array.from({ length: count }, (_, i) => i).find((i) => !occupied.includes(i)) ?? -1
    : dueAutomationSlot(now);
  if (slot < 0 || slot >= count || occupied.includes(slot)) {
    assert(!manual, 'AUTOMATION_NO_SLOT', 409);
    return null;
  }
  const id = crypto.randomUUID();
  const created = await env.VIDEO_STUDIO_DB.prepare(
    'INSERT INTO studio_automation_runs(id,owner,day,slot,created_at,updated_at) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM studio_automation_settings WHERE id=1 AND owner=? AND enabled=1) AND NOT EXISTS(SELECT 1 FROM studio_automation_runs WHERE owner=? AND created_at>?) ON CONFLICT(day,slot) DO NOTHING RETURNING id',
  )
    .bind(
      id,
      settings.owner,
      day,
      slot,
      now,
      now,
      settings.owner,
      settings.owner,
      now - AUTOMATION_GAP_MS,
    )
    .first<{ id: string }>();
  assert(!manual || created, 'AUTOMATION_INTERVAL', 409);
  return created?.id ?? null;
};
