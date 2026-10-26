/* eslint-disable @typescript-eslint/naming-convention -- D1 result fields retain their storage names. */
/* eslint-disable react-func/max-lines-per-function -- The write boundary must distinguish ambiguous sends from safe read retries. */
/* eslint-disable import/prefer-default-export -- Named cron entrypoint is shared by the Worker and integration tests. */
import { PublicationStatus } from '../publishing';
import { assert, StudioError } from '../validation';

import {
  bufferChannels,
  BufferFailure,
  BufferPost,
  createBufferPost,
  readBufferPost,
} from './bufferClient';
import { publisherToken } from './publisherCrypto';
import { claimPublication, enqueuePublications, recoverPublications } from './publishingQueue';
import { PublicationRow, publisher } from './publishingStore';
import { StudioEnv } from './runtime';

const save = async (
  env: StudioEnv,
  row: PublicationRow,
  status: PublicationStatus,
  post: BufferPost | null = null,
  error: string | null = null,
  delay = 600000,
): Promise<void> => {
  const now = Date.now();
  // Only links on TikTok can appear as an external destination in the private library.
  const link =
    post?.externalLink && /^https:\/\/([a-z0-9-]+\.)?tiktok\.com\//i.test(post.externalLink)
      ? post.externalLink
      : null;
  await env.VIDEO_STUDIO_DB.prepare(
    "UPDATE studio_publications SET status=?,post_id=COALESCE(?,post_id),external_url=COALESCE(?,external_url),error=?,next_at=?,lease=NULL,lease_until=0,media_until=CASE WHEN ?='published' THEN MIN(media_until,?) ELSE media_until END,updated_at=? WHERE id=? AND lease=? AND status=?",
  )
    .bind(
      status,
      post?.id ?? null,
      link,
      error,
      now + delay,
      status,
      now + 86400000,
      now,
      row.id,
      row.lease,
      row.status,
    )
    .run();
};
const postStatus = (post: BufferPost): PublicationStatus => {
  if (post.status === 'sent') return 'published';
  if (['draft', 'needs_approval'].includes(post.status)) return 'review';
  if (post.status === 'error') return 'failed';
  assert(['scheduled', 'sending'].includes(post.status), 'BUFFER_RESPONSE', 503);
  return 'pending';
};
const processPublication = async (env: StudioEnv, row: PublicationRow): Promise<void> => {
  let accepted: BufferPost | null = null;
  try {
    const connection = await publisher(env);
    assert(
      connection?.owner === row.owner && connection.revision === row.connection_revision,
      'BUFFER_RECONNECT',
      409,
    );
    const token = await publisherToken(env, row.owner, connection.token);
    let post: BufferPost;
    if (row.status === 'pending') {
      assert(row.post_id, 'BUFFER_RESPONSE', 503);
      post = await readBufferPost(token, row.post_id);
    } else {
      assert(connection.enabled && env.STUDIO_ENABLED === '1', 'PUBLISHING_PAUSED', 409);
      const channels = await bufferChannels(token);
      assert(
        channels.some(
          (c) => c.id === row.channel_id && c.organizationId === row.organization_id && c.eligible,
        ),
        'BUFFER_CHANNEL',
        409,
      );
      const job = await env.VIDEO_STUDIO_DB.prepare(
        "SELECT output_key FROM studio_jobs WHERE id=? AND owner=? AND status='completed' AND expires_at>?",
      )
        .bind(row.job_id, row.owner, Date.now() + 3600000)
        .first<{ output_key: string }>();
      assert(
        job?.output_key && (await env.VIDEO_STUDIO_PRIVATE.head(job.output_key)),
        'BUFFER_EXPIRED',
        410,
      );
      // Recheck after read-only provider calls: pause/reconnect may have occurred while validating.
      const active = await publisher(env);
      assert(
        active?.enabled && active.revision === row.connection_revision,
        'PUBLISHING_PAUSED',
        409,
      );
      const lease = await env.VIDEO_STUDIO_DB.prepare(
        "SELECT id FROM studio_publications WHERE id=? AND lease=? AND status='sending' AND lease_until>?",
      )
        .bind(row.id, row.lease, Date.now() + 25000)
        .first();
      assert(lease, 'BUFFER_UNCERTAIN', 409);
      const url = `${env.STUDIO_ORIGIN}/api/video-studio/publication-media/${row.id}.mp4`;
      try {
        post = await createBufferPost(token, row.channel_id, row.text, url);
        accepted = post;
      } catch (error) {
        // Ambiguous writes MUST NOT be retried; Buffer provides no create idempotency key.
        if (!(error instanceof BufferFailure) || error.uncertain) {
          await save(env, row, 'unknown', null, 'BUFFER_UNCERTAIN');
          return;
        }
        throw error;
      }
    }
    assert(post.channelId === row.channel_id, 'BUFFER_RESPONSE', 503);
    const status = postStatus(post);
    const delay = [60000, 300000, 900000, 3600000][row.attempts - 1] ?? 14400000;
    await save(env, row, status, post, status === 'failed' ? 'BUFFER_REJECTED' : null, delay);
  } catch (error) {
    if (accepted) {
      await save(env, row, 'unknown', accepted, 'BUFFER_UNCERTAIN');
      return;
    }
    const code = error instanceof StudioError ? error.code : 'BUFFER_RESPONSE';
    const retry = error instanceof BufferFailure && error.retryAfter > 0;
    if (row.status === 'pending' && code !== 'BUFFER_RECONNECT') {
      await save(env, row, 'pending', null, code, retry ? error.retryAfter : 900000);
    } else if (retry && row.attempts < 4) {
      await save(env, row, 'queued', null, code, error.retryAfter);
    } else {
      await save(env, row, row.status === 'pending' ? 'unknown' : 'failed', null, code);
    }
  }
};
export const maintainPublishing = async (env: StudioEnv): Promise<void> => {
  if (!env.VIDEO_STUDIO_DB || !env.STUDIO_AUTOMATION_EMAIL_HASH) return;
  await recoverPublications(env);
  const connection = await publisher(env);
  if (!connection) return;
  await enqueuePublications(env, connection);
  const row = await claimPublication(env);
  if (row) await processPublication(env, row);
};
