/* eslint-disable react-func/max-lines-per-function -- Refresh channels and eligibility as one bounded cache operation. */
/* eslint-disable @typescript-eslint/naming-convention -- Persisted SQLite fields. */
import { PublisherChannel, PublishingPlatform } from '../publishing';
import { assert } from '../validation';

import { readAutomationSettings } from './automationStore';
import { BufferFailure, bufferChannels } from './bufferClient';
import { publisherToken } from './publisherCrypto';
import { StudioEnv } from './runtime';

export interface ConnectionRow {
  id: string;
  owner: string;
  account_id: string;
  name: string;
  token: string;
  revision: string;
  disconnected: number;
  cooldown_until: number;
}
export interface DestinationRow {
  id: string;
  owner: string;
  connection_id: string;
  platform: PublishingPlatform;
  organization_id: string;
  channel_id: string;
  name: string;
  eligible: number;
  daily_count: number;
  next_count: number;
  effective_day: string;
  paused: number;
  disconnected: number;
  revision: number;
  last_sent_at: number;
}
export const automationOwner = async (env: StudioEnv): Promise<string> => {
  const settings = await readAutomationSettings(env);
  assert(settings, 'AUTOMATION_UNAVAILABLE', 409);
  return settings.owner;
};
export const connectionById = async (
  env: StudioEnv,
  owner: string,
  id: string,
): Promise<ConnectionRow> => {
  const row = await env.VIDEO_STUDIO_DB.prepare(
    'SELECT * FROM studio_buffer_connections WHERE owner=? AND id=?',
  )
    .bind(owner, id)
    .first<ConnectionRow>();
  assert(row, 'NOT_FOUND', 404);
  return row;
};
export const destinationById = async (
  env: StudioEnv,
  owner: string,
  id: string,
): Promise<DestinationRow> => {
  const row = await env.VIDEO_STUDIO_DB.prepare(
    'SELECT * FROM studio_destinations WHERE owner=? AND id=?',
  )
    .bind(owner, id)
    .first<DestinationRow>();
  assert(row, 'NOT_FOUND', 404);
  return row;
};
export const countBufferRequest =
  (env: StudioEnv, connection: ConnectionRow): (() => Promise<void>) =>
  async () => {
    const result = await env.VIDEO_STUDIO_DB.prepare(
      'INSERT INTO studio_buffer_usage(connection_id,day,calls) SELECT ?,?,1 WHERE EXISTS(SELECT 1 FROM studio_buffer_connections WHERE id=? AND cooldown_until<=?) ON CONFLICT(connection_id,day) DO UPDATE SET calls=calls+1 RETURNING calls',
    )
      .bind(connection.id, new Date().toISOString().slice(0, 10), connection.id, Date.now())
      .first();
    if (!result) {
      const active = await connectionById(env, connection.owner, connection.id);
      throw new BufferFailure(
        'BUFFER_RATE_LIMIT',
        false,
        Math.max(60000, active.cooldown_until - Date.now()),
      );
    }
  };
export const connectionChannels = async (
  env: StudioEnv,
  connection: ConnectionRow,
  fresh = false,
): Promise<PublisherChannel[]> => {
  const cached = await env.VIDEO_STUDIO_DB.prepare(
    'SELECT value FROM studio_buffer_channels WHERE connection_id=? AND revision=? AND expires_at>?',
  )
    .bind(connection.id, connection.revision, Date.now())
    .first<{ value: string }>();
  if (cached && !fresh) {
    return JSON.parse(cached.value) as Awaited<ReturnType<typeof bufferChannels>>;
  }
  try {
    const channels = await bufferChannels(
      await publisherToken(env, connection.owner, connection.token),
      countBufferRequest(env, connection),
    );
    await env.VIDEO_STUDIO_DB.prepare(
      'INSERT INTO studio_buffer_channels(connection_id,revision,value,expires_at) VALUES(?,?,?,?) ON CONFLICT(connection_id) DO UPDATE SET revision=excluded.revision,value=excluded.value,expires_at=excluded.expires_at',
    )
      .bind(connection.id, connection.revision, JSON.stringify(channels), Date.now() + 300000)
      .run();
    await env.VIDEO_STUDIO_DB.batch([
      env.VIDEO_STUDIO_DB.prepare(
        'UPDATE studio_destinations SET eligible=0 WHERE connection_id=?',
      ).bind(connection.id),
      ...channels.map((c) =>
        env.VIDEO_STUDIO_DB.prepare(
          'UPDATE studio_destinations SET eligible=? WHERE connection_id=? AND channel_id=? AND platform=?',
        ).bind(Number(c.eligible), connection.id, c.id, c.platform),
      ),
    ]);
    return channels;
  } catch (error) {
    await bufferCooldown(env, connection.id, error);
    throw error;
  }
};
export const bufferCooldown = async (env: StudioEnv, id: string, error: unknown): Promise<void> => {
  if (error instanceof BufferFailure && error.retryAfter > 0) {
    await env.VIDEO_STUDIO_DB.prepare(
      'UPDATE studio_buffer_connections SET cooldown_until=MAX(cooldown_until,?) WHERE id=?',
    )
      .bind(Date.now() + error.retryAfter, id)
      .run();
  }
};
