/* eslint-disable unicorn/no-array-reduce -- Interval union/subtraction are pure accumulator operations. */
import chapters from '../../../data/chapters/en.json';

type Span = [number, number];
const counts = Object.values(chapters).map((chapter) => chapter.versesCount);
export const verseOrdinal = (key: string): number => {
  if (!/^\d{1,3}:\d{1,3}$/.test(key)) throw new Error('INVALID_VERSE');
  const [chapter, verse] = key.split(':').map(Number);
  if (!counts[chapter - 1] || verse < 1 || verse > counts[chapter - 1]) {
    throw new Error('INVALID_VERSE');
  }
  return counts.slice(0, chapter - 1).reduce((sum, n) => sum + n, 0) + verse;
};
export const verseKey = (ordinal: number): string => {
  let remaining = Math.max(1, Math.min(6236, ordinal));
  let chapter = 0;
  while (remaining > counts[chapter]) {
    remaining -= counts[chapter];
    chapter += 1;
  }
  return `${chapter + 1}:${remaining}`;
};
export const rangeSpan = (range: string): Span => {
  const [start, rawEnd = start, extra] = range.split('-');
  const end = rawEnd.includes(':') ? rawEnd : `${start.split(':')[0]}:${rawEnd}`;
  const span: Span = [verseOrdinal(start), verseOrdinal(end)];
  if (extra || span[1] < span[0]) throw new Error('INVALID_RANGE');
  return span;
};
export const spanRange = ([start, end]: Span): string => `${verseKey(start)}-${verseKey(end)}`;
export const normalizeRange = (range: string): string => spanRange(rangeSpan(range));
export const mergeSpans = (spans: Span[]): Span[] =>
  spans
    .sort((a, b) => a[0] - b[0])
    .reduce<Span[]>((merged, span) => {
      const last = merged[merged.length - 1];
      if (last && span[0] <= last[1] + 1) last[1] = Math.max(last[1], span[1]);
      else merged.push([...span]);
      return merged;
    }, []);
export const subtractSpans = (targets: Span[], read: Span[]): Span[] =>
  read.reduce<Span[]>(
    (remaining, [a, b]) =>
      remaining.flatMap(([start, end]): Span[] => {
        if (b < start || a > end) return [[start, end]];
        return [
          ...(a > start ? [[start, a - 1] as Span] : []),
          ...(b < end ? [[b + 1, end] as Span] : []),
        ];
      }),
    targets.map((span) => [...span]),
  );
export const spanSize = (spans: Span[]): number =>
  mergeSpans(spans).reduce((sum, [a, b]) => sum + b - a + 1, 0);
export const rangeContains = (range: string, verse: string): boolean => {
  const [a, b] = rangeSpan(range);
  const v = verseOrdinal(verse);
  return v >= a && v <= b;
};
export const rangesOverlap = (a: string, b: string): boolean => {
  const [a1, a2] = rangeSpan(a);
  const [b1, b2] = rangeSpan(b);
  return a1 <= b2 && b1 <= a2;
};
