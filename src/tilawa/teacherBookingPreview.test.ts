import { describe, expect, it } from 'vitest';

import {
  formatPreviewSlot,
  getPreviewLessonOptions,
  getPreviewSlots,
} from './teacherBookingPreview';

describe('Display-only teacher booking terms', () => {
  it('uses the agreed intro duration and fixed intensive duration with 20 percent pricing', () => {
    const options = getPreviewLessonOptions(45, 1001);
    expect(options.find((item) => item.id === 'intro')).toMatchObject({
      durationMinutes: 30,
      priceCents: 0,
    });
    expect(options.find((item) => item.id === 'intensive_review')).toMatchObject({
      durationMinutes: 60,
      priceCents: 1201,
    });
    expect(getPreviewLessonOptions(30, null)[0].durationMinutes).toBe(30);
    expect(getPreviewLessonOptions(45, null)[2].priceCents).toBeNull();
  });

  it('rejects invalid dates and keeps example times in UTC', () => {
    expect(getPreviewSlots('2026-02-30')).toEqual([]);
    expect(getPreviewSlots('invalid')).toEqual([]);
    expect(getPreviewSlots('2026-10-17')).toEqual([]);
    expect(getPreviewSlots('2026-10-14')[0]).toBe('2026-10-14T09:00:00.000Z');
  });

  it('converts the same instant across DST boundaries without changing the stored timestamp', () => {
    expect(formatPreviewSlot('2026-10-14T09:00:00Z', 'en', 'America/New_York')).toContain('5:00');
    expect(formatPreviewSlot('2026-12-14T09:00:00Z', 'en', 'America/New_York')).toContain('4:00');
  });
});
