/* eslint-disable @typescript-eslint/naming-convention -- Quran Foundation wire schema. */
import { RENDER_VERSION, StudioCatalog } from '../contracts';
import { assert } from '../validation';

import { backgroundCatalog } from './backgroundLibrary';
import { StudioEnv } from './runtime';

import { fetchQuranFoundation } from '@/lib/quranFoundation/client';
import { getAllChaptersData } from '@/utils/chapter';

export interface Resource {
  id: number;
  name?: string;
  translated_name?: { name: string };
  language_name?: string;
}
export const content = async (path: string): Promise<Record<string, unknown>> => {
  const response = await fetchQuranFoundation(`content/api/qdc/${path}`);
  assert(response.ok, 'CONTENT_UNAVAILABLE', 503);
  return response.json();
};
export const list = <T>(value: unknown): T[] => {
  assert(Array.isArray(value), 'CONTENT_UNAVAILABLE', 503);
  return value as T[];
};
export const catalog = async (env: StudioEnv, lang: string): Promise<StudioCatalog> => {
  const [readers, translations, backgrounds] = await Promise.all([
    content(`audio/reciters?locale=${lang}`),
    content(`resources/translations?language=${lang}`),
    backgroundCatalog(env),
  ]);
  const chapters = await getAllChaptersData(lang);
  return {
    chapters: Object.entries(chapters).map(([id, ch]) => ({
      id: Number(id),
      name: ch.transliteratedName,
      count: ch.versesCount,
    })),
    reciters: list<Resource>(readers.reciters).map((r) => ({
      id: r.id,
      name: r.translated_name?.name ?? r.name,
    })),
    translations: list<Resource>(translations.translations).map((r) => ({
      id: r.id,
      name: r.name,
      language: r.language_name ?? '',
    })),
    backgrounds,
    enabled: env.STUDIO_ENABLED === '1',
    turnstileSiteKey: env.STUDIO_TURNSTILE_SITE_KEY ?? '',
  };
};
export interface AssetIndex {
  renderVersion: string;
  files: Record<string, { key: string; sha256: string; mime: string }>;
}
export const assetIndex = async (env: StudioEnv): Promise<AssetIndex> => {
  const object = await env.VIDEO_STUDIO_ASSETS.get('manifest.json');
  assert(object, 'ASSETS_UNAVAILABLE', 503);
  const index = await object.json<AssetIndex>();
  assert(index.renderVersion === RENDER_VERSION, 'ASSETS_VERSION_MISMATCH', 503);
  return index;
};
