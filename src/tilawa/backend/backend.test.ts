/* eslint-disable @typescript-eslint/naming-convention -- Fixtures use the database wire format. */
/* eslint-disable react-func/max-lines-per-function -- Keep related behavioral assertions together within each test suite. */
import { beforeEach, describe, expect, it } from 'vitest';

import { registerPrivateStore, switchPrivateOwner, guestQuranSnapshot } from './privateCache';
import { estimatedWeek, quranProgress, calculateStreak } from './quranProgress';
import {
  normalizeRange,
  rangeContains,
  rangesOverlap,
  rangeSpan,
  spanSize,
  subtractSpans,
  verseOrdinal,
  verseKey,
} from './quranRanges';
import { safeAccountRedirect } from './redirect';

describe('Quran account ranges and goals', () => {
  it('validates real chapter boundaries and counts across chapters', () => {
    expect(verseOrdinal('2:1')).toBe(8);
    expect(verseKey(6236)).toBe('114:6');
    expect(() => verseOrdinal('1:8')).toThrow();
    expect(() => rangeSpan('2:3-1:1')).toThrow();
    expect(normalizeRange('1:3-7')).toBe('1:3-1:7');
    expect(rangeContains('1:6-2:2', '2:1')).toBe(true);
    expect(rangesOverlap('1:1-1:7', '2:1-2:5')).toBe(false);
  });
  it('does not count overlapping reading twice and subtracts partial ranges', () => {
    expect(spanSize([rangeSpan('1:1-1:5'), rangeSpan('1:3-1:7')])).toBe(7);
    expect(subtractSpans([[1, 7]], [[3, 5]])).toEqual([
      [1, 2],
      [6, 7],
    ]);
  });
  it('uses local calendar days for continuous time progress', async () => {
    const goal = {
      id: 'g',
      type: 'QURAN_TIME',
      target_amount: '600',
      duration: 3,
      created_at: '2026-03-08T02:00:00Z',
      updated_at: '2026-03-08T02:00:00Z',
    };
    const { status, current } = await quranProgress(
      goal,
      [
        {
          id: 'old',
          date: '2026-03-06',
          mushaf_id: 1,
          seconds_read: 900,
          ranges: [],
          pages_read: 0,
        },
        { id: 'a', date: '2026-03-07', mushaf_id: 1, seconds_read: 200, ranges: [], pages_read: 0 },
        { id: 'b', date: '2026-03-08', mushaf_id: 1, seconds_read: 100, ranges: [], pages_read: 0 },
      ],
      1,
      '2026-03-08',
      'America/New_York',
    );
    expect(status.progress).toMatchObject({ percent: 50, amountLeft: 300, daysLeft: 2 });
    expect(current.dailyTargetSeconds).toBe(200);
  });
  it('estimates a continuous range without crossing the actual target', () => {
    const estimate = estimatedWeek(
      { type: 'QURAN_RANGE', amount: '1:1-1:7', duration: 3 },
      '2026-10-18',
    );
    expect(estimate.week).toEqual([
      { date: '2026-10-18', amount: '1:1-1:2' },
      { date: '2026-10-19', amount: '1:3-1:4' },
      { date: '2026-10-20', amount: '1:5-1:7' },
    ]);
    expect(
      calculateStreak(
        [
          { date: '2026-10-17', secondsRead: 60 },
          { date: '2026-10-16', secondsRead: 60 },
        ],
        '2026-10-18',
      ),
    ).toBe(2);
  });
});
describe('Shared-device account isolation', () => {
  beforeEach(() => {
    localStorage.clear();
    registerPrivateStore(null);
  });
  it('keeps guest bookmarks separate, clears user caches on a switch, and restores only the guest copy', () => {
    localStorage.setItem(
      'persist:root',
      JSON.stringify({
        bookmarks: JSON.stringify({ bookmarkedVerses: { '1:1': 10 } }),
        theme: JSON.stringify({ type: 'dark' }),
      }),
    );
    expect(switchPrivateOwner('user-a')).toBe(true);
    expect(guestQuranSnapshot().bookmarks).toEqual({ bookmarkedVerses: { '1:1': 10 } });
    const persisted = JSON.parse(localStorage.getItem('persist:root'));
    expect(persisted.bookmarks).toBeUndefined();
    expect(persisted.theme).toBe(JSON.stringify({ type: 'dark' }));
    localStorage.setItem(
      'persist:root',
      JSON.stringify({ ...persisted, pinnedVerses: JSON.stringify({ verses: ['private-a'] }) }),
    );
    switchPrivateOwner('user-b');
    expect(JSON.parse(localStorage.getItem('persist:root')).pinnedVerses).toBeUndefined();
    switchPrivateOwner(null);
    expect(JSON.parse(JSON.parse(localStorage.getItem('persist:root')).bookmarks)).toEqual({
      bookmarkedVerses: { '1:1': 10 },
    });
  });
  it('rejects external and protocol-relative login destinations', () => {
    expect(safeAccountRedirect('//evil.example')).toBe('/profile');
    expect(safeAccountRedirect('/\\evil.example')).toBe('/profile');
    expect(safeAccountRedirect('https://evil.example')).toBe('/profile');
    expect(safeAccountRedirect('/ar/profile/lessons?tab=next')).toBe(
      '/ar/profile/lessons?tab=next',
    );
  });
});
