/* eslint-disable react-func/max-lines-per-function -- Declarative form fields and explicit protocol mappings are kept together for auditability. */
/* eslint-disable import/prefer-default-export -- Named backend entrypoints make route and domain imports explicit. */
import type { Row } from './mappers';
import { page, text } from './quranCommon';
import type { QuranContext } from './quranContext';
import { rangeContains, rangeSpan, verseKey } from './quranRanges';

import { BackendError } from '@/lib/supabase/server';

export const quranNotes = async (context: QuranContext): Promise<void> => {
  const { req, res, path, get, body, query, read, command } = context;

  if (query.entityId || query.entityType) throw new BackendError('FEATURE_NOT_AVAILABLE', 503);
  const notes = await read('quran_notes');
  let ranges = await read('quran_note_ranges');
  const toNote = (n: Row): Row => ({
    id: n.id,
    title: n.title,
    body: n.body,
    ranges: ranges.filter((r) => r.note_id === n.id).map((r) => r.range),
    createdAt: n.created_at,
    updatedAt: n.updated_at,
    saveToQR: false,
    attachedEntities: [],
  });
  if (path[2] === 'publish' || body.saveToQR === true) {
    throw new BackendError('EXTERNAL_PUBLISHING_NOT_AVAILABLE', 503);
  }
  if (get) {
    if (path[1] === 'by-verse') {
      res.json(
        notes
          .filter((n) =>
            ranges.some((r) => r.note_id === n.id && rangeContains(text(r.range), path[2])),
          )
          .map(toNote),
      );
      return;
    }
    if (path[1] === 'count-within-range') {
      const [start, end] = rangeSpan(`${query.from}-${query.to}`);
      if (end - start > 300) throw new BackendError('INVALID_RANGE', 422);
      res.json(
        Object.fromEntries(
          Array.from({ length: end - start + 1 }, (unused, offset) => {
            const key = verseKey(start + offset);
            return [
              key,
              notes.filter((n) =>
                ranges.some((r) => r.note_id === n.id && rangeContains(text(r.range), key)),
              ).length,
            ];
          }),
        ),
      );
      return;
    }
    if (path[1]) {
      const selectedNote = notes.find((n) => n.id === path[1]);
      if (!selectedNote) throw new BackendError('NOT_FOUND', 404);
      res.json(toNote(selectedNote));
      return;
    }
    res.json(
      page(
        notes.sort((a, b) => text(b.updated_at).localeCompare(text(a.updated_at))).map(toNote),
        query,
      ),
    );
    return;
  }
  const value = await command(req.method === 'DELETE' ? 'note.delete' : 'note.save', {
    ...body,
    ...(path[1] ? { id: path[1] } : {}),
  });
  if (value.id) ranges = await read('quran_note_ranges');
  res.json(value.id ? toNote(value) : { success: true });
};
