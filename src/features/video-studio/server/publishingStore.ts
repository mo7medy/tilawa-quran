/* eslint-disable @typescript-eslint/naming-convention -- D1 column names are a persistent storage contract. */
import { StudioOwner } from '../contracts';
import { PublicationStatus, PublishingPlatform, PublishingState } from '../publishing';
import { assert } from '../validation';

import { StudioEnv } from './runtime';

export interface PublisherRow {
  platform: PublishingPlatform;
  owner: string;
  token: string;
  revision: string;
  organization_id: string;
  channel_id: string;
  channel_name: string;
  enabled: number;
  activated_at: number;
}
export interface PublicationRow {
  platform: PublishingPlatform;
  id: string;
  run_id: string;
  owner: string;
  job_id: string;
  connection_revision: string;
  organization_id: string;
  channel_id: string;
  text: string;
  status: PublicationStatus;
  post_id: string | null;
  external_url: string | null;
  error: string | null;
  lease: string | null;
  lease_until: number;
  attempts: number;
  next_at: number;
  media_until: number;
  created_at: number;
}
export const publisher = (
  env: StudioEnv,
  platform: PublishingPlatform = 'tiktok',
): Promise<PublisherRow | null> =>
  env.VIDEO_STUDIO_DB.prepare('SELECT * FROM studio_publisher WHERE platform=?')
    .bind(platform)
    .first<PublisherRow>();

export const publishers = async (env: StudioEnv): Promise<PublisherRow[]> => {
  const rows = await env.VIDEO_STUDIO_DB.prepare(
    'SELECT * FROM studio_publisher ORDER BY id',
  ).all<PublisherRow>();
  return rows.results;
};

export const publishingState = async (
  env: StudioEnv,
  owner: StudioOwner,
  platform: PublishingPlatform = 'tiktok',
): Promise<PublishingState> => {
  const connections = await publishers(env);
  assert(
    connections.every((item) => item.owner === owner.id),
    'FORBIDDEN',
    403,
  );
  const connection = connections.find((item) => item.platform === platform);
  const rows = await env.VIDEO_STUDIO_DB.prepare(
    'SELECT id,run_id,platform,text,status,error,external_url FROM studio_publications WHERE owner=? AND platform=? ORDER BY created_at DESC LIMIT 60',
  )
    .bind(owner.id, platform)
    .all<PublicationRow>();
  return {
    canReuseToken: connections.length > 0,
    connection: connection
      ? { channelName: connection.channel_name, enabled: !!connection.enabled }
      : null,
    publications: rows.results.map((row) => ({
      platform: row.platform,
      id: row.id,
      runId: row.run_id,
      caption: row.text.split('\n')[0],
      status: row.status,
      error: row.error,
      externalUrl: row.external_url,
    })),
  };
};
