/* eslint-disable import/prefer-default-export -- Named backend entrypoints make route and domain imports explicit. */
import { text } from './quranCommon';
import type { QuranContext } from './quranContext';

export const quranSessions = async (context: QuranContext): Promise<void> => {
  const { res, get, body, read, command } = context;

  if (!get) await command('session.save', body);
  const sessions = (await read('quran_reading_sessions')).sort((a, b) =>
    text(b.updated_at).localeCompare(text(a.updated_at)),
  );
  res.json(
    sessions.map((s) => ({
      id: s.id,
      chapterNumber: s.chapter_number,
      verseNumber: s.verse_number,
      updatedAt: s.updated_at,
    })),
  );
};
