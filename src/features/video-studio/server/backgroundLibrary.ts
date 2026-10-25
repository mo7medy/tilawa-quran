import { ResolvedVideoManifest, StudioCatalog } from '../contracts';
import { assert, record } from '../validation';

import { StudioEnv } from './runtime';

export interface LibraryImage {
  id: string;
  key: string;
  mime: string;
  orientation: 'portrait' | 'landscape';
  collection: 'nature' | 'sakina';
  number: number;
  width: number;
  height: number;
}

const imageDimensions = (row: Record<string, unknown>): Pick<LibraryImage, 'width' | 'height'> => {
  const size = { width: Number(row.width), height: Number(row.height) };
  assert(
    Object.values(size).every((n) => Number.isInteger(n) && n > 0 && n <= 4096),
    'BACKGROUND_UNAVAILABLE',
    503,
  );
  return size;
};

const parseImage = (input: unknown): LibraryImage => {
  const row = record(input);
  assert(
    typeof row.name === 'string' &&
      /^[a-zA-Z0-9_-]{1,55}$/.test(row.name) &&
      typeof row.path === 'string' &&
      /^(?:sakina\/)?(?:portrait|landscape)\/[a-zA-Z0-9_-]+\.(?:jpe?g|png|webp)$/.test(row.path) &&
      ['portrait', 'landscape'].includes(String(row.type)),
    'BACKGROUND_UNAVAILABLE',
    503,
  );
  const key = row.path as string;
  const orientation = row.type as LibraryImage['orientation'];
  assert(key.split('/').at(-2) === orientation, 'BACKGROUND_UNAVAILABLE', 503);
  return {
    id: `r2-${row.name}`,
    key,
    mime: { png: 'image/png', webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg' }[
      key.split('.').pop()
    ],
    orientation,
    collection: key.startsWith('sakina/') ? 'sakina' : 'nature',
    number: Number(String(row.name).match(/\d+$/)?.[0] ?? 0),
    ...imageDimensions(row),
  };
};

export const backgroundLibrary = async (env: StudioEnv): Promise<LibraryImage[]> => {
  if (!env.VIDEO_STUDIO_BACKGROUNDS) return [];
  const manifest = await env.VIDEO_STUDIO_BACKGROUNDS.get('manifest.json');
  assert(manifest && manifest.size <= 256 * 1024, 'BACKGROUND_UNAVAILABLE', 503);
  // The existing bucket manifest includes a UTF-8 BOM.
  const entries: unknown = JSON.parse((await manifest.text()).replace(/^\uFEFF/, ''));
  assert(Array.isArray(entries) && entries.length <= 1000, 'BACKGROUND_UNAVAILABLE', 503);
  const images = (entries as unknown[]).map(parseImage);
  assert(
    new Set(images.map((image) => image.id)).size === images.length,
    'BACKGROUND_UNAVAILABLE',
    503,
  );
  return images;
};

export const backgroundCatalog = async (env: StudioEnv): Promise<StudioCatalog['backgrounds']> => {
  const images = await backgroundLibrary(env);
  return [
    ...images.map((image) => ({
      id: image.id,
      orientation: image.orientation,
      collection: image.collection,
      number: image.number,
      width: image.width,
      height: image.height,
      type: 'image' as const,
      url: `${env.STUDIO_ORIGIN}/api/video-studio/backgrounds/${image.id}`,
    })),
    ...['sea', 'abstract', 'windmill', 'stars', 'nature', 'snow'].map((id) => ({
      id,
      type: 'video' as const,
      url: `${env.STUDIO_ORIGIN}/api/video-studio/assets/background-${id}`,
    })),
  ];
};

export const resolveLibraryImage = async (
  env: StudioEnv,
  id: string,
): Promise<ResolvedVideoManifest['background']> => {
  const images = await backgroundLibrary(env);
  const image = images.find((entry) => entry.id === id);
  assert(image, 'BACKGROUND_UNAVAILABLE');
  const head = await env.VIDEO_STUDIO_BACKGROUNDS.head(image.key);
  assert(head && head.size > 0 && head.size <= 10 * 1024 * 1024, 'BACKGROUND_UNAVAILABLE');
  return {
    type: 'image',
    url: `${env.STUDIO_ORIGIN}/api/video-studio/backgrounds/${image.id}?v=${encodeURIComponent(
      head.etag,
    )}`,
  };
};
