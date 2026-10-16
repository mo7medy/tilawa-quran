export type PreviewLessonType = 'intro' | 'follow_up' | 'intensive_review';

export interface PreviewLessonOption {
  id: PreviewLessonType;
  durationMinutes: number;
  priceCents: number | null;
}

/** Display contract only. Actual eligibility, terms and payment need server validation.
 * @returns {PreviewLessonOption[]} display-only lesson options
 */
export const getPreviewLessonOptions = (
  baseMinutes: number,
  baseCents: number | null,
): PreviewLessonOption[] => [
  {
    id: 'intro',
    durationMinutes: baseMinutes > 35 ? baseMinutes - 15 : baseMinutes,
    priceCents: 0,
  },
  { id: 'follow_up', durationMinutes: baseMinutes, priceCents: baseCents },
  {
    id: 'intensive_review',
    durationMinutes: 60,
    priceCents: baseCents === null ? null : Math.round(baseCents * 1.2),
  },
];

/** Clearly illustrative schedule. Never use as actual bookable availability.
 * @returns {string[]} illustrative UTC timestamps
 */
export const getPreviewSlots = (date: string): string[] => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return [];
  if ([0, 6].includes(parsed.getUTCDay())) return [];
  return ['09:00', '11:00', '14:00'].map((time) => `${date}T${time}:00.000Z`);
};

export const formatPreviewSlot = (iso: string, locale: string, timeZone: string): string =>
  new Intl.DateTimeFormat(locale === 'ar' ? 'ar' : 'en', {
    timeZone,
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
