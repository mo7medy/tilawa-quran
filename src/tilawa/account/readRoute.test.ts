/* eslint-disable @typescript-eslint/naming-convention, react-func/max-lines-per-function -- Wire fixtures and related routing scenarios. */
import { describe, expect, it } from 'vitest';

import { accountReadRoute, accountViewUrl } from './readRoute';

import { authCallbackPath, authDestination } from '@/tilawa/backend/authDestination';
import { mapSubscription } from '@/tilawa/backend/subscriptionMapper';

describe('Route-scoped account reads', () => {
  it('keeps Quran and administrator routes out of account history reads', () => {
    expect(accountReadRoute('/ar/quran')).toBeNull();
    expect(accountReadRoute('/1x2003/admin/students')).toBeNull();
    expect(accountReadRoute('/22?startingVerse=1')).toBeNull();
  });
  it('preserves selected lesson status, detail IDs and pagination across locales', () => {
    expect(accountReadRoute('/ar/profile/lessons?lessonStatus=completed&accountPage=3')).toEqual({
      view: 'lessons',
      id: '',
      page: 3,
      status: 'completed',
    });
    expect(accountReadRoute('/de/profile/learning', ['de'])).toMatchObject({ view: 'home' });
    expect(accountReadRoute('/dashboard/teacher/students/student-id')).toMatchObject({
      view: 'students',
      id: 'student-id',
    });
    expect(
      accountViewUrl({ view: 'messages', page: 1, id: 'conversation-id', status: 'all' }),
    ).toContain('id=conversation-id');
  });
  it('uses authoritative whole-ledger balances even when no ledger history is loaded', () => {
    const subscription = mapSubscription(
      {
        id: 's',
        kind: 'academy',
        credits_summary: {
          used: 4,
          reserved: 2,
          remaining: 6,
          giftUsed: false,
          giftReserved: true,
        },
      },
      [],
    );
    expect(subscription).toMatchObject({
      used: 4,
      reservedLessons: 2,
      remainingLessons: 6,
      giftReserved: true,
    });
  });
});

describe('Localized authentication destinations', () => {
  it('preserves local intent and rejects cross-origin redirect attempts', () => {
    expect(authDestination('/ar/1x2003/admin/teachers', 'ar')).toBe('/ar/1x2003/admin/teachers');
    expect(authDestination('https://evil.invalid', 'ar')).toBe('/ar/profile');
    expect(authDestination('//evil.invalid', 'en')).toBe('/profile');
    expect(authDestination('/\\evil.invalid', 'ar')).toBe('/ar/profile');
    expect(authDestination('/profile', 'ar', true)).toBe('/ar/sign-in?reset=1');
    const callback = new URL(authCallbackPath('/profile/teacher', 'ar'), 'https://tilawa.invalid');
    expect(callback.searchParams.get('next')).toBe('/ar/profile/teacher');
    expect(callback.searchParams.get('lang')).toBe('ar');
  });
});
