import { StudioFont, StudioWord } from './contracts';
import { StudioError } from './validation';

import { MushafLines, QuranFont } from '@/types/QuranReader';

export const fontFamily = (font: StudioFont, page = 0): string => {
  if (font === QuranFont.QPCHafs) return 'StudioHafs';
  if (font === QuranFont.IndoPak) return 'StudioIndopak';
  return `Studio-${font}-${page}`;
};

export const fontPath = (font: StudioFont, page = 0): string => {
  if (font === QuranFont.QPCHafs) return '/fonts/quran/hafs/uthmanic_hafs/UthmanicHafs1Ver18.woff2';
  if (font === QuranFont.IndoPak) {
    return '/fonts/quran/hafs/nastaleeq/indopak/indopak-nastaleeq-waqf-lazim-v4.2.1.woff2';
  }
  const version = {
    [QuranFont.MadaniV1]: 'v1',
    [QuranFont.MadaniV2]: 'v2',
    [QuranFont.TajweedV4]: 'v4/colrv1',
  }[font];
  return `/fonts/quran/hafs/${version}/woff2/p${page}.woff2`;
};
export const resolveWord = (
  word: Record<string, unknown>,
  font: StudioFont,
  lines: MushafLines = MushafLines.FifteenLines,
): StudioWord => {
  const field = {
    [QuranFont.MadaniV1]: 'code_v1',
    [QuranFont.MadaniV2]: 'code_v2',
    [QuranFont.TajweedV4]: 'code_v2',
    [QuranFont.IndoPak]: 'text_indopak',
    [QuranFont.QPCHafs]: 'qpc_uthmani_hafs',
  }[font];
  const text =
    font === QuranFont.IndoPak && word.char_type_name === 'end'
      ? word.qpc_uthmani_hafs
      : word[field];
  const maxPages =
    font === QuranFont.IndoPak
      ? { [MushafLines.FifteenLines]: 610, [MushafLines.SixteenLines]: 548 }[lines]
      : 604;
  if (
    typeof text !== 'string' ||
    !text ||
    !Number.isInteger(word.page_number) ||
    Number(word.page_number) < 1 ||
    Number(word.page_number) > maxPages
  ) {
    throw new StudioError('FONT_DATA_UNAVAILABLE');
  }
  return { text, page: Number(word.page_number), end: word.char_type_name === 'end' };
};
