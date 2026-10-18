/* eslint-disable no-nested-ternary -- Small enum/label selections keep existing UI and wire-state mappings adjacent. */
/* eslint-disable import/prefer-default-export -- Named backend entrypoints make route and domain imports explicit. */
import type { NextApiRequest, NextApiResponse } from 'next';

import { object } from './mappers';
import { pageForVerse } from './quranPages';
import { verseOrdinal } from './quranRanges';

import { fetchQuranFoundation } from '@/lib/quranFoundation/client';
import { BackendError } from '@/lib/supabase/server';

/** Map public Hafs verse positions between the layouts supported by this reader. */
export const handleMushafMapping = async (
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> => {
  const body = object(req.body);
  const source = Number(body.sourceMushaf);
  const target = Number(body.targetMushaf);
  if (
    ![1, 2, 3, 4, 5, 6, 7, 11, 19].includes(source) ||
    ![1, 2, 3, 4, 5, 6, 7, 11, 19].includes(target)
  ) {
    throw new BackendError('INVALID_MUSHAF', 422);
  }
  if (body.type === 'verse') {
    const key = `${Number(body.surah)}:${Number(body.verse)}`;
    verseOrdinal(key);
    res.json({
      success: true,
      data: {
        sourceMushafId: source,
        targetMushafId: target,
        sourceVerse: { surahNumber: Number(body.surah), verseNumber: Number(body.verse) },
        targetVerses: [
          {
            surahNumber: Number(body.surah),
            verseNumber: Number(body.verse),
            pageNumber: await pageForVerse(key, target),
          },
        ],
      },
    });
    return;
  }
  const page = Number(body.sourcePage);
  const max = source === 6 ? 610 : source === 7 ? 548 : 604;
  if (body.type !== 'page' || !Number.isInteger(page) || page < 1 || page > max) {
    throw new BackendError('INVALID_PAGE', 422);
  }
  const response = await fetchQuranFoundation(
    `/content/api/v4/pages/lookup?mushaf=${source}&page_number=${page}`,
  );
  if (!response.ok) throw new BackendError('QURAN_METADATA_UNAVAILABLE', 503);
  const data = await response.json();
  const first = data.pages?.[String(page)]?.from ?? data.lookup_range?.from;
  if (typeof first !== 'string') throw new BackendError('QURAN_METADATA_UNAVAILABLE', 503);
  res.json({
    success: true,
    data: {
      sourcePageNumber: page,
      sourceMushafId: source,
      targetMushafId: target,
      targetPageNumber: await pageForVerse(first, target),
      firstVerseKey: first,
    },
  });
};
