import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';

import { assetStorage } from './asset-storage.mjs';

const bytes = Buffer.from('tracked-font-bytes');
const key = `blobs/${createHash('sha256').update(bytes).digest('hex')}`;
const options = {
  account: 'a'.repeat(32),
  bucket: 'staging-assets',
  token: 'test-ci-token',
  spacing: 0,
};

test('matching stored content is reused, while a changed file under the same key is rejected', async () => {
  const calls = [];
  const put = await assetStorage({
    ...options,
    request: async (url, init) => {
      calls.push({ url, init });
      return Response.json({
        result: [{ key, size: bytes.length, etag: createHash('md5').update(bytes).digest('hex') }],
      });
    },
  });
  assert.equal(await put(key, 'font/woff2', bytes), false);
  await assert.rejects(put(key, 'font/woff2', Buffer.from('changed')), /digest mismatch/);
  assert.equal(calls.length, 1);
});

test('storage redirects are rejected without forwarding CI credentials to another origin', async () => {
  const calls = [];
  const put = await assetStorage({
    ...options,
    request: async (url, init) => {
      calls.push({ url, init });
      return calls.length === 1
        ? Response.json({ result: [] })
        : new Response(null, {
            status: 302,
            headers: { Location: 'https://untrusted.example.test' },
          });
    },
  });
  await assert.rejects(put(key, 'font/woff2', bytes), /HTTP 302/);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].init.redirect, 'manual');
  assert.equal(new URL(calls[1].url).hostname, 'api.cloudflare.com');
  assert.deepEqual(calls[1].init.body, bytes);
});

test('a transient storage error retries the same bounded upload', async () => {
  let count = 0;
  const put = await assetStorage({
    ...options,
    request: async () => {
      count++;
      if (count === 1) return Response.json({ result: [] });
      return new Response(null, { status: count === 2 ? 503 : 200 });
    },
  });
  assert.equal(await put(key, 'font/woff2', bytes), true);
  assert.equal(count, 3);
});
