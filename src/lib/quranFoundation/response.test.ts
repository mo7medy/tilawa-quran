// @vitest-environment node
/* eslint-disable @typescript-eslint/naming-convention -- External API fixtures. */
/* eslint-disable react-func/max-lines-per-function */
import { describe, expect, it } from 'vitest';

import { adaptFoundationResponse } from './response';
import { mapFoundationRoute } from './routes';

describe('reader response compatibility', () => {
  it('wraps a single chapter audio file in the reader collection', () => {
    const file = { audio_url: 'https://audio.test/1.mp3', chapter_id: 1 };
    expect(
      adaptFoundationResponse(
        { audio_file: file },
        mapFoundationRoute('content/api/qdc/audio/reciters/7/audio_files?chapter=1'),
      ).audio_files,
    ).toEqual([expect.objectContaining(file)]);
  });
  it('adapts v4 audio timestamps for synchronized verse playback', () => {
    const body = adaptFoundationResponse(
      {
        audio_file: {
          timestamps: [
            { verse_key: '1:1', timestamp_from: 0, timestamp_to: 6493, duration: -6493 },
          ],
        },
      },
      mapFoundationRoute('content/api/qdc/audio/reciters/7/audio_files?chapter=1&segments=true'),
    );
    expect(body.audio_files).toEqual([
      expect.objectContaining({
        duration: 6493,
        verse_timings: [expect.objectContaining({ verse_key: '1:1', duration: 6493 })],
      }),
    ]);
  });
  it('maps chapter reciters to the existing reader shape', () => {
    const body = adaptFoundationResponse(
      { reciters: [{ id: 7, reciter_name: 'Reader' }] },
      mapFoundationRoute('content/api/qdc/audio/reciters/7'),
    );
    expect(body.reciter).toMatchObject({
      id: 7,
      name: 'Reader',
      translated_name: { name: 'Reader' },
    });
  });
  it('filters translation metadata by the requested resource IDs', () => {
    const body = adaptFoundationResponse(
      { translations: [{ id: 1 }, { id: 2 }] },
      mapFoundationRoute('content/api/qdc/resources/translations/filter?translations=2'),
    );
    expect(body.translations).toEqual([{ id: 2 }]);
  });
  it('reports a missing reciter rather than returning an incomplete success response', () => {
    expect(() =>
      adaptFoundationResponse(
        { reciters: [] },
        mapFoundationRoute('content/api/qdc/audio/reciters/7'),
      ),
    ).toThrow('Reciter not found');
  });
  it('preserves Quran text and attaches missing verse identity to words', () => {
    const body = adaptFoundationResponse(
      { verses: [{ verse_key: '2:1', words: [{ text_qpc_hafs: 'الم' }] }] },
      mapFoundationRoute('content/api/qdc/verses/by_page/2'),
    );
    expect(body.verses[0]).toMatchObject({
      chapter_id: '2',
      words: [{ verse_key: '2:1', qpc_uthmani_hafs: 'الم' }],
    });
  });
});
