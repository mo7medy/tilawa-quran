/* eslint-disable @typescript-eslint/naming-convention -- SQLite fields. */
/* eslint-disable react-func/max-lines-per-function -- Keep validated resource transitions together. */
/* eslint-disable import/prefer-default-export -- Named authenticated resource handler. */
import { assert, StudioError } from '../validation';

import { auditStudio, tomorrowCairo } from './multiControl';
import { pauseDestinationWork } from './multiSchedule';
import { connectionById, connectionChannels, destinationById } from './multiStore';
import { json, StudioEnv } from './runtime';

export const destinationAction = async (
  env: StudioEnv,
  req: Request,
  actor: string,
  owner: string,
  id: string | undefined,
  action: string | undefined,
  body: Record<string, unknown>,
): Promise<Response> => {
  const now = Date.now();
  const db = env.VIDEO_STUDIO_DB;
  if (req.method === 'POST' && !id) {
    const connection = await connectionById(env, owner, String(body.connectionId));
    assert(!connection.disconnected, 'BUFFER_RECONNECT', 409);
    const channel = (await connectionChannels(env, connection)).find(
      (c) => c.id === body.channelId,
    );
    assert(channel, 'BUFFER_CHANNEL', 409);
    const old = await db
      .prepare(
        'SELECT id,disconnected FROM studio_destinations WHERE owner=? AND platform=? AND channel_id=?',
      )
      .bind(owner, channel.platform, channel.id)
      .first<{ id: string; disconnected: number }>();
    assert(!old || old.disconnected, 'BUFFER_CHANNEL_DUPLICATE', 409);
    const destinationId = old?.id ?? crypto.randomUUID();
    await db
      .prepare(
        'INSERT INTO studio_destinations(id,owner,connection_id,platform,organization_id,channel_id,name,eligible,effective_day,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET connection_id=excluded.connection_id,organization_id=excluded.organization_id,name=excluded.name,eligible=excluded.eligible,disconnected=0,paused=1,daily_count=0,next_count=0,effective_day=excluded.effective_day,revision=studio_destinations.revision+1,updated_at=excluded.updated_at',
      )
      .bind(
        destinationId,
        owner,
        connection.id,
        channel.platform,
        channel.organizationId,
        channel.id,
        channel.name,
        Number(channel.eligible),
        tomorrowCairo(now),
        now,
        now,
      )
      .run();
    await auditStudio(env, actor, owner, 'destination.add', destinationId);
    return json({ id: destinationId }, 201);
  }
  const destination = await destinationById(env, owner, id);
  if (req.method === 'PUT' && !action) {
    const count = body.dailyCount;
    assert(Number.isInteger(count) && Number(count) >= 0 && Number(count) <= 3, 'INVALID_INPUT');
    assert(!destination.disconnected, 'BUFFER_RECONNECT', 409);
    const connection = await connectionById(env, owner, destination.connection_id);
    assert(!connection.disconnected, 'BUFFER_RECONNECT', 409);
    await db
      .prepare(
        'UPDATE studio_destinations SET next_count=?,effective_day=?,daily_count=CASE WHEN ?=0 THEN 0 ELSE daily_count END,paused=CASE WHEN ?=0 THEN 1 ELSE paused END,revision=revision+CASE WHEN ?=0 THEN 1 ELSE 0 END,updated_at=? WHERE id=? AND owner=?',
      )
      .bind(
        Number(count),
        tomorrowCairo(now),
        Number(count),
        Number(count),
        Number(count),
        now,
        id,
        owner,
      )
      .run();
    if (count === 0) await pauseDestinationWork(env, id);
    await auditStudio(env, actor, owner, 'destination.count', id, {
      dailyCount: Number(count),
      effectiveDay: count === 0 ? 'immediate' : tomorrowCairo(now),
    });
    return json({ ok: true });
  }
  if (req.method === 'DELETE' && !action) {
    await db
      .prepare(
        'UPDATE studio_destinations SET disconnected=1,paused=1,daily_count=0,next_count=0,revision=revision+1,updated_at=? WHERE id=? AND owner=?',
      )
      .bind(now, id, owner)
      .run();
    await pauseDestinationWork(env, id);
    await auditStudio(env, actor, owner, 'destination.disconnect', id);
    return json({ ok: true });
  }
  throw new StudioError('NOT_FOUND', 404);
};
