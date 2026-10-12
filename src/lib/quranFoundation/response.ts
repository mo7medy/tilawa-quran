/* eslint-disable @typescript-eslint/naming-convention -- Preserve the upstream JSON schema before camelizeKeys. */
import { QuranFoundationError } from './config';
import type { FoundationRoute } from './routes';

export interface FoundationBody {
  [key: string]: unknown;
  verses?: Record<string, unknown>[];
  pagination?: {
    next_page?: number | null;
    current_page?: number;
    total_pages?: number;
    per_page?: number;
    total_records?: number;
  };
}

// eslint-disable-next-line react-func/max-lines-per-function
export const adaptFoundationResponse = (
  body: FoundationBody,
  route: FoundationRoute,
): FoundationBody => {
  const adapted = { ...body };
  if (route.responseKind === 'audioFile' && body.audio_file) {
    const file = body.audio_file as Record<string, unknown>;
    const timestamps = file.timestamps as Record<string, unknown>[] | undefined;
    adapted.audio_files = [
      {
        ...file,
        verse_timings:
          file.verse_timings ||
          timestamps?.map((timing) => ({
            ...timing,
            duration: Number(timing.timestamp_to) - Number(timing.timestamp_from),
          })),
        duration:
          file.duration ||
          (timestamps?.length
            ? Math.max(...timestamps.map((timing) => Number(timing.timestamp_to)))
            : undefined),
      },
    ];
  }
  if (route.responseKind === 'reciters' || route.responseKind === 'reciter') {
    const reciters = (body.reciters || body.chapter_reciters) as Record<string, unknown>[];
    if (Array.isArray(reciters)) {
      const normalized = reciters.map((reciter) => ({
        ...reciter,
        id: reciter.id,
        name: reciter.name || reciter.reciter_name,
        translated_name: reciter.translated_name || { name: reciter.name || reciter.reciter_name },
      }));
      if (route.responseKind === 'reciter') {
        adapted.reciter = normalized.find((reciter) => String(reciter.id) === route.resourceId);
        if (!adapted.reciter) {
          throw new QuranFoundationError('Reciter not found.', 404);
        }
      } else {
        adapted.reciters = normalized;
      }
    }
  }
  if (route.responseKind === 'translations' && Array.isArray(body.translations)) {
    const ids = (route.query.get('translations') || '').split(',').map((id) => id.trim());
    adapted.translations = body.translations.filter((translation: Record<string, unknown>) =>
      ids.includes(String(translation.id)),
    );
  }
  if (body.verses) {
    adapted.verses = body.verses.map((verse) => {
      const chapterId = verse.chapter_id || String(verse.verse_key).split(':')[0];
      const words = verse.words as Record<string, unknown>[] | undefined;
      return {
        ...verse,
        chapter_id: chapterId,
        words: words?.map((word) => ({
          ...word,
          verse_key: word.verse_key || verse.verse_key,
          qpc_uthmani_hafs: word.qpc_uthmani_hafs || word.text_qpc_hafs,
        })),
      };
    });
  }
  return adapted;
};
