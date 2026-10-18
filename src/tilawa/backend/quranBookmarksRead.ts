/* eslint-disable react-func/max-lines-per-function -- Declarative form fields and explicit protocol mappings are kept together for auditability. */
/* eslint-disable import/prefer-default-export -- Named backend entrypoints make route and domain imports explicit. */
import type { BookmarkContext } from './quranBookmarkContext';
import { page } from './quranCommon';
import type { QuranContext } from './quranContext';
import { verseOrdinal } from './quranRanges';

import { BackendError } from '@/lib/supabase/server';

export const quranBookmarksRead = async (
  context: QuranContext & BookmarkContext,
): Promise<void> => {
  const { res, path, query, memberships, collections, mushaf, toBookmark, toCollection } = context;
  let { bookmarks } = context;

  bookmarks = bookmarks.filter((b) => b.mushaf_id === mushaf);
  if (path[0] === 'collections') {
    if (path.length === 1) {
      res.json({ data: collections.map(toCollection) });
      return;
    }
    const collection = collections.find((c) => c.id === path[1]);
    if (!collection && path[1] !== 'all') throw new BackendError('NOT_FOUND', 404);
    const items = bookmarks
      .filter(
        (b) =>
          path[1] === 'all' ||
          memberships.some((m) => m.collection_id === path[1] && m.bookmark_id === b.id),
      )
      .map(toBookmark);
    res.json({
      data: {
        collection: collection
          ? toCollection(collection)
          : { id: 'all', name: '', isDefault: false },
        bookmarks: page(items, query).data,
        isOwner: true,
      },
      pagination: page(items, query).pagination,
    });
    return;
  }
  if (query.type) bookmarks = bookmarks.filter((b) => b.type === query.type);
  if (query.key) bookmarks = bookmarks.filter((b) => b.key === Number(query.key));
  if (query.verseNumber) {
    bookmarks = bookmarks.filter((b) => b.verse_number === Number(query.verseNumber));
  }
  if (query.isReading !== undefined) {
    bookmarks = bookmarks.filter((b) => b.is_reading === (query.isReading === 'true'));
  }
  if (path[1] === 'ayahs-range') {
    const chapter = Number(query.chapterNumber);
    const first = verseOrdinal(`${chapter}:${query.verseNumber ?? 1}`);
    const last = first + Math.min(300, Number(query.perPage) || 20) - 1;
    res.json(
      Object.fromEntries(
        bookmarks
          .filter(
            (b) =>
              b.type === 'ayah' &&
              !b.is_reading &&
              verseOrdinal(`${b.key}:${b.verse_number}`) >= first &&
              verseOrdinal(`${b.key}:${b.verse_number}`) <= last,
          )
          .map((b) => [`${b.key}:${b.verse_number}`, toBookmark(b)]),
      ),
    );
    return;
  }
  if (path[1] === 'surah') {
    res.json(
      Object.fromEntries(
        bookmarks
          .filter((b) => b.type === 'ayah')
          .map((b) => [`${b.key}:${b.verse_number}`, toBookmark(b)]),
      ),
    );
    return;
  }
  if (path[1] === 'bookmark') {
    res.json(bookmarks[0] ? toBookmark(bookmarks[0]) : null);
    return;
  }
  if (path[1] === 'collections') {
    res.json(
      collections
        .filter((c) =>
          memberships.some(
            (m) => m.collection_id === c.id && bookmarks.some((b) => b.id === m.bookmark_id),
          ),
        )
        .map((c) => c.id),
    );
    return;
  }
  res.json(
    page(bookmarks.filter((b) => query.isReading !== undefined || !b.is_reading).map(toBookmark), {
      ...query,
      limit: query.limit ?? '100',
    }).data,
  );
};
