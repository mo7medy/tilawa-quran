/* eslint-disable react-func/max-lines-per-function -- Authorization, expiry and byte-range streaming belong to the same file request. */
/* eslint-disable import/prefer-default-export -- Named boundary handlers are shared by the website and isolated integration entrypoint. */
/* eslint-disable @typescript-eslint/naming-convention -- Preserve standard HTTP headers, provider payloads and D1 column names at the boundary. */
import type { R2Bucket } from '@cloudflare/workers-types';

import { assert } from '../validation';

import { backgroundLibrary } from './backgroundLibrary';
import { assetIndex } from './content';
import { validCapability } from './crypto';
import { JobRow } from './jobs';
import { StudioEnv } from './runtime';
import { UploadRow } from './uploads';

const streamFile = async (
  bucket: R2Bucket,
  key: string,
  req: Request,
  options: { download?: boolean; etag?: string; mime?: string } = {},
): Promise<Response> => {
  const head = await bucket.head(key);
  assert(head, 'NOT_FOUND', 404);
  assert(!options.etag || head.etag === options.etag, 'BACKGROUND_CHANGED', 409);
  const headers = new Headers({
    'Content-Type': options.mime ?? head.httpMetadata?.contentType ?? 'application/octet-stream',
    'Cache-Control': 'private, no-store',
    'Accept-Ranges': 'bytes',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  });
  if (options.download) headers.set('Content-Disposition', 'attachment; filename="tilawa.mp4"');
  const range = req.headers.get('range');
  let offset = 0;
  let length = head.size;
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    assert(match && (match[1] || match[2]), 'INVALID_RANGE', 416);
    offset = match[1] ? Number(match[1]) : Math.max(0, head.size - Number(match[2]));
    const end = match[1] && match[2] ? Math.min(Number(match[2]), head.size - 1) : head.size - 1;
    assert(Number.isSafeInteger(offset) && offset >= 0 && offset <= end, 'INVALID_RANGE', 416);
    length = end - offset + 1;
    headers.set('Content-Range', `bytes ${offset}-${end}/${head.size}`);
  }
  headers.set('Content-Length', String(length));
  if (req.method === 'HEAD') return new Response(null, { headers, status: range ? 206 : 200 });
  const object = await bucket.get(key, {
    range: { offset, length },
    ...(options.etag ? { onlyIf: { etagMatches: options.etag } } : {}),
  });
  assert(object, 'NOT_FOUND', 404);
  assert('body' in object, 'BACKGROUND_CHANGED', 409);
  return new Response(object.body as unknown as ReadableStream, {
    headers,
    status: range ? 206 : 200,
  });
};
export const fileRequest = async (
  env: StudioEnv,
  req: Request,
  group: string,
  id: string,
): Promise<Response> => {
  assert(['GET', 'HEAD'].includes(req.method), 'METHOD_NOT_ALLOWED', 405);
  if (group === 'publication-media') {
    assert(/^[0-9a-f-]{36}\.mp4$/.test(id ?? ''), 'NOT_FOUND', 404);
    // Only a specifically authorized publication gets a stable, unguessable provider media URL.
    const row = await env.VIDEO_STUDIO_DB.prepare(
      "SELECT j.output_key FROM studio_publications p JOIN studio_jobs j ON j.id=p.job_id AND j.owner=p.owner WHERE p.id=? AND p.status IN ('sending','pending','published','review','unknown') AND p.media_until>? AND j.status='completed' AND j.expires_at>?",
    )
      .bind(id.slice(0, -4), Date.now(), Date.now())
      .first<{ output_key: string }>();
    assert(row?.output_key, 'NOT_FOUND', 404);
    return streamFile(env.VIDEO_STUDIO_PRIVATE, row.output_key, req, { mime: 'video/mp4' });
  }
  if (group === 'backgrounds') {
    const images = await backgroundLibrary(env);
    const image = images.find((entry) => entry.id === id);
    assert(image, 'NOT_FOUND', 404);
    const head = await env.VIDEO_STUDIO_BACKGROUNDS.head(image.key);
    assert(head && head.size > 0 && head.size <= 10 * 1024 * 1024, 'NOT_FOUND', 404);
    const version = new URL(req.url).searchParams.get('v');
    return streamFile(env.VIDEO_STUDIO_BACKGROUNDS, image.key, req, {
      etag: version ?? head.etag,
      mime: image.mime,
    });
  }
  if (group === 'assets') {
    const index = await assetIndex(env);
    const item = index.files[id] ?? Object.values(index.files).find((f) => f.sha256 === id);
    assert(item, 'NOT_FOUND', 404);
    return streamFile(env.VIDEO_STUDIO_ASSETS, item.key, req);
  }
  const resource = group === 'download' ? `download:${id}` : `asset:${id}`;
  assert(
    await validCapability(
      env.STUDIO_SIGNING_SECRET,
      resource,
      new URL(req.url).searchParams.get('token') ?? '',
    ),
    'FORBIDDEN',
    403,
  );
  if (group === 'download') {
    const job = await env.VIDEO_STUDIO_DB.prepare(
      "SELECT * FROM studio_jobs WHERE id=? AND status='completed' AND expires_at>?",
    )
      .bind(id, Date.now())
      .first<JobRow>();
    assert(job?.output_key, 'NOT_FOUND', 404);
    return streamFile(env.VIDEO_STUDIO_PRIVATE, job.output_key, req, { download: true });
  }
  const asset = await env.VIDEO_STUDIO_DB.prepare(
    "SELECT * FROM studio_assets WHERE id=? AND status IN ('uploaded','ready') AND expires_at>?",
  )
    .bind(id, Date.now())
    .first<UploadRow>();
  assert(asset, 'NOT_FOUND', 404);
  return streamFile(env.VIDEO_STUDIO_PRIVATE, asset.object_key, req);
};
