/* eslint-disable react-func/max-lines-per-function -- Authorization, expiry and byte-range streaming belong to the same file request. */
/* eslint-disable import/prefer-default-export -- Named boundary handlers are shared by the website and isolated integration entrypoint. */
/* eslint-disable @typescript-eslint/naming-convention -- Preserve standard HTTP headers, provider payloads and D1 column names at the boundary. */
import type { R2Bucket } from '@cloudflare/workers-types';

import { assert } from '../validation';

import { assetIndex } from './content';
import { validCapability } from './crypto';
import { JobRow } from './jobs';
import { StudioEnv } from './runtime';
import { UploadRow } from './uploads';

const streamFile = async (
  bucket: R2Bucket,
  key: string,
  req: Request,
  download = false,
): Promise<Response> => {
  const head = await bucket.head(key);
  assert(head, 'NOT_FOUND', 404);
  const headers = new Headers({
    'Content-Type': head.httpMetadata?.contentType ?? 'application/octet-stream',
    'Cache-Control': 'private, no-store',
    'Accept-Ranges': 'bytes',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  });
  if (download) headers.set('Content-Disposition', 'attachment; filename="tilawa.mp4"');
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
  const object = await bucket.get(key, { range: { offset, length } });
  assert(object, 'NOT_FOUND', 404);
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
    return streamFile(env.VIDEO_STUDIO_PRIVATE, job.output_key, req, true);
  }
  const asset = await env.VIDEO_STUDIO_DB.prepare(
    "SELECT * FROM studio_assets WHERE id=? AND status IN ('uploaded','ready') AND expires_at>?",
  )
    .bind(id, Date.now())
    .first<UploadRow>();
  assert(asset, 'NOT_FOUND', 404);
  return streamFile(env.VIDEO_STUDIO_PRIVATE, asset.object_key, req);
};
