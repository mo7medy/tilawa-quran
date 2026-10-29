/* eslint-disable @typescript-eslint/naming-convention, react-func/max-lines-per-function -- Source API timing fixtures and bounded scenario setup. */
// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { StudioCatalog } from '../contracts';

import type { cachedAutomationContent } from './automationCandidates';
import { expandedCandidates } from './expandedCandidates';
import { StudioEnv } from './runtime';

const catalog: StudioCatalog = {
  enabled: true,
  chapters: [{ id: 3, name: 'Ali Imran', count: 200 }],
  reciters: [{ id: 7, name: 'Reader' }],
  translations: [],
  backgrounds: [],
};
const metadata = (length = 100): Record<string, unknown> => ({
  audio_files: [
    {
      audio_url: 'https://audio.qurancdn.com/recording.mp3',
      verse_timings: Array.from({ length }, (unused, i) => ({
        verse_key: `3:${i + 1}`,
        timestamp_from: i * 10000,
        timestamp_to: (i + 1) * 10000,
      })),
    },
  ],
});
const cache = (value: Record<string, unknown>): typeof cachedAutomationContent =>
  (async () => value) as typeof cachedAutomationContent;

describe('expanded timing-derived candidates', () => {
  it('offers contiguous whole-ayah windows outside the old fixed passage list and excludes three-day overlap', async () => {
    const candidates = await expandedCandidates(
      {} as StudioEnv,
      catalog,
      51,
      [{ chapterId: 3, from: 1, to: 50 }],
      cache(metadata()),
    );
    expect(candidates.length).toBeGreaterThan(0);
    candidates.forEach((c) => {
      expect(c.chapterId).toBe(3);
      expect(c.from).toBeGreaterThan(50);
      expect(c.to - c.from).toBe(2);
      expect(c.durationMs).toBe(30000);
    });
  });
  it('refuses a missing ayah, a non-finite timestamp, and recordings shorter than thirty seconds', async () => {
    const data = metadata(3);
    const file = (data.audio_files as { verse_timings: Record<string, unknown>[] }[])[0];
    file.verse_timings[1].verse_key = '3:99';
    await expect(
      expandedCandidates({} as StudioEnv, catalog, 0, [], cache(data)),
    ).rejects.toMatchObject({ code: 'AUTOMATION_NO_CANDIDATES' });
    file.verse_timings[1].verse_key = '3:2';
    file.verse_timings[1].timestamp_from = 'invalid';
    await expect(
      expandedCandidates({} as StudioEnv, catalog, 0, [], cache(data)),
    ).rejects.toMatchObject({ code: 'AUTOMATION_NO_CANDIDATES' });
    await expect(
      expandedCandidates({} as StudioEnv, catalog, 0, [], cache(metadata(2))),
    ).rejects.toMatchObject({ code: 'AUTOMATION_NO_CANDIDATES' });
  });
});
