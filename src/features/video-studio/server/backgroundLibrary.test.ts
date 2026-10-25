/* eslint-disable react-func/max-lines-per-function -- Shared native R2 fixtures exercise public streaming and immutable job inputs together. */
// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { defaultSpec } from '../contracts';

import { backgroundCatalog, backgroundLibrary, resolveLibraryImage } from './backgroundLibrary';
import { fileRequest } from './files';
import { resolveBackground } from './manifestBackground';
import { StudioEnv } from './runtime';

vi.mock('./content', () => ({ assetIndex: vi.fn() }));
const entry = {
  name: 'portrait_01',
  path: 'portrait/portrait_01.jpg',
  type: 'portrait',
  width: 1280,
  height: 1920,
};
const manifest = (): { size: number; text: () => Promise<string> } => ({
  size: 500,
  text: async () => `\uFEFF${JSON.stringify([entry])}`,
});
const head = vi.fn();
const get = vi.fn();
const origin = 'https://studio.example.test';
const env = {
  STUDIO_ORIGIN: origin,
  VIDEO_STUDIO_BACKGROUNDS: { get, head },
} as unknown as StudioEnv;
const request = (suffix = '', headers = {}): Request =>
  new Request(`${origin}/api/video-studio/backgrounds/r2-portrait_01${suffix}`, { headers });

beforeEach(() => {
  head
    .mockReset()
    .mockResolvedValue({ size: 10, etag: 'original', httpMetadata: { contentType: 'image/jpeg' } });
  get.mockReset().mockImplementation(async (key, options) => {
    if (key === 'manifest.json') return manifest();
    const offset = options?.range?.offset ?? 0;
    const length = options?.range?.length ?? 10;
    return { body: new Response('abcdefghij'.slice(offset, offset + length)).body };
  });
});

describe('existing R2 background library', () => {
  it('reads a BOM-prefixed manifest and retains the six legacy video backgrounds', async () => {
    const catalog = await backgroundCatalog(env);
    expect(catalog).toHaveLength(7);
    expect(catalog[0]).toMatchObject({
      id: 'r2-portrait_01',
      type: 'image',
      orientation: 'portrait',
      collection: 'nature',
    });
    expect(catalog.find((b) => b.id === 'sea')?.type).toBe('video');
    expect(await backgroundCatalog({ ...env, VIDEO_STUDIO_BACKGROUNDS: undefined })).toHaveLength(
      6,
    );
  });
  it.each([
    { name: 'external paths', rows: [{ ...entry, path: 'https://untrusted.example/image.jpg' }] },
    { name: 'duplicate identifiers', rows: [entry, entry] },
  ])('rejects $name', async ({ rows }) => {
    get.mockResolvedValueOnce({ size: 500, text: async () => JSON.stringify(rows) });
    await expect(backgroundLibrary(env)).rejects.toMatchObject({ code: 'BACKGROUND_UNAVAILABLE' });
  });
  it('rejects an oversized manifest before reading its contents', async () => {
    const text = vi.fn();
    get.mockResolvedValueOnce({ size: 300000, text });
    await expect(backgroundLibrary(env)).rejects.toMatchObject({ code: 'BACKGROUND_UNAVAILABLE' });
    expect(text).not.toHaveBeenCalled();
  });
  it('freezes the image version in the same site URL used by preview and Modal', async () => {
    const result = await resolveLibraryImage(env, 'r2-portrait_01');
    expect(result).toEqual({
      type: 'image',
      url: `${origin}/api/video-studio/backgrounds/r2-portrait_01?v=original`,
    });
    const legacy = await resolveBackground(
      env,
      { id: 'guest:test', registered: false, network: 'test' },
      { ...defaultSpec, background: { ...defaultSpec.background, type: 'library', value: 'sea' } },
      {
        renderVersion: 'studio-1',
        files: Object.fromEntries([
          ['background-sea', { key: 'video', sha256: 'legacy-hash', mime: 'video/mp4' }],
        ]),
      },
    );
    expect(legacy).toEqual({ type: 'video', url: `${origin}/api/video-studio/assets/legacy-hash` });
  });
  it('streams byte ranges and enforces the frozen ETag in the native R2 read', async () => {
    const response = await fileRequest(
      env,
      request('?v=original', { Range: 'bytes=2-4' }),
      'backgrounds',
      'r2-portrait_01',
    );
    expect(response.status).toBe(206);
    expect(response.headers.get('Content-Range')).toBe('bytes 2-4/10');
    expect(response.headers.get('Content-Type')).toBe('image/jpeg');
    expect(await response.text()).toBe('cde');
    expect(get).toHaveBeenCalledWith(entry.path, {
      range: { offset: 2, length: 3 },
      onlyIf: { etagMatches: 'original' },
    });
  });
  it('refuses a changed image, an unlisted identifier and a conditional read race', async () => {
    await expect(
      fileRequest(env, request('?v=old'), 'backgrounds', 'r2-portrait_01'),
    ).rejects.toMatchObject({ code: 'BACKGROUND_CHANGED' });
    await expect(fileRequest(env, request(), 'backgrounds', 'not-listed')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    get.mockImplementation(async (key) =>
      key === 'manifest.json' ? manifest() : { etag: 'replaced' },
    );
    await expect(
      fileRequest(env, request('?v=original'), 'backgrounds', 'r2-portrait_01'),
    ).rejects.toMatchObject({ code: 'BACKGROUND_CHANGED' });
  });
});
