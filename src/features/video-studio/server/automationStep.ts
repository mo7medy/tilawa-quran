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
import { StudioEnv } from './runtime';

export const stepAutomation = async (env: StudioEnv, row: AutomationRunRow): Promise<void> => {
  const owner: StudioOwner = { id: row.owner, registered: true, network: 'automation' };
  const now = Date.now();
  if (row.status !== 'ready') {
    const recent = await env.VIDEO_STUDIO_DB.prepare(
      "SELECT plan,created_at FROM studio_automation_runs WHERE owner=? AND status IN ('completed','submitted') AND plan IS NOT NULL ORDER BY created_at DESC LIMIT 42",
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
      (row.attempt - 1) * 7;
    const candidates = await automationCandidates(env, source, seed, used);
    const plan = await chooseAutomationPlan(
      env,
      candidates,
      source,
      row.slot === 2,
      history[0]?.spec.background.value,
    );
    if (!plan) {
      await env.VIDEO_STUDIO_DB.prepare(
        "UPDATE studio_automation_runs SET status='skipped',error='OPTIONAL_SKIPPED',lease=NULL,lease_until=0,updated_at=? WHERE id=? AND lease=?",
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
    const guard =
      "EXISTS(SELECT 1 FROM studio_automation_runs r JOIN studio_automation_settings s ON s.owner=r.owner WHERE r.id=? AND r.lease=? AND r.status='planning' AND s.enabled=1)";
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
        `UPDATE studio_automation_runs SET status='ready',plan=?,project_id=?,lease=NULL,lease_until=0,error=NULL,updated_at=? WHERE id=? AND lease=? AND ${guard}`,
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
    const previous = await env.VIDEO_STUDIO_DB.prepare(
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
    });
    jobId = job.id;
  }
  await env.VIDEO_STUDIO_DB.prepare(
    "UPDATE studio_automation_runs SET status='submitted',job_id=?,lease=NULL,lease_until=0,error=NULL,updated_at=? WHERE id=? AND lease=? AND status='ready'",
  )
    .bind(jobId, Date.now(), row.id, row.lease)
    .run();
};
