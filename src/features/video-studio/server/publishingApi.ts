/* eslint-disable import/prefer-default-export -- Named API entrypoint is shared by Worker and isolated tests. */
/* eslint-disable react-func/max-lines-per-function -- Owner checks and the small method dispatch share one authorization boundary. */
import { StudioOwner } from '../contracts';
import { assert, StudioError } from '../validation';

import { readAutomationSettings } from './automationStore';
import { bufferChannels } from './bufferClient';
import { checkRate } from './identity';
import { encryptPublisherToken } from './publisherCrypto';
import { publisher, publishingState } from './publishingStore';
import { json, StudioEnv } from './runtime';

export const publishingRequest = async (
  env: StudioEnv,
  req: Request,
  owner: StudioOwner,
  action: string | undefined,
  body: Record<string, unknown>,
): Promise<Response> => {
  assert(owner.registered && owner.canAutomate, 'FORBIDDEN', 403);
  const automation = await readAutomationSettings(env);
  assert(!automation || automation.owner === owner.id, 'FORBIDDEN', 403);
  const connection = await publisher(env);
  assert(!connection || connection.owner === owner.id, 'FORBIDDEN', 403);
  if (req.method === 'GET' && !action) return json(await publishingState(env, owner));
  await checkRate(env, `publisher:${owner.id}`, 5);
  if (req.method === 'POST' && ['probe', 'connect'].includes(action)) {
    assert(
      typeof body.token === 'string' && /^[\x21-\x7e]{16,2048}$/.test(body.token),
      'INVALID_INPUT',
    );
    const tokenValue = String(body.token);
    const channels = await bufferChannels(tokenValue);
    if (action === 'probe') return json({ channels });
    const channel = channels.find((item) => item.id === body.channelId && item.eligible);
    assert(channel, 'BUFFER_CHANNEL', 422);
    const now = Date.now();
    const token = await encryptPublisherToken(env.STUDIO_SIGNING_SECRET, owner.id, tokenValue);
    await env.VIDEO_STUDIO_DB.prepare(
      'INSERT INTO studio_publisher(id,owner,token,revision,organization_id,channel_id,channel_name,enabled,activated_at,updated_at) VALUES(1,?,?,?,?,?,?,0,?,?) ON CONFLICT(id) DO UPDATE SET token=excluded.token,revision=excluded.revision,organization_id=excluded.organization_id,channel_id=excluded.channel_id,channel_name=excluded.channel_name,enabled=0,activated_at=excluded.activated_at,updated_at=excluded.updated_at WHERE owner=excluded.owner',
    )
      .bind(
        owner.id,
        token,
        crypto.randomUUID(),
        channel.organizationId,
        channel.id,
        channel.name,
        now,
        now,
      )
      .run();
    return json(await publishingState(env, owner));
  }
  if (req.method === 'PUT' && !action) {
    assert(connection && typeof body.enabled === 'boolean', 'INVALID_INPUT');
    assert(
      !body.enabled || (automation?.owner === owner.id && env.STUDIO_ENABLED === '1'),
      'AUTOMATION_UNAVAILABLE',
      503,
    );
    const now = Date.now();
    await env.VIDEO_STUDIO_DB.batch([
      env.VIDEO_STUDIO_DB.prepare(
        'UPDATE studio_publisher SET enabled=?,activated_at=CASE WHEN enabled=0 AND ?=1 THEN ? ELSE activated_at END,updated_at=? WHERE owner=? AND revision=?',
      ).bind(Number(body.enabled), Number(body.enabled), now, now, owner.id, connection.revision),
      ...(!body.enabled
        ? [
            env.VIDEO_STUDIO_DB.prepare(
              "UPDATE studio_publications SET status='cancelled',updated_at=? WHERE owner=? AND status='queued'",
            ).bind(now, owner.id),
          ]
        : []),
    ]);
    return json(await publishingState(env, owner));
  }
  if (req.method === 'DELETE' && !action) {
    await env.VIDEO_STUDIO_DB.batch([
      env.VIDEO_STUDIO_DB.prepare('DELETE FROM studio_publisher WHERE owner=?').bind(owner.id),
      env.VIDEO_STUDIO_DB.prepare(
        "UPDATE studio_publications SET status=CASE WHEN status='queued' THEN 'cancelled' ELSE 'unknown' END,error='BUFFER_RECONNECT',updated_at=? WHERE owner=? AND status IN ('queued','pending')",
      ).bind(Date.now(), owner.id),
    ]);
    return json(await publishingState(env, owner));
  }
  throw new StudioError('NOT_FOUND', 404);
};
