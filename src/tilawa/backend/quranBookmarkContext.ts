import type { Row } from './mappers';
import { bookmark } from './quranCommon';
import type { QuranContext } from './quranContext';

export const bookmarkContext = async (context: QuranContext) => {
  const { read, query, body } = context;

  const bookmarks = await read('quran_bookmarks');
  const memberships = await read('quran_collection_bookmarks');
  const collections = await read('quran_collections');
  const mushaf = Number(query.mushafId ?? body.mushaf ?? 1);
  const toBookmark = (b: Row): Row => ({
    ...bookmark(b),
    collectionsCount: memberships.filter((m) => m.bookmark_id === b.id).length,
    isInDefaultCollection: memberships.some(
      (m) =>
        m.bookmark_id === b.id && collections.some((c) => c.id === m.collection_id && c.is_default),
    ),
  });
  const toCollection = (c: Row): Row => ({
    id: c.id,
    name: c.name,
    isDefault: c.is_default,
    updatedAt: c.updated_at,
    url: `/collections/${c.id}`,
    count: memberships.filter((m) => m.collection_id === c.id).length,
    bookmarksCount: memberships.filter((m) => m.collection_id === c.id).length,
  });
  return { ...context, bookmarks, memberships, collections, mushaf, toBookmark, toCollection };
};
export type BookmarkContext = Awaited<ReturnType<typeof bookmarkContext>>;
