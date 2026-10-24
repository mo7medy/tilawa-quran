/* eslint-disable react-func/max-lines-per-function -- Table-driven input and source glyph scenarios keep their acceptance assertions together. */
/* eslint-disable @typescript-eslint/naming-convention -- Preserve standard HTTP headers, provider payloads and D1 column names at the boundary. */
import { describe, expect, it } from 'vitest';

import { defaultSpec, dimensions, STUDIO_FONTS } from './contracts';
import { fontFamily, fontPath, resolveWord } from './typography';
import { cairoDay, nextCairoDay, policy, validateSpec } from './validation';

import { MushafLines, QuranFont } from '@/types/QuranReader';

describe('studio specifications and Cairo accounting', () => {
  it('uses independent defaults and validates all five existing Quran fonts', () => {
    STUDIO_FONTS.forEach((font) => expect(validateSpec({ ...defaultSpec, font }).font).toBe(font));
    expect(
      validateSpec({
        ...defaultSpec,
        font: QuranFont.IndoPak,
        mushafLines: MushafLines.SixteenLines,
      }).mushafLines,
    ).toBe(MushafLines.SixteenLines);
    expect(() => validateSpec({ ...defaultSpec, from: 9, to: 1 })).toThrow('INVALID_INPUT');
    expect(() => validateSpec({ ...defaultSpec, font: 'untrusted' })).toThrow('INVALID_INPUT');
    expect(() =>
      validateSpec({
        ...defaultSpec,
        background: { ...defaultSpec.background, value: 'https://untrusted.test' },
      }),
    ).toThrow();
    expect(() => validateSpec({ ...defaultSpec, lineHeight: NaN })).toThrow();
  });
  it('keeps output dimensions and retention limits explicit', () => {
    expect(dimensions(defaultSpec)).toEqual({ width: 1080, height: 1920 });
    expect(dimensions({ ratio: 'landscape', quality: 720 })).toEqual({ width: 1280, height: 720 });
    expect(dimensions({ ratio: 'square', quality: 1080 })).toEqual({ width: 1080, height: 1080 });
    expect(policy(false)).toMatchObject({
      daily: 2,
      durationMs: 60000,
      artifactMs: 86400000,
      projectMs: 86400000,
    });
    expect(policy(true)).toMatchObject({
      daily: 10,
      durationMs: 180000,
      artifactMs: 7 * 86400000,
      projectMs: 30 * 86400000,
    });
  });
  it.each([
    '2026-01-01T21:59:59Z',
    '2026-04-23T21:30:00Z',
    '2026-10-29T20:30:00Z',
    '2026-10-30T23:59:00Z',
  ])('finds the actual next Cairo date across DST: %s', (date) => {
    const now = Date.parse(date);
    const reset = nextCairoDay(now);
    expect(reset).toBeGreaterThan(now);
    expect(reset - now).toBeLessThanOrEqual(26 * 3600000);
    expect(cairoDay(reset - 1000)).toBe(cairoDay(now));
    expect(cairoDay(reset)).not.toBe(cairoDay(now));
  });
});
describe('Quran page glyphs', () => {
  it('keeps each word on its own source page and never silently substitutes glyphs', () => {
    const word = { code_v1: '\uE001', code_v2: '\uE002', page_number: 2, char_type_name: 'word' };
    expect(resolveWord(word, QuranFont.MadaniV1).text).toBe('\uE001');
    expect(resolveWord(word, QuranFont.TajweedV4).text).toBe('\uE002');
    expect(fontFamily(QuranFont.MadaniV2, 2)).not.toBe(fontFamily(QuranFont.MadaniV2, 3));
    expect(fontPath(QuranFont.TajweedV4, 2)).toContain('/v4/colrv1/woff2/p2.woff2');
    expect(() => resolveWord({ ...word, code_v1: undefined }, QuranFont.MadaniV1)).toThrow(
      'FONT_DATA_UNAVAILABLE',
    );
    expect(() => resolveWord({ ...word, page_number: 605 }, QuranFont.MadaniV1)).toThrow();
  });
  it('uses the existing Hafs font for IndoPak ayah markers', () => {
    expect(
      resolveWord(
        { text_indopak: 'x', qpc_uthmani_hafs: '۝', char_type_name: 'end', page_number: 1 },
        QuranFont.IndoPak,
      ),
    ).toEqual({ text: '۝', page: 1, end: true });
  });
});
