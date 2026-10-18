/* eslint-disable react-func/max-lines-per-function -- Grouped domain scenarios. */
import { describe, expect, it } from 'vitest';

import { ACADEMY_PLANS } from '../academyPlans';

import { createAccountFixtures } from './fixtures';
import { accountPreviewReducer as reduce } from './reducer';
import { availableBalance, canCompleteLesson, validAvailability } from './rules';
import { localDateTime, wallTimeToUtc } from './time';
import type { PreviewAction } from './types';

const now = '2026-10-18T12:00:00.000Z';
describe('Account preview invariants', () => {
  it('accepts an eligible request exactly once and connects its lesson to both participants', () => {
    const state = createAccountFixtures();
    const action: PreviewAction = { type: 'request', id: 'request-intro', accept: true };
    const next = reduce(state, action);
    expect(next.lessons).toHaveLength(state.lessons.length + 1);
    expect(next.requests[0].lessonId).toBe(next.lessons.at(-1).id);
    expect(next.lessons.at(-1)).toMatchObject({
      teacherId: 'sample-a',
      studentId: state.student.id,
    });
    expect(reduce(next, action)).toBe(next);
  });
  it('blocks unpaid, positive amount and unapproved teacher requests', () => {
    const state = createAccountFixtures();
    const action: PreviewAction = { type: 'request', id: 'request-intro', accept: true };
    expect(
      reduce({ ...state, teacher: { ...state.teacher, approval: 'pending' } }, action).lessons,
    ).toEqual(state.lessons);
    [{ paid: false }, { amountCents: 100 }].forEach((patch) => {
      const changed = { ...state, requests: [{ ...state.requests[0], ...patch }] };
      expect(reduce(changed, action)).toBe(changed);
    });
  });
  it('requires the other participant to accept paid cancellation', () => {
    const state = createAccountFixtures();
    const request: PreviewAction = {
      type: 'lesson',
      id: 'lesson-next',
      role: 'student',
      operation: 'cancel',
      now,
    };
    const next = reduce(state, request);
    expect(next.lessons[0].cancellation).toBe('pending');
    expect(reduce(next, { ...request, operation: 'confirm-cancellation' }).lessons[0].status).toBe(
      'upcoming',
    );
    expect(
      reduce(next, { ...request, role: 'teacher', operation: 'confirm-cancellation' }).lessons[0]
        .status,
    ).toBe('cancelled');
  });
  it('requires a finished paid lesson, a teacher request and a student completion confirmation', () => {
    const state = createAccountFixtures();
    const action: PreviewAction = {
      type: 'lesson',
      id: 'lesson-today',
      role: 'teacher',
      operation: 'request-completion',
      now,
    };
    expect(canCompleteLesson(state.lessons[0], now)).toBe(false);
    const next = reduce(state, action);
    expect(next.lessons[1].completion).toBe('pending');
    expect(reduce(next, { ...action, operation: 'confirm-completion' }).lessons[1].status).toBe(
      'upcoming',
    );
    const done = reduce(next, { ...action, operation: 'confirm-completion', role: 'student' });
    expect(done.lessons[1].status).toBe('completed');
    const rating: PreviewAction = {
      type: 'review',
      id: 'lesson-today',
      rating: 5,
      text: 'Helpful lesson.',
    };
    const reviewed = reduce(done, rating);
    expect(reviewed.lessons[1].review.rating).toBe(5);
    expect(reduce(reviewed, { ...rating, rating: 1 }).lessons[1].review.rating).toBe(5);
  });
  it('does not change academy package prices when teacher pricing changes', () => {
    const state = createAccountFixtures();
    const next = reduce(state, {
      type: 'teacher',
      value: { ...state.teacher, monthlyPriceCents: 20000 },
    });
    expect(next.teacher.monthlyPriceCents).toBe(20000);
    expect(ACADEMY_PLANS.map((plan) => plan.monthlyPriceCents)).toEqual([8000, 10000, 12000]);
  });
  it('updates only an unused academy gift and rejects overlapping weekly slots', () => {
    const state = createAccountFixtures();
    expect(
      reduce(state, { type: 'gift', id: 'academy-subscription', gift: 'memorization' })
        .subscriptions[0].gift,
    ).toBe('memorization');
    expect(
      reduce(state, { type: 'gift', id: 'teacher-subscription', gift: 'memorization' })
        .subscriptions[1].gift,
    ).toBe('recitation');
    const slots = [
      ...state.availability,
      { ...state.availability[0], id: 'overlap', start: '18:00', end: '20:00' },
    ];
    expect(validAvailability(slots)).toBe(false);
    expect(reduce(state, { type: 'availability', value: slots, zone: 'UTC' })).toBe(state);
  });
  it('prevents coupon duplicates and overdrawn withdrawals', () => {
    const state = createAccountFixtures();
    expect(reduce(state, { type: 'coupon', value: { ...state.coupons[0], id: 'duplicate' } })).toBe(
      state,
    );
    expect(reduce(state, { type: 'withdrawal', amountCents: 18001, method: 'bank' })).toBe(state);
    const next = reduce(state, { type: 'withdrawal', amountCents: 18000, method: 'bank' });
    expect(availableBalance(next)).toBe(0);
    expect(reduce(next, { type: 'withdrawal', amountCents: 1, method: 'bank' })).toBe(next);
  });
  it('cannot self-approve through profile editing and resets local changes', () => {
    const state = createAccountFixtures();
    const pending = { ...state, teacher: { ...state.teacher, approval: 'pending' as const } };
    expect(reduce(pending, { type: 'teacher', value: state.teacher }).teacher.approval).toBe(
      'pending',
    );
    const reset = reduce(reduce(state, { type: 'message', role: 'student', text: 'Hello' }), {
      type: 'reset',
      now,
    });
    expect(reset.messages).toHaveLength(1);
    expect(reset.revision).toBe(1);
  });
});
describe('Booking timezone conversion', () => {
  it('preserves a UTC appointment across countries', () => {
    expect(localDateTime('2026-10-18T15:00:00Z', 'America/New_York')).toBe('2026-10-18T11:00');
    expect(wallTimeToUtc('2026-10-18T16:00', 'Europe/London')).toBe('2026-10-18T15:00:00.000Z');
  });
  it('rejects ambiguous and nonexistent daylight saving wall times', () => {
    expect(wallTimeToUtc('2026-03-08T02:30', 'America/New_York')).toBeNull();
    expect(wallTimeToUtc('2026-11-01T01:30', 'America/New_York')).toBeNull();
    expect(wallTimeToUtc('2026-03-08T03:30', 'America/New_York')).toBe('2026-03-08T07:30:00.000Z');
  });
});
