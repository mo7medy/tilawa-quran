/* eslint-disable no-nested-ternary, max-lines, import/prefer-default-export -- Preserve legacy identifiers in one atomic cutover. */
/* eslint-disable @typescript-eslint/naming-convention -- SQLite fields. */
/* eslint-disable no-await-in-loop, no-restricted-syntax -- At most two legacy provider connections are migrated sequentially. */
/* eslint-disable react-func/max-lines-per-function -- One transaction copies the frozen legacy outbox and switches the engine. */
import { automationClock } from '../automation';
import { assert } from '../validation';

import { readAutomationSettings } from './automationStore';
import { bufferAccount, bufferChannels } from './bufferClient';
import { studioFailure } from './errors';
import { auditStudio, tomorrowCairo } from './multiControl';
import { dayTaskStatements } from './multiSchedule';
import { encryptPublisherToken, publisherToken } from './publisherCrypto';
import { publishers } from './publishingStore';
import { StudioEnv } from './runtime';

// Explicit operator gate: maintenance=1, active=0. Ordinary deployment never activates the migration.
export const migrateMultiPublishing = async (env: StudioEnv): Promise<void> => {
  const db = env.VIDEO_STUDIO_DB;
  const now = Date.now();
  const busy = await db
    .prepare(
      "SELECT id FROM studio_automation_runs WHERE lease_until>? UNION ALL SELECT id FROM studio_publications WHERE status='sending' AND lease_until>? LIMIT 1",
    )
    .bind(now, now)
    .first();
  if (busy) return;
  const lease = crypto.randomUUID();
  const claimed = await db
    .prepare(
      "UPDATE studio_multi_control SET migration_lease=?,migration_until=?,migration_attempt=migration_attempt+1 WHERE id=1 AND active=0 AND maintenance=1 AND cutover_day='' AND migration_until<=? AND migration_attempt<3 RETURNING id",
    )
    .bind(lease, now + 300000, now)
    .first();
  if (!claimed) return;
  try {
    const settings = await readAutomationSettings(env);
    assert(settings, 'AUTOMATION_UNAVAILABLE', 409);
    const old = await publishers(env);
    assert(
      old.every((c) => c.owner === settings.owner),
      'FORBIDDEN',
      403,
    );
    const { day, hour } = automationClock(now);
    const statements = [];
    const identities = new Map<
      string,
      { id: string; token: string; revision: string; name: string }
    >();
    const mappings: {
      platform: string;
      destinationId: string;
      connectionId: string;
      count: number;
      activatedAt: number;
    }[] = [];
    for (const legacy of old) {
      const token = await publisherToken(env, legacy.owner, legacy.token);
      const account = await bufferAccount(token);
      const channels = await bufferChannels(token);
      const channel = channels.find(
        (c) =>
          c.id === legacy.channel_id &&
          c.platform === legacy.platform &&
          c.organizationId === legacy.organization_id,
      );
      assert(channel, 'BUFFER_CHANNEL', 409);
      let identity = identities.get(account.id);
      if (!identity) {
        identity = {
          id: crypto.randomUUID(),
          token: await encryptPublisherToken(env.STUDIO_SIGNING_SECRET, legacy.owner, token),
          revision: crypto.randomUUID(),
          name: account.name || 'Buffer',
        };
        identities.set(account.id, identity);
        statements.push(
          db
            .prepare(
              'INSERT INTO studio_buffer_connections(id,owner,account_id,name,token,revision,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)',
            )
            .bind(
              identity.id,
              legacy.owner,
              account.id,
              identity.name,
              identity.token,
              identity.revision,
              now,
              now,
            ),
        );
      }
      const destinationId = crypto.randomUUID();
      const count = legacy.enabled ? (settings.optional_third ? 3 : 2) : 0;
      mappings.push({
        platform: legacy.platform,
        destinationId,
        connectionId: identity.id,
        count,
        activatedAt: legacy.activated_at,
      });
      statements.push(
        db
          .prepare(
            "INSERT INTO studio_destinations(id,owner,connection_id,platform,organization_id,channel_id,name,eligible,daily_count,next_count,effective_day,paused,last_sent_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,COALESCE((SELECT MAX(CASE WHEN status='sending' THEN ? ELSE updated_at END) FROM studio_publications WHERE owner=? AND platform=? AND status IN ('sending','pending','published','review','unknown')),0),?,?)",
          )
          .bind(
            destinationId,
            legacy.owner,
            identity.id,
            legacy.platform,
            legacy.organization_id,
            legacy.channel_id,
            legacy.channel_name,
            Number(channel.eligible),
            count,
            count,
            tomorrowCairo(now),
            Number(!legacy.enabled),
            now,
            legacy.owner,
            legacy.platform,
            now,
            now,
          ),
      );
    }
    statements.push(
      db.prepare(
        "INSERT INTO studio_automation_tasks(id,owner,day,slot,stream_key,status,attempt,failures,lease,lease_until,next_at,plan,project_id,job_id,error,created_at,updated_at) SELECT id,owner,day,slot,'shared',CASE WHEN status='planning' THEN 'queued' ELSE status END,attempt,failures,NULL,0,next_at,plan,project_id,job_id,error,created_at,updated_at FROM studio_automation_runs",
      ),
      db.prepare(
        "UPDATE studio_jobs SET quota_class='automation',daily_limit=30,storage_limit=10737418240 WHERE id IN (SELECT job_id FROM studio_automation_runs)",
      ),
      db
        .prepare(
          "INSERT OR IGNORE INTO studio_automation_days(owner,day,mode,created_at) VALUES(?,?,'shared',?)",
        )
        .bind(settings.owner, day, now),
      db.prepare(
        'INSERT OR IGNORE INTO studio_multi_ai_budget(day,calls) SELECT day,calls FROM studio_automation_ai_budget',
      ),
    );
    for (const mapping of mappings) {
      statements.push(
        db
          .prepare(
            'INSERT INTO studio_day_destinations(owner,day,destination_id,daily_count,revision) VALUES(?,?,?,?,1)',
          )
          .bind(settings.owner, day, mapping.destinationId, mapping.count),
        db
          .prepare(
            'INSERT OR IGNORE INTO studio_task_destinations(task_id,destination_id,revision) SELECT id,?,1 FROM studio_automation_tasks WHERE owner=? AND (created_at>=? OR EXISTS(SELECT 1 FROM studio_publications p WHERE p.run_id=studio_automation_tasks.id AND p.platform=?))',
          )
          .bind(mapping.destinationId, settings.owner, mapping.activatedAt, mapping.platform),
        db
          .prepare(
            "INSERT INTO studio_deliveries(id,run_id,destination_id,owner,platform,job_id,connection_id,connection_revision,channel_id,organization_id,text,status,post_id,external_url,error,lease,lease_until,attempts,next_at,media_until,created_at,updated_at) SELECT id,run_id,?,owner,platform,job_id,?,connection_revision,channel_id,organization_id,text,CASE WHEN status='sending' THEN 'unknown' ELSE status END,post_id,external_url,CASE WHEN status='sending' THEN 'BUFFER_UNCERTAIN' ELSE error END,NULL,0,attempts,next_at,media_until,created_at,updated_at FROM studio_publications WHERE owner=? AND platform=?",
          )
          .bind(mapping.destinationId, mapping.connectionId, settings.owner, mapping.platform),
      );
    }
    statements.push(...dayTaskStatements(env, settings.owner, day, hour, now));
    statements.push(
      db
        .prepare(
          "UPDATE studio_multi_control SET active=1,maintenance=0,mode='shared',next_mode='independent',effective_day=?,cutover_day=?,migration_error=NULL,migration_lease=NULL,migration_until=0,updated_at=? WHERE id=1 AND migration_lease=? AND migration_until>?",
        )
        .bind(tomorrowCairo(now), day, now, lease, Date.now()),
    );
    // A stale operator lease cannot copy rows and silently fail to switch the engine.
    const current = await db
      .prepare(
        'SELECT id FROM studio_multi_control WHERE migration_lease=? AND migration_until>? AND active=0',
      )
      .bind(lease, Date.now() + 10000)
      .first();
    assert(current, 'LEASE_UNAVAILABLE', 409);
    await db.batch(statements);
    await auditStudio(env, 'system:migration', settings.owner, 'migration.complete', 'multi', {
      connections: identities.size,
      destinations: mappings.length,
      cutoverDay: day,
    });
  } catch (error) {
    await db
      .prepare(
        'UPDATE studio_multi_control SET migration_error=?,migration_lease=NULL,migration_until=? WHERE id=1 AND migration_lease=? AND active=0',
      )
      .bind(studioFailure(error).code, now + 900000, lease)
      .run();
    throw error;
  }
};
