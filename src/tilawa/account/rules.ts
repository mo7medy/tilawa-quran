import type { AccountPreviewState, AvailabilitySlot, BookingRequest, Lesson } from './types';

export const canReviewRequest = (request: BookingRequest): boolean =>
  request.status === 'pending' && request.paid && request.amountCents === 0;

export const canCompleteLesson = (lesson: Lesson, now: string): boolean =>
  lesson.status === 'upcoming' &&
  lesson.paid &&
  lesson.type !== 'intro' &&
  Date.parse(now) >=
    Date.parse(lesson.scheduledAt) +
      (lesson.fundingSource ? Math.max(60, lesson.duration) : lesson.duration) * 60000;

export const validAvailability = (slots: AvailabilitySlot[]): boolean =>
  slots.every(
    (slot, index) =>
      Number.isInteger(slot.day) &&
      slot.day >= 0 &&
      slot.day <= 6 &&
      /^([01]\d|2[0-3]):[0-5]\d$/.test(slot.start) &&
      /^([01]\d|2[0-3]):[0-5]\d$/.test(slot.end) &&
      slot.start < slot.end &&
      !slots.some(
        (other, otherIndex) =>
          index !== otherIndex &&
          slot.day === other.day &&
          slot.start < other.end &&
          other.start < slot.end,
      ),
  );

export const availableBalance = (state: AccountPreviewState): number =>
  state.availableCents ??
  18000 -
    state.withdrawals
      .filter((item) => item.status !== 'rejected')
      .reduce((total, item) => total + item.amountCents, 0);

export const money = (cents: number, lang: string): string =>
  new Intl.NumberFormat(lang === 'ar' ? 'ar' : 'en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);

export const isAccountPath = (pathname: string): boolean =>
  pathname === '/profile' ||
  pathname.startsWith('/profile/') ||
  pathname === '/dashboard/teacher' ||
  pathname.startsWith('/dashboard/teacher/') ||
  pathname.startsWith('/lessons/');
