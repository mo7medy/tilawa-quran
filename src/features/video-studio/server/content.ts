/* eslint-disable react-func/max-lines-per-function -- Canonical source resolution verifies the entire passage before producing an immutable manifest. */
/* eslint-disable @typescript-eslint/naming-convention -- Preserve standard HTTP headers, provider payloads and D1 column names at the boundary. */
import {
  dimensions,
  RENDER_VERSION,
  ResolvedVideoManifest,
  StudioOwner,
  VideoProjectSpec,
} from '../contracts';
import { resolveWord } from '../typography';
import { assert, policy } from '../validation';

import { content, list, assetIndex } from './contentSources';
import { resolveBackground } from './manifestBackground';
import { resolveFonts } from './manifestFonts';
import { StudioEnv } from './runtime';

import { MushafLines } from '@/types/QuranReader';
import { getDefaultWordFields, getMushafId } from '@/utils/api';
import { getAllChaptersData } from '@/utils/chapter';
import { stripHtml } from '@/utils/string';

export { catalog, assetIndex } from './contentSources';
export const resolveManifest = async (
  env: StudioEnv,
  owner: StudioOwner,
  spec: VideoProjectSpec,
): Promise<ResolvedVideoManifest> => {
  const chapters = await getAllChaptersData('en');
  assert(spec.to <= chapters[String(spec.chapterId)].versesCount, 'INVALID_VERSE_RANGE');
  const fields = getDefaultWordFields(spec.font).wordFields;
  const { mushaf } = getMushafId(spec.font, spec.mushafLines as MushafLines);
  const q = new URLSearchParams({
    from: `${spec.chapterId}:${spec.from}`,
    to: `${spec.chapterId}:${spec.to}`,
    words: 'true',
    word_fields: fields,
    mushaf: String(mushaf),
    per_page: 'all',
    ...(spec.translationId ? { translations: String(spec.translationId) } : {}),
  });
  const [data, recording, index] = await Promise.all([
    content(`verses/by_range?${q}`),
    content(`audio/reciters/${spec.reciterId}/audio_files?chapter=${spec.chapterId}&segments=true`),
    assetIndex(env),
  ]);
  const audio = list<Record<string, unknown>>(recording.audio_files)[0];
  assert(audio && typeof audio.audio_url === 'string', 'AUDIO_UNAVAILABLE');
  const audioUrl = new URL(audio.audio_url as string, 'https://download.quranicaudio.com');
  assert(
    audioUrl.protocol === 'https:' &&
      [
        'download.quranicaudio.com',
        'audio.qurancdn.com',
        'verses.quran.com',
        'static.qurancdn.com',
      ].includes(audioUrl.hostname),
    'AUDIO_UNAVAILABLE',
  );
  const timings = list<Record<string, unknown>>(audio.verse_timings);
  const verses = list<Record<string, unknown>>(data.verses);
  assert(verses.length === spec.to - spec.from + 1, 'CONTENT_INCOMPLETE');
  const first = timings.find((v) => v.verse_key === `${spec.chapterId}:${spec.from}`);
  const last = timings.find((v) => v.verse_key === `${spec.chapterId}:${spec.to}`);
  const startMs = Number(first?.timestamp_from);
  const endMs = Number(last?.timestamp_to);
  assert(
    Number.isFinite(startMs) && Number.isFinite(endMs) && startMs >= 0 && endMs > startMs,
    'TIMING_UNAVAILABLE',
  );
  assert(endMs - startMs <= policy(owner.registered).durationMs, 'DURATION_LIMIT');
  const resolved = verses.map((verse, i) => {
    const key = `${spec.chapterId}:${spec.from + i}`;
    assert(verse.verse_key === key, 'CONTENT_INCOMPLETE');
    const timing = timings.find((t) => t.verse_key === key);
    const from = Number(timing?.timestamp_from);
    const to = Number(timing?.timestamp_to);
    assert(
      Number.isFinite(from) && Number.isFinite(to) && from >= startMs && to > from && to <= endMs,
      'TIMING_UNAVAILABLE',
    );
    const words = list<Record<string, unknown>>(verse.words)
      .filter((w) => w.char_type_name === 'word' || w.char_type_name === 'end')
      .map((w) => resolveWord(w, spec.font, spec.mushafLines));
    assert(words.length > 0, 'CONTENT_INCOMPLETE');
    const translations = verse.translations as { resource_id: number; text: string }[] | undefined;
    const translation = spec.translationId
      ? translations?.find((t) => t.resource_id === spec.translationId)?.text
      : '';
    assert(!spec.translationId || typeof translation === 'string', 'TRANSLATION_UNAVAILABLE');
    return {
      key,
      words,
      translation: stripHtml((translation ?? '').replace(/<sup[^>]*>[\s\S]*?<\/sup>/gi, '')),
      startMs: from - startMs,
      endMs: to - startMs,
    };
  });
  resolved.forEach((v, i) =>
    assert(!i || v.startMs >= resolved[i - 1].endMs, 'TIMING_UNAVAILABLE'),
  );
  return {
    version: '1',
    renderVersion: RENDER_VERSION,
    spec,
    verses: resolved,
    fonts: await resolveFonts(env, spec, resolved, index),
    audio: { url: audioUrl.href, startMs, endMs },
    background: await resolveBackground(env, owner, spec, index),
    durationMs: endMs - startMs,
    ...dimensions(spec),
    fps: 30,
  };
};
