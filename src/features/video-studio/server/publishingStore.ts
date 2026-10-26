/* eslint-disable @typescript-eslint/naming-convention -- D1 column names are a persistent storage contract. */
import { StudioOwner } from '../contracts';
import { PublicationStatus, PublishingState } from '../publishing';
import { assert } from '../validation';

import { StudioEnv } from './runtime';

export interface PublisherRow {
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
export const publisher = (env: StudioEnv): Promise<PublisherRow | null> =>
  env.VIDEO_STUDIO_DB.prepare('SELECT * FROM studio_publisher WHERE id=1').first<PublisherRow>();

export const publishingState = async (
  env: StudioEnv,
  owner: StudioOwner,
): Promise<PublishingState> => {
  const connection = await publisher(env);
  assert(!connection || connection.owner === owner.id, 'FORBIDDEN', 403);
  const rows = await env.VIDEO_STUDIO_DB.prepare(
    'SELECT id,run_id,text,status,error,external_url FROM studio_publications WHERE owner=? ORDER BY created_at DESC LIMIT 60',
  )
    .bind(owner.id)
    .all<PublicationRow>();
  return {
    connection: connection
      ? { channelName: connection.channel_name, enabled: !!connection.enabled }
      : null,
    publications: rows.results.map((row) => ({
      id: row.id,
      runId: row.run_id,
      caption: row.text.split('\n')[0],
      status: row.status,
      error: row.error,
      externalUrl: row.external_url,
    })),
  };
};
