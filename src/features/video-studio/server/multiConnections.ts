/* eslint-disable @typescript-eslint/naming-convention -- SQLite fields. */
/* eslint-disable react-func/max-lines-per-function -- Keep validated resource transitions together. */
/* eslint-disable import/prefer-default-export -- Named authenticated resource handler. */
import { assert, StudioError } from '../validation';

import { bufferAccount, bufferChannels } from './bufferClient';
import { auditStudio } from './multiControl';
import { pauseDestinationWork } from './multiSchedule';
import {
  connectionById,
  connectionChannels,
  countBufferRequest,
  bufferCooldown,
} from './multiStore';
import { encryptPublisherToken } from './publisherCrypto';
import { json, StudioEnv } from './runtime';

const credential = (value: unknown): string => {
  assert(
    typeof value === 'string' && value.length >= 16 && value.length <= 512 && !/\s/.test(value),
    'INVALID_INPUT',
  );
  return value as string;
};
export const connectionAction = async (
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
    const token = credential(body.token);
    const capacity = await db
      .prepare(
        'SELECT COUNT(*) AS n FROM studio_buffer_connections WHERE owner=? AND disconnected=0',
      )
      .bind(owner)
      .first<{ n: number }>();
    const account = await bufferAccount(token);
    const duplicate = await db
      .prepare('SELECT id FROM studio_buffer_connections WHERE owner=? AND account_id=?')
      .bind(owner, account.id)
      .first();
    assert(!duplicate, 'BUFFER_DUPLICATE', 409);
    assert(capacity.n < 3, 'CONNECTION_LIMIT', 429);
    let calls = 1;
    const channels = await bufferChannels(token, async () => {
      calls += 1;
    });
    const connectionId = crypto.randomUUID();
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 100) : account.name;
    assert(name, 'INVALID_INPUT');
    const revision = crypto.randomUUID();
    await db.batch([
      db
        .prepare(
          'INSERT INTO studio_buffer_connections(id,owner,account_id,name,token,revision,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)',
        )
        .bind(
          connectionId,
          owner,
          account.id,
          name,
          await encryptPublisherToken(env.STUDIO_SIGNING_SECRET, owner, token),
          revision,
          now,
          now,
        ),
      db
        .prepare('INSERT INTO studio_buffer_usage(connection_id,day,calls) VALUES(?,?,?)')
        .bind(connectionId, new Date(now).toISOString().slice(0, 10), calls),
      db
        .prepare(
          'INSERT INTO studio_buffer_channels(connection_id,revision,value,expires_at) VALUES(?,?,?,?)',
        )
        .bind(connectionId, revision, JSON.stringify(channels), now + 300000),
    ]);
    await auditStudio(env, actor, owner, 'connection.add', connectionId, {
      accountId: account.id,
    });
    return json({ id: connectionId, channels }, 201);
  }
  const connection = await connectionById(env, owner, id);
  if (req.method === 'GET' && action === 'channels') {
    return json({ channels: await connectionChannels(env, connection, true) });
  }
  if (req.method === 'PUT' && !action) {
    const token = credential(body.token);
    const before = countBufferRequest(env, connection);
    let channels: Awaited<ReturnType<typeof bufferChannels>>;
    try {
      const account = await bufferAccount(token, before);
      assert(account.id === connection.account_id, 'BUFFER_IDENTITY_MISMATCH', 409);
      channels = await bufferChannels(token, before);
    } catch (error) {
      await bufferCooldown(env, connection.id, error);
      throw error;
    }
    const revision = crypto.randomUUID();
    await db.batch([
      db
        .prepare(
          'UPDATE studio_buffer_connections SET token=?,revision=?,disconnected=0,cooldown_until=0,updated_at=? WHERE id=? AND owner=?',
        )
        .bind(
          await encryptPublisherToken(env.STUDIO_SIGNING_SECRET, owner, token),
          revision,
          now,
          id,
          owner,
        ),
      db.prepare('DELETE FROM studio_buffer_channels WHERE connection_id=?').bind(id),
    ]);
    await auditStudio(env, actor, owner, 'connection.rotate', id);
    return json({ id, channels });
  }
  if (req.method === 'DELETE' && !action) {
    await db.batch([
      db
        .prepare(
          'UPDATE studio_buffer_connections SET disconnected=1,updated_at=? WHERE id=? AND owner=?',
        )
        .bind(now, id, owner),
      db
        .prepare(
          'UPDATE studio_destinations SET disconnected=1,paused=1,daily_count=0,next_count=0,revision=revision+1,updated_at=? WHERE connection_id=? AND owner=?',
        )
        .bind(now, id, owner),
      db
        .prepare(
          "UPDATE studio_deliveries SET status='cancelled',error='PUBLISHING_PAUSED',updated_at=? WHERE connection_id=? AND owner=? AND status='queued'",
        )
        .bind(now, id, owner),
    ]);
    await pauseDestinationWork(env, '');
    await auditStudio(env, actor, owner, 'connection.disconnect', id);
    return json({ ok: true });
  }
  throw new StudioError('NOT_FOUND', 404);
};
