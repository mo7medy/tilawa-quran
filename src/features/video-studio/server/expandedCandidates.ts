/* eslint-disable import/prefer-default-export -- Named content-resolution helper. */
/* eslint-disable no-await-in-loop, no-restricted-syntax, no-continue -- Bounded sequential metadata requests stay under Workers connection limits. */
/* eslint-disable react-func/max-lines-per-function -- Validate contiguous source timings before offering any model candidate. */
import { StudioCatalog } from '../contracts';
import { assert } from '../validation';

import type { AutomationCandidate, cachedAutomationContent } from './automationCandidates';
import { AUTOMATION_FEATURED_PASSAGES, automationReaders } from './automationPreferences';
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
  const featured = AUTOMATION_FEATURED_PASSAGES.filter(
    ([id, from, to]) =>
      catalog.chapters.some((c) => c.id === id) &&
      !recent.some((r) => r.chapterId === id && r.from <= to && r.to >= from),
  );
  const featuredChapters = featured.length
    ? Array.from(
        new Set(featured.map((unused, i) => featured[(seed + i) % featured.length][0])),
      ).slice(0, 2)
    : [];
  const rotated = Array.from(
    { length: catalog.chapters.length },
    (unused, i) => catalog.chapters[(seed + i) % catalog.chapters.length].id,
  );
  const chapters = Array.from(new Set([...featuredChapters, ...rotated]))
    .slice(0, 3)
    .map((id) => catalog.chapters.find((c) => c.id === id));
  const readers = automationReaders(catalog, seed);
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
          const anchor = featured.find(([id, first]) => id === chapter.id && first === from);
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
              (!anchor || to >= anchor[2]) &&
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
                ...(anchor ? { familiar: true } : {}),
              });
              break;
            }
          }
        }
        if (windows.length) {
          const familiar = windows.filter((w) => w.familiar);
          const choices = familiar.length ? familiar : windows;
          candidates.push(choices[seed % choices.length]);
        }
      } catch {
        // Missing source recordings are excluded before selection; selected audio is never replaced.
      }
    }
  }
  assert(candidates.length > 0, 'AUTOMATION_NO_CANDIDATES', 503);
  return candidates.slice(0, 12);
};
