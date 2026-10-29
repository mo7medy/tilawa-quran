/* eslint-disable import/prefer-default-export -- Named content-resolution helper. */
/* eslint-disable no-await-in-loop, no-restricted-syntax, no-continue -- Bounded sequential metadata requests stay under Workers connection limits. */
/* eslint-disable react-func/max-lines-per-function -- Validate contiguous source timings before offering any model candidate. */
import { StudioCatalog } from '../contracts';
import { assert } from '../validation';

import type { AutomationCandidate, cachedAutomationContent } from './automationCandidates';
import { content, list } from './contentSources';
import { StudioEnv } from './runtime';

export const expandedCandidates = async (
  env: StudioEnv,
  catalog: StudioCatalog,
  seed: number,
  recent: { chapterId: number; from: number; to: number }[],
  cached: typeof cachedAutomationContent,
): Promise<AutomationCandidate[]> => {
  const candidates: AutomationCandidate[] = [];
  const chapters = Array.from(
    { length: Math.min(3, catalog.chapters.length) },
    (unused, i) => catalog.chapters[(seed + i * 37) % catalog.chapters.length],
  );
  // eslint-disable-next-line no-bitwise -- Deterministic mixing avoids excluding readers when catalogue sizes share factors.
  const readerOffset = Math.imul(seed ^ (seed >>> 16), 0x45d9f3b) >>> 0;
  const readers = Array.from(
    { length: Math.min(3, catalog.reciters.length) },
    (unused, i) => catalog.reciters[(readerOffset + i) % catalog.reciters.length],
  );
  for (const chapter of chapters) {
    for (const reader of readers) {
      try {
        const data = await cached(env, `timing:${reader.id}:${chapter.id}`, () =>
          content(`audio/reciters/${reader.id}/audio_files?chapter=${chapter.id}&segments=true`),
        );
        const audio = list<Record<string, unknown>>(data.audio_files)[0];
        if (typeof audio?.audio_url !== 'string') continue;
        const timings = list<Record<string, unknown>>(audio.verse_timings);
        const windows: AutomationCandidate[] = [];
        for (let start = 0; start < timings.length; start += 1) {
          const from = Number(String(timings[start].verse_key).split(':')[1]);
          const begin = Number(timings[start].timestamp_from);
          if (!Number.isInteger(from) || from < 1 || !Number.isFinite(begin)) continue;
          for (let end = start; end < Math.min(timings.length, start + 40); end += 1) {
            const current = timings[end];
            const previous = end > start ? Number(timings[end - 1].timestamp_to) : begin;
            const finish = Number(current.timestamp_to);
            const at = Number(current.timestamp_from);
            if (
              current.verse_key !== `${chapter.id}:${from + end - start}` ||
              !Number.isFinite(at) ||
              !Number.isFinite(finish) ||
              finish <= at ||
              at < previous - 1
            ) {
              break;
            }
            const durationMs = finish - begin;
            if (durationMs > 70000) break;
            const to = from + end - start;
            if (
              durationMs >= 30000 &&
              !recent.some((r) => r.chapterId === chapter.id && r.from <= to && r.to >= from)
            ) {
              windows.push({
                id: `${chapter.id}:${from}-${to}:${reader.id}`,
                chapterId: chapter.id,
                from,
                to,
                reciterId: reader.id,
                reciter: reader.name,
                chapter: chapter.name,
                durationMs,
              });
              break;
            }
          }
        }
        if (windows.length) {
          candidates.push(windows[seed % windows.length]);
          if (windows.length > 1) {
            candidates.push(windows[(seed + Math.floor(windows.length / 2)) % windows.length]);
          }
        }
      } catch {
        // Missing source recordings are excluded before selection; selected audio is never replaced.
      }
    }
  }
  assert(candidates.length > 0, 'AUTOMATION_NO_CANDIDATES', 503);
  return candidates.slice(0, 12);
};
