import { describe, expect, it } from 'vitest';

import { ACADEMY_PLANS, getAcademyRegistrationUrl, readAcademyPlanSelection } from './academyPlans';

describe('Independent website package selection', () => {
  it('round trips both subjects and both gift choices without offering two gifts', () => {
    (['arabic', 'quran'] as const).forEach((subject) => {
      (['recitation', 'memorization'] as const).forEach((gift) => {
        ACADEMY_PLANS.forEach((plan) => {
          const href = getAcademyRegistrationUrl(plan, subject, gift);
          const query = Object.fromEntries(new URL(href, 'http://localhost').searchParams);
          expect(readAcademyPlanSelection(query)).toEqual({
            plan,
            subject,
            gift: plan.giftLessons ? gift : null,
          });
          expect(plan.giftLessons).toBeLessThanOrEqual(1);
        });
      });
    });
  });

  it('uses the catalogue amount and rejects unknown or repeated package identifiers', () => {
    expect(
      readAcademyPlanSelection({ package: 'progress', price: '1', lessons: '99' })?.plan,
    ).toMatchObject({ lessons: 12, monthlyPriceCents: 10000 });
    expect(readAcademyPlanSelection({ package: 'unknown' })).toBeNull();
    expect(readAcademyPlanSelection({ package: ['progress', 'essential'] })).toBeNull();
    expect(
      readAcademyPlanSelection({ package: 'essential', gift: 'memorization', subject: 'invalid' }),
    ).toMatchObject({ subject: 'arabic', gift: null });
  });
});
