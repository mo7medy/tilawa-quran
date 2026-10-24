/* eslint-disable react-func/max-lines-per-function -- Validate all fields before returning a normalized versioned specification. */
import { defaultSpec, STUDIO_FONTS, VideoProjectSpec } from './contracts';

import { MushafLines } from '@/types/QuranReader';

export class StudioError extends Error {
  constructor(public code: string, public status = 422) {
    super(code);
  }
}
export const assert = (condition: unknown, code: string, status = 422): void => {
  if (!condition) throw new StudioError(code, status);
};
export const record = (value: unknown): Record<string, unknown> => {
  assert(value && typeof value === 'object' && !Array.isArray(value), 'INVALID_INPUT');
  return value as Record<string, unknown>;
};
const integer = (value: unknown, min: number, max: number): number => {
  assert(
    typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max,
    'INVALID_INPUT',
  );
  return value as number;
};
const decimal = (value: unknown, min: number, max: number): number => {
  assert(
    typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max,
    'INVALID_INPUT',
  );
  return value as number;
};
const choice = <T extends string | number>(value: unknown, allowed: readonly T[]): T => {
  assert(allowed.includes(value as T), 'INVALID_INPUT');
  return value as T;
};
export const validateSpec = (input: unknown): VideoProjectSpec => {
  const d = record(input);
  const bg = record(d.background);
  const color = (v: unknown): string => {
    assert(typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v), 'INVALID_COLOR');
    return v as string;
  };
  const backgroundType = choice(bg.type, ['color', 'library', 'upload'] as const);
  assert(typeof bg.value === 'string' && bg.value.length <= 64, 'INVALID_BACKGROUND');
  if (backgroundType === 'color') color(bg.value);
  else assert(/^[a-zA-Z0-9_-]+$/.test(bg.value as string), 'INVALID_BACKGROUND');
  const from = integer(d.from, 1, 286);
  const to = integer(d.to, from, 286);
  assert(
    d.version === '1' && typeof d.title === 'string' && d.title.length <= 100,
    'INVALID_INPUT',
  );
  return {
    ...defaultSpec,
    version: '1',
    title: (d.title as string).trim(),
    chapterId: integer(d.chapterId, 1, 114),
    from,
    to,
    reciterId: integer(d.reciterId, 1, 10000),
    translationId: d.translationId === null ? null : integer(d.translationId, 1, 10000),
    font: choice(d.font, STUDIO_FONTS),
    mushafLines: choice(d.mushafLines, Object.values(MushafLines)),
    fontSize: integer(d.fontSize, 24, 120),
    translationSize: integer(d.translationSize, 18, 80),
    lineHeight: decimal(d.lineHeight, 1.2, 2.5),
    color: color(d.color),
    alignment: choice(d.alignment, ['center', 'justify']),
    template: choice(d.template, ['center', 'card', 'translation']),
    ratio: choice(d.ratio, ['portrait', 'square', 'landscape']),
    quality: choice(d.quality, [720, 1080]),
    background: {
      type: backgroundType,
      value: bg.value as string,
      opacity: decimal(bg.opacity, 0, 0.85),
      position: integer(bg.position, 0, 100),
    },
  };
};
export const policy = (
  registered: boolean,
): {
  daily: number;
  durationMs: number;
  artifactMs: number;
  projectMs: number;
  storage: number;
} => ({
  daily: registered ? 10 : 2,
  durationMs: registered ? 180000 : 60000,
  artifactMs: (registered ? 7 : 1) * 86400000,
  projectMs: (registered ? 30 : 1) * 86400000,
  storage: (registered ? 1024 : 100) * 1024 * 1024,
});
export const cairoDay = (at = Date.now()): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at);
export const nextCairoDay = (at = Date.now()): number => {
  let low = at;
  let high = at + 26 * 3600000;
  while (high - low > 1000) {
    const mid = Math.floor((low + high) / 2);
    if (cairoDay(mid) === cairoDay(at)) low = mid;
    else high = mid;
  }
  return high;
};
