/* eslint-disable no-restricted-syntax -- Server-side bounded loops preserve command order and cap upstream request concurrency. */
/* eslint-disable no-nested-ternary -- Small enum/label selections keep existing UI and wire-state mappings adjacent. */
import { rangeSpan, verseKey } from './quranRanges';

import { fetchQuranFoundation } from '@/lib/quranFoundation/client';

// Public verse metadata only; account data and credentials never enter this cache.
const cache = new Map<string, { page: number; until: number }>();
export const pageForVerse = async (key: string, mushaf: number): Promise<number> => {
  rangeSpan(key);
  const cacheKey = `${mushaf}:${key}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.until > Date.now()) return cached.page;
  const response = await fetchQuranFoundation(
    `/content/api/v4/pages/lookup?mushaf=${mushaf}&from=${key}&to=${key}`,
  );
  if (!response.ok) throw new Error('QURAN_METADATA_UNAVAILABLE');
  const body = await response.json();
  const page = Math.min(...Object.keys(body.pages ?? {}).map(Number));
  if (
    !Number.isInteger(page) ||
    page < 1 ||
    page > (mushaf === 6 ? 610 : mushaf === 7 ? 548 : 604)
  ) {
    throw new Error('QURAN_METADATA_UNAVAILABLE');
  }
  if (cache.size >= 1000) cache.delete(cache.keys().next().value);
  cache.set(cacheKey, { page, until: Date.now() + 12 * 60 * 60 * 1000 });
  return page;
};
// Distinct Mushaf pages touched by the supplied verse ranges.
export const pageNumbersForRanges = async (ranges: string[], mushaf: number): Promise<number[]> => {
  const pages = new Set<number>();
  for (const range of ranges) {
    const [a, b] = rangeSpan(range);
    // Sequential ranges bound upstream request concurrency and reuse public metadata.
    // eslint-disable-next-line no-await-in-loop
    const [first, last] = await Promise.all([
      pageForVerse(verseKey(a), mushaf),
      pageForVerse(verseKey(b), mushaf),
    ]);
    for (let page = first; page <= last; page += 1) pages.add(page);
  }
  return Array.from(pages);
};

export const pagesForRanges = async (ranges: string[], mushaf: number): Promise<number> =>
  (await pageNumbersForRanges(ranges, mushaf)).length;
