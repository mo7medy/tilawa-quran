/* eslint-disable import/prefer-default-export -- Named API entrypoint is shared by Worker and isolated tests. */
/* eslint-disable react-func/max-lines-per-function -- Owner checks and the small method dispatch share one authorization boundary. */
import { StudioOwner } from '../contracts';
import { PublishingPlatform } from '../publishing';
import { assert, StudioError } from '../validation';

import { readAutomationSettings } from './automationStore';
import { bufferChannels } from './bufferClient';
import { checkRate } from './identity';
import { encryptPublisherToken, publisherToken } from './publisherCrypto';
import { publishers, publishingState } from './publishingStore';
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
  const requested = new URL(req.url).searchParams.get('platform') ?? 'tiktok';
  assert(['tiktok', 'instagram'].includes(requested), 'INVALID_INPUT');
  const platform = requested as PublishingPlatform;
  const connections = await publishers(env);
  assert(
    connections.every((item) => item.owner === owner.id),
    'FORBIDDEN',
    403,
  );
  const connection = connections.find((item) => item.platform === platform);
  if (req.method === 'GET' && !action) return json(await publishingState(env, owner, platform));
  await checkRate(env, `publisher:${owner.id}:${platform}`, 5);
  if (req.method === 'POST' && ['probe', 'connect'].includes(action)) {
    const reuse = body.token === undefined && connections.length > 0;
    assert(
      reuse || (typeof body.token === 'string' && /^[\x21-\x7e]{16,2048}$/.test(body.token)),
      'INVALID_INPUT',
    );
    const source = connection ?? connections[0];
    const tokenValue = reuse
      ? await publisherToken(env, owner.id, source.token)
      : String(body.token);
    const channels = (await bufferChannels(tokenValue)).filter(
      (item) => item.platform === platform,
    );
    if (action === 'probe') return json({ channels });
    const channel = channels.find((item) => item.id === body.channelId && item.eligible);
    assert(channel, 'BUFFER_CHANNEL', 422);
    const now = Date.now();
    const token = reuse
      ? source.token
      : await encryptPublisherToken(env.STUDIO_SIGNING_SECRET, owner.id, tokenValue);
    await env.VIDEO_STUDIO_DB.prepare(
      'INSERT INTO studio_publisher(id,platform,owner,token,revision,organization_id,channel_id,channel_name,enabled,activated_at,updated_at) VALUES(?,?,?,?,?,?,?,?,0,?,?) ON CONFLICT(id) DO UPDATE SET token=excluded.token,revision=excluded.revision,organization_id=excluded.organization_id,channel_id=excluded.channel_id,channel_name=excluded.channel_name,enabled=0,activated_at=excluded.activated_at,updated_at=excluded.updated_at WHERE owner=excluded.owner',
    )
      .bind(
        platform === 'tiktok' ? 1 : 2,
        platform,
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
    return json(await publishingState(env, owner, platform));
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
        'UPDATE studio_publisher SET enabled=?,activated_at=CASE WHEN enabled=0 AND ?=1 THEN ? ELSE activated_at END,updated_at=? WHERE owner=? AND revision=? AND platform=?',
      ).bind(
        Number(body.enabled),
        Number(body.enabled),
        now,
        now,
        owner.id,
        connection.revision,
        platform,
      ),
      ...(!body.enabled
        ? [
            env.VIDEO_STUDIO_DB.prepare(
              "UPDATE studio_publications SET status='cancelled',updated_at=? WHERE owner=? AND platform=? AND status='queued'",
            ).bind(now, owner.id, platform),
          ]
        : []),
    ]);
    return json(await publishingState(env, owner, platform));
  }
  if (req.method === 'DELETE' && !action) {
    await env.VIDEO_STUDIO_DB.batch([
      env.VIDEO_STUDIO_DB.prepare('DELETE FROM studio_publisher WHERE owner=? AND platform=?').bind(
        owner.id,
        platform,
      ),
      env.VIDEO_STUDIO_DB.prepare(
        "UPDATE studio_publications SET status=CASE WHEN status='queued' THEN 'cancelled' ELSE 'unknown' END,error='BUFFER_RECONNECT',updated_at=? WHERE owner=? AND platform=? AND status IN ('queued','pending')",
      ).bind(Date.now(), owner.id, platform),
    ]);
    return json(await publishingState(env, owner, platform));
  }
  throw new StudioError('NOT_FOUND', 404);
};
