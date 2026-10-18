/* eslint-disable react-func/max-lines-per-function -- Declarative fixtures and exhaustive state transitions are kept together. */
/* eslint-disable import/prefer-default-export -- Named domain helpers form the account preview contract. */
import SAMPLE_TEACHERS from '../teacherSamples';

import type { AccountPreviewState, Lesson } from './types';

const offsetDate = (now: Date, days: number): string => {
  const value = new Date(now);
  value.setUTCDate(value.getUTCDate() + days);
  value.setUTCHours(15, 0, 0, 0);
  return value.toISOString();
};

/** Fresh, explicitly illustrative data; never represents a session or real transactions.
 * @returns {AccountPreviewState} the derived preview value
 */
export const createAccountFixtures = (
  now = new Date('2026-10-18T12:00:00Z'),
): AccountPreviewState => {
  const base: Omit<Lesson, 'id' | 'scheduledAt' | 'status'> = {
    studentId: 'preview-student',
    teacherId: 'sample-a',
    subject: 'quran',
    duration: 45,
    type: 'regular',
    paid: true,
    completion: 'none',
    cancellation: 'none',
    history: [],
  };
  return {
    revision: 0,
    student: {
      id: 'preview-student',
      name: 'Alex · Demo',
      country: 'United Kingdom',
      birthDate: '2012-04-14',
      goal: 'Learn to read Arabic and improve recitation.',
      schedule: 'Weekday evenings',
      email: 'student@example.test',
      zone: 'Europe/London',
      photo: '',
    },
    teacher: {
      publicProfile: { ...SAMPLE_TEACHERS[0], sessionPriceCents: 1500 },
      country: 'Egypt',
      email: 'teacher@example.test',
      phone: '',
      experience: 3,
      approval: 'approved',
      pricing: 'both',
      monthlyPriceCents: 9000,
      monthlyLessons: 8,
    },
    lessons: [
      { ...base, id: 'lesson-next', scheduledAt: offsetDate(now, 1), status: 'upcoming' },
      {
        ...base,
        id: 'lesson-today',
        scheduledAt: new Date(now.getTime() - 7200000).toISOString(),
        status: 'upcoming',
      },
      { ...base, id: 'lesson-completed', scheduledAt: offsetDate(now, -3), status: 'completed' },
      { ...base, id: 'lesson-cancelled', scheduledAt: offsetDate(now, -2), status: 'cancelled' },
    ],
    requests: [
      {
        id: 'request-intro',
        studentId: 'preview-student',
        teacherId: 'sample-a',
        type: 'intro',
        scheduledAt: offsetDate(now, 2),
        duration: 15,
        subject: 'quran',
        amountCents: 0,
        paid: true,
        status: 'pending',
        note: 'A short introduction to discuss learning goals.',
      },
      {
        id: 'request-subscription',
        studentId: 'preview-student',
        teacherId: 'sample-a',
        type: 'subscription',
        scheduledAt: offsetDate(now, 3),
        duration: 45,
        subject: 'arabic',
        amountCents: 0,
        paid: true,
        status: 'pending',
        note: 'Practise reading Arabic.',
      },
    ],
    subscriptions: [
      {
        id: 'academy-subscription',
        kind: 'academy',
        planId: 'progress',
        subject: 'quran',
        used: 3,
        gift: 'recitation',
        giftUsed: false,
        startsAt: offsetDate(now, -5),
        renewsAt: offsetDate(now, 25),
      },
      {
        id: 'teacher-subscription',
        kind: 'teacher',
        planId: 'essential',
        teacherId: 'sample-a',
        subject: 'arabic',
        used: 2,
        gift: 'recitation',
        giftUsed: true,
        startsAt: offsetDate(now, -8),
        renewsAt: offsetDate(now, 22),
      },
    ],
    availability: [{ id: 'slot-1', day: 1, start: '16:00', end: '19:00' }],
    availabilityZone: 'Europe/London',
    coupons: [
      { id: 'coupon-1', code: 'WELCOME', percent: 10, limit: 10, active: true, expires: '' },
    ],
    messages: [
      {
        id: 'message-1',
        role: 'teacher',
        text: 'Welcome! What would you like to focus on in our next lesson?',
      },
    ],
    withdrawals: [],
  };
};
