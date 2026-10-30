/* eslint-disable @typescript-eslint/naming-convention -- Quran Foundation wire fields. */
/* eslint-disable no-await-in-loop -- Bounded content requests avoid exceeding the Workers connection limit. */
/* eslint-disable no-restricted-syntax -- Workers supports native iteration; requests remain bounded and sequential. */
/* eslint-disable no-continue -- Skip unavailable recordings without replacing a selected reader. */
/* eslint-disable react-func/max-lines-per-function -- Source timing checks form one bounded catalogue operation. */
import type { StudioCatalog } from '../contracts';
import { assert } from '../validation';

import { automationReaders } from './automationPreferences';
import { content, list } from './contentSources';
import { expandedCandidates } from './expandedCandidates';
import { StudioEnv } from './runtime';

// Complete short surahs and bounded, continuous passages; never split an ayah to reach a duration.
const PASSAGES = [
  [1, 1, 7],
  [93, 1, 11],
  [94, 1, 8],
  [95, 1, 8],
  [97, 1, 5],
  [99, 1, 8],
  [100, 1, 11],
  [101, 1, 11],
  [102, 1, 8],
  [104, 1, 9],
  [107, 1, 7],
  [109, 1, 6],
  [2, 255, 255],
  [2, 285, 286],
  [59, 22, 24],
  [55, 26, 30],
  [67, 1, 4],
  [39, 53, 54],
  [13, 28, 29],
  [41, 30, 32],
  [16, 97, 97],
  [24, 35, 35],
  [89, 27, 30],
  [87, 1, 19],
] as const;
export interface AutomationCandidate {
  id: string;
  chapterId: number;
  from: number;
  to: number;
  reciterId: number;
  reciter: string;
  chapter: string;
  durationMs: number;
  familiar?: boolean;
}
interface Cached {
  value: string;
}
/**
 * Only public catalogue and recording metadata are cached, never user tokens or private URLs.
 * @returns {Promise<T>} cached or freshly loaded public metadata
 */
export const cachedAutomationContent = async <T>(
  env: StudioEnv,
  key: string,
  load: () => Promise<T>,
  ttl = 86400000,
): Promise<T> => {
  const now = Date.now();
  const row = await env.VIDEO_STUDIO_DB.prepare(
    'SELECT value FROM studio_automation_cache WHERE key=? AND expires_at>?',
  )
    .bind(key, now)
    .first<Cached>();
  if (row) return JSON.parse(row.value) as T;
  const value = await load();
  const encoded = JSON.stringify(value);
  assert(encoded.length <= 512000, 'CONTENT_UNAVAILABLE', 503);
  await env.VIDEO_STUDIO_DB.prepare(
    'INSERT INTO studio_automation_cache(key,value,expires_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,expires_at=excluded.expires_at',
  )
    .bind(key, encoded, now + ttl)
    .run();
  return value;
};

export const automationCandidates = async (
  env: StudioEnv,
  catalog: StudioCatalog,
  seed: number,
  recent: { chapterId: number; from: number; to: number }[],
  expanded = false,
): Promise<AutomationCandidate[]> => {
  assert(catalog.reciters.length > 0, 'AUDIO_UNAVAILABLE');
  if (expanded) return expandedCandidates(env, catalog, seed, recent, cachedAutomationContent);
  const available = PASSAGES.filter(
    ([chapterId, from, to]) =>
      !recent.some((r) => r.chapterId === chapterId && r.from <= to && r.to >= from),
  );
  const passages = Array.from(
    { length: Math.min(4, available.length) },
    (_, i) => available[(seed + i) % available.length],
  );
  const readers = automationReaders(catalog, seed);
  const candidates: AutomationCandidate[] = [];
  for (const [chapterId, from, to] of passages) {
    for (const reader of readers) {
      try {
        const data = await cachedAutomationContent(env, `timing:${reader.id}:${chapterId}`, () =>
          content(`audio/reciters/${reader.id}/audio_files?chapter=${chapterId}&segments=true`),
        );
        const audio = list<Record<string, unknown>>(data.audio_files)[0];
        const timings = list<Record<string, unknown>>(audio?.verse_timings);
        const first = timings.find((v) => v.verse_key === `${chapterId}:${from}`);
        const last = timings.find((v) => v.verse_key === `${chapterId}:${to}`);
        const durationMs = Number(last?.timestamp_to) - Number(first?.timestamp_from);
        if (
          typeof audio?.audio_url !== 'string' ||
          !Number.isFinite(durationMs) ||
          durationMs < 30000 ||
          durationMs > 70000
        ) {
          continue;
        }
        const complete = Array.from({ length: to - from + 1 }, (_, i) =>
          timings.find((v) => v.verse_key === `${chapterId}:${from + i}`),
        );
        if (
          complete.some(
            (v) =>
              !v ||
              !Number.isFinite(Number(v.timestamp_from)) ||
              Number(v.timestamp_to) <= Number(v.timestamp_from),
          )
        ) {
          continue;
        }
        candidates.push({
          id: `${chapterId}:${from}-${to}:${reader.id}`,
          chapterId,
          from,
          to,
          reciterId: reader.id,
          reciter: reader.name,
          chapter: catalog.chapters.find((c) => c.id === chapterId)?.name ?? String(chapterId),
          durationMs,
        });
      } catch {
        // An unavailable reader is excluded before the model selects; selected recordings are never silently replaced.
      }
    }
  }
  assert(candidates.length > 0, 'AUTOMATION_NO_CANDIDATES', 503);
  return candidates;
};
