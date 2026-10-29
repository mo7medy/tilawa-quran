/* eslint-disable no-nested-ternary, max-lines -- Keep legacy-compatible and multi-account lease guards at the same export boundary. */
/* eslint-disable import/prefer-default-export -- Named workflow entrypoints keep server imports explicit. */
/* eslint-disable @typescript-eslint/naming-convention -- SQLite columns. */
/* eslint-disable react-func/max-lines-per-function -- Lease-checked phase transitions keep model decisions and quota reservation durable. */
import { AUTOMATION_GAP_MS, AutomationPlan, automationClock } from '../automation';
import { StudioCatalog, StudioOwner } from '../contracts';
import { assert, policy } from '../validation';

import { automationCandidates, cachedAutomationContent } from './automationCandidates';
import { chooseAutomationPlan } from './automationModel';
import { AutomationRunRow, readAutomationSettings } from './automationStore';
import { backgroundCatalog } from './backgroundLibrary';
import { resolveManifest } from './content';
import { catalog } from './contentSources';
import { createJob, manifestHash } from './jobs';
import { multiControl } from './multiControl';
import { activeTaskTarget } from './multiSchedule';
import { StudioEnv } from './runtime';

export const stepAutomation = async (
  env: StudioEnv,
  row: AutomationRunRow,
  multi = false,
): Promise<void> => {
  const owner: StudioOwner = { id: row.owner, registered: true, network: 'automation' };
  const now = Date.now();
  const table = multi ? 'studio_automation_tasks' : 'studio_automation_runs';
  const migrated = !!(await multiControl(env));
  const extraGuard = multi
    ? ` AND EXISTS(SELECT 1 FROM studio_multi_control WHERE active=1 AND maintenance=0) AND ${activeTaskTarget.replaceAll(
        'studio_automation_tasks.id',
        'r.id',
      )}`
    : migrated
    ? ` AND NOT EXISTS(SELECT 1 FROM studio_multi_control WHERE maintenance=1 OR active=1 OR cutover_day!='')`
    : '';
  if (row.status !== 'ready') {
    const recent = await env.VIDEO_STUDIO_DB.prepare(
      `SELECT plan,created_at FROM ${table} WHERE owner=? AND status IN ('planning','ready','completed','submitted') AND plan IS NOT NULL ORDER BY created_at DESC LIMIT ${
        multi ? 120 : 42
      }`,
    )
      .bind(row.owner)
      .all<{ plan: string; created_at: number }>();
    const history = recent.results.map((r) => ({
      ...r,
      spec: (JSON.parse(r.plan) as AutomationPlan).spec,
    }));
    const used = history.filter((r) => r.created_at > now - 3 * 86400000).map((r) => r.spec);
    const cached = await cachedAutomationContent<StudioCatalog>(env, 'catalog:ar', () =>
      catalog(env, 'ar'),
    );
    // Backgrounds are cheap, versioned R2 metadata; new imports must not wait on the daily content cache.
    const source = { ...cached, backgrounds: await backgroundCatalog(env) };
    // Retry rotations expand reader/passage coverage while preserving a bounded request budget.
    const seed =
      Math.floor(Date.parse(`${row.day}T00:00:00Z`) / 86400000) * 12 +
      row.slot * 4 +
      (row.attempt - 1) * 7 +
      (multi ? Array.from(row.id).reduce((sum, c) => sum + c.charCodeAt(0), 0) * 13 : 0);
    const candidates = await automationCandidates(env, source, seed, used, multi);
    const plan = await chooseAutomationPlan(
      env,
      candidates,
      source,
      !multi && row.slot === 2,
      multi ? await previousMultiBackground(env, row) : history[0]?.spec.background.value,
      multi,
    );
    if (!plan) {
      await env.VIDEO_STUDIO_DB.prepare(
        `UPDATE ${table} SET status='skipped',error='OPTIONAL_SKIPPED',lease=NULL,lease_until=0,updated_at=? WHERE id=? AND lease=?`,
      )
        .bind(now, row.id, row.lease)
        .run();
      return;
    }
    const verified = await resolveManifest(env, owner, plan.spec);
    assert(
      verified.durationMs >= 30000 &&
        verified.durationMs <= 70000 &&
        Math.abs(verified.durationMs - plan.durationMs) <= 1000 / 30,
      'AUTOMATION_DURATION_CHANGED',
      409,
    );
    const projectId = row.id;
    const guard = `EXISTS(SELECT 1 FROM ${table} r JOIN studio_automation_settings s ON s.owner=r.owner WHERE r.id=? AND r.lease=? AND r.status='planning' AND s.enabled=1${extraGuard})`;
    await env.VIDEO_STUDIO_DB.batch([
      env.VIDEO_STUDIO_DB.prepare(
        `INSERT INTO studio_projects(id,owner,registered,spec,updated_at,expires_at) SELECT ?,?,1,?,?,? WHERE ${guard} ON CONFLICT(id) DO NOTHING`,
      ).bind(
        projectId,
        row.owner,
        JSON.stringify(plan.spec),
        now,
        now + policy(true).projectMs,
        row.id,
        row.lease,
      ),
      env.VIDEO_STUDIO_DB.prepare(
        `UPDATE ${table} SET status='ready',plan=?,project_id=?,lease=NULL,lease_until=0,error=NULL,updated_at=? WHERE id=? AND lease=? AND ${guard}`,
      ).bind(JSON.stringify(plan), projectId, now, row.id, row.lease, row.id, row.lease),
    ]);
    return;
  }
  // Reconcile a request lost after job insertion rather than creating a second export.
  const existing = await env.VIDEO_STUDIO_DB.prepare(
    'SELECT id FROM studio_jobs WHERE owner=? AND idempotency=?',
  )
    .bind(owner.id, row.id)
    .first<{ id: string }>();
  let jobId = existing?.id;
  if (!jobId) {
    const previous = multi
      ? null
      : await env.VIDEO_STUDIO_DB.prepare(
          'SELECT j.id FROM studio_jobs j JOIN studio_automation_runs r ON r.job_id=j.id WHERE r.owner=? AND j.created_at>? LIMIT 1',
        )
          .bind(owner.id, Date.now() - AUTOMATION_GAP_MS)
          .first();
    assert(!previous, 'AUTOMATION_INTERVAL', 409);
    const settings = await readAutomationSettings(env);
    assert(
      settings?.enabled &&
        settings.owner === row.owner &&
        automationClock(Date.now()).day === row.day,
      'AUTOMATION_PAUSED',
      409,
    );
    const plan = JSON.parse(row.plan) as AutomationPlan;
    const manifest = await resolveManifest(env, owner, plan.spec);
    assert(
      manifest.durationMs >= 30000 &&
        manifest.durationMs <= 70000 &&
        Math.abs(manifest.durationMs - plan.durationMs) <= 1000 / 30,
      'AUTOMATION_DURATION_CHANGED',
      409,
    );
    const job = await createJob(env, owner, row.project_id, row.id, await manifestHash(manifest), {
      id: row.id,
      lease: row.lease,
      multi,
    });
    jobId = job.id;
  }
  await env.VIDEO_STUDIO_DB.prepare(
    `UPDATE ${table} SET status='submitted',job_id=?,lease=NULL,lease_until=0,error=NULL,updated_at=? WHERE id=? AND lease=? AND status='ready'`,
  )
    .bind(jobId, Date.now(), row.id, row.lease)
    .run();
};

const previousMultiBackground = async (
  env: StudioEnv,
  row: AutomationRunRow,
): Promise<string[]> => {
  const previous = await env.VIDEO_STUDIO_DB.prepare(
    'SELECT (SELECT t.plan FROM studio_automation_tasks t JOIN studio_task_destinations td ON td.task_id=t.id WHERE t.plan IS NOT NULL AND t.id!=? AND td.destination_id=current.destination_id ORDER BY t.created_at DESC LIMIT 1) AS plan FROM studio_task_destinations current WHERE current.task_id=?',
  )
    .bind(row.id, row.id)
    .all<{ plan: string | null }>();
  return previous.results
    .filter((p) => p.plan)
    .map((p) => (JSON.parse(p.plan) as AutomationPlan).spec.background.value);
};
