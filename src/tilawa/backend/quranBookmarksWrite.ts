/* eslint-disable react-func/max-lines-per-function -- Declarative form fields and explicit protocol mappings are kept together for auditability. */
/* eslint-disable no-restricted-syntax -- Server-side bounded loops preserve command order and cap upstream request concurrency. */
/* eslint-disable no-await-in-loop -- Sequential bounded operations preserve order and avoid bursts of upstream requests. */
/* eslint-disable import/prefer-default-export -- Named backend entrypoints make route and domain imports explicit. */
import type { Row } from './mappers';
import type { BookmarkContext } from './quranBookmarkContext';
import type { QuranContext } from './quranContext';

export const quranBookmarksWrite = async (
  context: QuranContext & BookmarkContext,
): Promise<void> => {
  const { req, res, path, body, command, bookmarks, toBookmark } = context;
  if (path[0] === 'collections' && path[2] === 'bookmarks') {
    if (req.method === 'DELETE') {
      const existingBookmark = path[3]
        ? bookmarks.find((b) => b.id === path[3])
        : bookmarks.find(
            (b) =>
              b.key === body.key && b.type === body.type && b.verse_number === body.verseNumber,
          );
      if (existingBookmark) {
        await command('collection.unlink', {
          collectionId: path[1],
          bookmarkId: existingBookmark.id,
        });
      }
      res.json({ success: true });
      return;
    }
    const items = Array.isArray(body.bookmarks) ? (body.bookmarks as Row[]) : [body];
    for (const item of items) {
      await command('bookmark.save', {
        ...item,
        mushaf: body.mushaf ?? 1,
        collectionId: path[1],
      });
    }
    res.json({ added: items.length, skipped: 0, success: true });
    return;
  }
  if (path[0] === 'collections') {
    const value = await command(req.method === 'DELETE' ? 'collection.delete' : 'collection.save', {
      ...body,
      ...(path[1] ? { id: path[1] } : {}),
    });
    res.json(
      value.id
        ? {
            ...value,
            isDefault: value.is_default,
            updatedAt: value.updated_at,
            url: `/collections/${value.id}`,
          }
        : { success: true },
    );
    return;
  }
  const value = await command(req.method === 'DELETE' ? 'bookmark.delete' : 'bookmark.save', {
    ...body,
    ...(path[1] ? { id: path[1] } : {}),
  });
  res.json(value.id ? toBookmark(value) : { success: true });
};
