/* eslint-disable import/prefer-default-export -- Named authenticated API handler. */
/* eslint-disable @typescript-eslint/naming-convention -- SQLite fields. */
/* eslint-disable react-func/max-lines-per-function -- Authenticated resource actions validate and audit each durable change. */
import { StudioOwner } from '../contracts';
import { assert, StudioError } from '../validation';

import { checkRate } from './identity';
import { adminState } from './multiAdminState';
import { connectionAction } from './multiConnections';
import { auditStudio, multiControl, tomorrowCairo } from './multiControl';
import { destinationAction } from './multiDestinations';
import { automationOwner } from './multiStore';
import { json, StudioEnv } from './runtime';

export const adminRequest = async (
  env: StudioEnv,
  req: Request,
  actor: StudioOwner,
  path: string[],
  body: Record<string, unknown>,
): Promise<Response> => {
  assert(actor.registered && actor.adminVerified, 'ADMIN_REQUIRED', 403);
  const owner = await automationOwner(env);
  const [resource, id, action] = path;
  const control = await multiControl(env);
  assert(control, 'AUTOMATION_UNAVAILABLE', 503);
  if (req.method === 'GET' && !resource) return json(await adminState(env, owner));
  assert(control.active && !control.maintenance, 'AUTOMATION_MIGRATING', 409);
  await checkRate(env, `studio-admin:${actor.id}`, 60);
  const now = Date.now();
  const db = env.VIDEO_STUDIO_DB;
  if (resource === 'connections') {
    return connectionAction(env, req, actor.id, owner, id, action, body);
  }
  if (resource === 'destinations') {
    return destinationAction(env, req, actor.id, owner, id, action, body);
  }
  if (resource === 'policy' && req.method === 'PUT') {
    assert(body.mode === 'independent' || body.mode === 'shared', 'INVALID_INPUT');
    await db
      .prepare(
        'UPDATE studio_multi_control SET next_mode=?,effective_day=?,updated_at=? WHERE id=1',
      )
      .bind(body.mode, tomorrowCairo(now), now)
      .run();
    await auditStudio(env, actor.id, owner, 'policy.change', 'distribution', {
      mode: String(body.mode),
      effectiveDay: tomorrowCairo(now),
    });
    return json({ ok: true });
  }
  if (resource === 'enabled' && req.method === 'PUT') {
    assert(typeof body.enabled === 'boolean', 'INVALID_INPUT');
    assert(
      !body.enabled || (!!env.AI && env.STUDIO_ENABLED === '1'),
      'AUTOMATION_UNAVAILABLE',
      503,
    );
    await db
      .prepare('UPDATE studio_automation_settings SET enabled=?,updated_at=? WHERE owner=?')
      .bind(Number(body.enabled), now, owner)
      .run();
    if (!body.enabled) {
      await db.batch([
        db
          .prepare(
            "UPDATE studio_automation_tasks SET status='skipped',error='AUTOMATION_PAUSED',lease=NULL,lease_until=0,updated_at=? WHERE owner=? AND status IN ('queued','planning','ready')",
          )
          .bind(now, owner),
        db
          .prepare(
            "UPDATE studio_deliveries SET status='cancelled',error='PUBLISHING_PAUSED',updated_at=? WHERE owner=? AND status='queued'",
          )
          .bind(now, owner),
      ]);
    }
    await auditStudio(env, actor.id, owner, 'automation.enabled', 'global', {
      enabled: body.enabled === true,
    });
    return json({ ok: true });
  }
  throw new StudioError('NOT_FOUND', 404);
};
