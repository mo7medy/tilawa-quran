/* eslint-disable react-func/max-lines-per-function -- Declarative form fields and explicit protocol mappings are kept together for auditability. */
/* eslint-disable no-nested-ternary -- Small enum/label selections keep existing UI and wire-state mappings adjacent. */
/* eslint-disable max-lines -- Keep this cohesive form or typed data contract together; reader services are split by feature. */
/* eslint-disable @typescript-eslint/naming-convention -- Preserve existing database, HTTP and translation-key contracts at the boundary. */
import { object, rows, string } from './mappers';
import type { Row } from './mappers';
import { pagesForRanges } from './quranPages';
import {
  mergeSpans,
  normalizeRange,
  rangeSpan,
  spanRange,
  spanSize,
  subtractSpans,
  verseKey,
} from './quranRanges';

const dayNumber = (date: string): number =>
  Math.floor(Date.parse(`${date.slice(0, 10)}T12:00:00Z`) / 86400000);
const dateAt = (day: number): string =>
  new Date(day * 86400000 + 12 * 3600000).toISOString().slice(0, 10);
const readRanges = (value: unknown): string[] =>
  Array.isArray(value) ? value.map(String).map(normalizeRange) : [];
export const localDate = (date: string | Date, zone: string): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: zone }).format(new Date(date));
export const estimatedWeek = (goal: Row, today: string): Row => {
  const duration = Number(goal.duration) || 1;
  const target = String(goal.amount ?? goal.target_amount ?? '');
  const range = goal.type === 'QURAN_RANGE' ? rangeSpan(target) : null;
  return {
    week: Array.from({ length: Math.min(7, goal.duration ? duration : 7) }, (unused, index) => {
      const start = range
        ? range[0] + Math.floor(((range[1] - range[0] + 1) * index) / duration)
        : 0;
      const end = range
        ? range[0] + Math.floor(((range[1] - range[0] + 1) * (index + 1)) / duration) - 1
        : 0;
      return {
        date: dateAt(dayNumber(today) + index),
        amount: range
          ? spanRange([Math.min(start, range[1]), Math.max(start, end)])
          : Number(target) / duration,
      };
    }),
  };
};
export const calculateStreak = (days: Row[], today: string): number => {
  const active = new Set(
    days
      .filter(
        (d) =>
          Number(d.secondsRead) > 0 || Number(d.pagesRead) > 0 || readRanges(d.ranges).length > 0,
      )
      .map((d) => string(d.date)),
  );
  let date = dayNumber(today);
  let count = 0;
  if (!active.has(today)) date -= 1;
  while (active.has(dateAt(date))) {
    count += 1;
    date -= 1;
  }
  return count;
};
export const quranProgress = async (
  goal: Row | undefined,
  activity: Row[],
  mushaf: number,
  today: string,
  zone: string,
): Promise<{ status: Row | null; days: Row[]; current: Row }> => {
  const start = goal ? localDate(string(goal.created_at), zone) : today;
  const duration = Number(goal?.duration) || 1;
  const target = Number(goal?.target_amount) || 0;
  const goalRange = goal?.type === 'QURAN_RANGE' ? rangeSpan(string(goal.target_amount)) : null;
  const input = rows(activity).filter((d) => Number(d.mushaf_id) === mushaf);
  if (!input.some((d) => d.date === today)) {
    input.push({ id: '', date: today, ranges: [], pages_read: 0, seconds_read: 0 });
  }
  const days = input.map((d) => {
    const ranges = readRanges(d.ranges);
    const offset = dayNumber(string(d.date)) - dayNumber(start);
    const eligible = !!goal && (!goal.duration || (offset >= 0 && offset < duration));
    let dailyRanges: string[] = [];
    if (eligible && goalRange) {
      const a =
        goalRange[0] +
        (goal.duration ? Math.floor(((goalRange[1] - goalRange[0] + 1) * offset) / duration) : 0);
      const b = goal.duration
        ? goalRange[0] +
          Math.floor(((goalRange[1] - goalRange[0] + 1) * (offset + 1)) / duration) -
          1
        : goalRange[1];
      if (a <= b) dailyRanges = [spanRange([a, b])];
    }
    const remaining = subtractSpans(dailyRanges.map(rangeSpan), mergeSpans(ranges.map(rangeSpan)));
    const dailyTarget = eligible ? target / duration : 0;
    const actual = goal?.type === 'QURAN_TIME' ? Number(d.seconds_read) : Number(d.pages_read);
    const percent = goalRange
      ? spanSize(dailyRanges.map(rangeSpan))
        ? 100 * (1 - spanSize(remaining) / spanSize(dailyRanges.map(rangeSpan)))
        : 0
      : dailyTarget
      ? Math.min(100, (actual / dailyTarget) * 100)
      : 0;
    return {
      id: d.id,
      date: d.date,
      ranges,
      pagesRead: Number(d.pages_read),
      secondsRead: Number(d.seconds_read),
      versesRead: spanSize(ranges.map(rangeSpan)),
      dailyTargetPages: eligible && goal?.type === 'QURAN_PAGES' ? dailyTarget : undefined,
      dailyTargetSeconds: eligible && goal?.type === 'QURAN_TIME' ? dailyTarget : undefined,
      dailyTargetRanges: dailyRanges,
      remainingDailyTargetRanges: remaining.map(spanRange),
      progress: percent,
    };
  });
  const current = object(days.find((d) => d.date === today));
  if (!goal) return { status: null, days, current };
  const selected: Row[] = goal.duration
    ? days.filter(
        (d) => string(d.date) >= start && dayNumber(string(d.date)) < dayNumber(start) + duration,
      )
    : [current];
  const read = mergeSpans(selected.flatMap((d) => readRanges(d.ranges).map(rangeSpan)));
  const remaining = goalRange ? subtractSpans([goalRange], read) : [];
  const actual = selected.reduce<number>(
    (sum, d) => sum + Number(goal.type === 'QURAN_TIME' ? d.secondsRead : d.pagesRead),
    0,
  );
  const percent = goalRange
    ? 100 * (1 - spanSize(remaining) / spanSize([goalRange]))
    : Math.min(100, (actual / target) * 100);
  const amountLeft = goalRange
    ? await pagesForRanges(remaining.map(spanRange), mushaf)
    : Math.max(0, target - actual);
  const status: Row = {
    id: goal.id,
    type: goal.type,
    targetAmount: goal.target_amount,
    duration: goal.duration,
    createdAt: goal.created_at,
    updatedAt: goal.updated_at,
    isCompleted: percent >= 100,
    progress: {
      percent,
      amountLeft,
      nextVerseToRead: remaining[0] ? verseKey(remaining[0][0]) : undefined,
      daysLeft: goal.duration
        ? Math.max(0, duration - (dayNumber(today) - dayNumber(start)))
        : undefined,
    },
  };
  return { status, days, current };
};
