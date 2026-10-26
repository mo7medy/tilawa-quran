import { createHash } from 'node:crypto';
import { setTimeout as pause } from 'node:timers/promises';

/** Reuses the CI-provided Cloudflare token; never reads local OAuth credentials. */
export const assetStorage = async ({ account, bucket, token, request = fetch, spacing = 275 }) => {
  if (!/^[a-f0-9]{32}$/.test(account)) throw new Error('Missing Cloudflare build account ID.');
  const base = `https://api.cloudflare.com/client/v4/accounts/${account}/r2/buckets/${bucket}/objects`;
  let next = 0;
  const send = async (url, options = {}, readJson = false) => {
    for (let attempt = 0; attempt < 4; attempt++) {
      const start = Math.max(Date.now(), next);
      next = start + spacing;
      await pause(Math.max(0, start - Date.now()));
      let response;
      try {
        response = await request(url, {
          ...options,
          redirect: 'manual',
          signal: AbortSignal.timeout(120000),
          headers: { Authorization: `Bearer ${token}`, ...options.headers },
        });
        if (response.ok) return readJson ? await response.json() : response;
      } catch {
        await response?.body?.cancel().catch(() => {});
        // Content-addressed uploads and listings can safely repeat after a lost response.
        // Never expose a transport exception that might contain credential-bearing URLs.
        if (attempt === 3) throw new Error('Asset storage request failed (network timeout).');
        await pause(1000 * 2 ** attempt);
        continue;
      }
      if ((response.status === 429 || response.status >= 500) && attempt < 3) {
        await response.body?.cancel();
        await pause(
          Math.min(
            30000,
            Math.max(
              1000,
              Number(response.headers.get('retry-after')) * 1000 || 1000 * 2 ** attempt,
            ),
          ),
        );
        continue;
      }
      await response.body?.cancel();
      throw new Error(`Asset storage request failed (HTTP ${response.status}).`);
    }
  };
  const existing = new Map();
  let cursor;
  do {
    const query = new URLSearchParams({
      prefix: 'blobs/',
      per_page: '1000',
      ...(cursor ? { cursor } : {}),
    });
    const data = await send(`${base}?${query}`, {}, true);
    if (!Array.isArray(data.result)) throw new Error('Invalid asset listing response.');
    data.result.forEach((item) => existing.set(item.key, item));
    cursor = data.result_info?.is_truncated ? data.result_info.cursor : undefined;
  } while (cursor);
  return async (key, mime, bytes) => {
    if (!/^(blobs\/[a-f0-9]{64}|manifest\.json)$/.test(key)) throw new Error('Invalid asset key.');
    if (
      key.startsWith('blobs/') &&
      createHash('sha256').update(bytes).digest('hex') !== key.slice(6)
    )
      throw new Error('Asset digest mismatch.');
    const old = existing.get(key);
    if (
      old?.size === bytes.length &&
      old.etag?.replaceAll('"', '') === createHash('md5').update(bytes).digest('hex')
    )
      return false;
    const response = await send(`${base}/${key}`, {
      method: 'PUT',
      headers: { 'Content-Type': mime },
      body: bytes,
    });
    await response.body?.cancel();
    return true;
  };
};
