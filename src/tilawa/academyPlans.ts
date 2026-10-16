/** Website packages are independent of each teacher's own lesson pricing. */
export type AcademySubject = 'arabic' | 'quran';
export type AcademyGift = 'recitation' | 'memorization';

export interface AcademyPlan {
  id: 'essential' | 'progress' | 'immersive';
  lessons: number;
  monthlyPriceCents: number;
  giftLessons: number;
}

export const ACADEMY_LESSON_MINUTES = 45;
export const ACADEMY_PLANS: readonly AcademyPlan[] = [
  { id: 'essential', lessons: 8, monthlyPriceCents: 8000, giftLessons: 0 },
  { id: 'progress', lessons: 12, monthlyPriceCents: 10000, giftLessons: 1 },
  { id: 'immersive', lessons: 16, monthlyPriceCents: 12000, giftLessons: 1 },
];

export interface AcademyPlanSelection {
  plan: AcademyPlan;
  subject: AcademySubject;
  gift: AcademyGift | null;
}

type SelectionQuery = Record<string, string | string[] | undefined>;

export const getAcademySubject = (value: string | string[] | undefined): AcademySubject =>
  value === 'quran' ? 'quran' : 'arabic';

// Only catalogue identifiers are accepted; URL amounts never determine pricing.
export const readAcademyPlanSelection = (query: SelectionQuery): AcademyPlanSelection | null => {
  const plan = ACADEMY_PLANS.find((item) => item.id === query.package);
  if (!plan) return null;
  const gift = query.gift === 'memorization' ? 'memorization' : 'recitation';
  return {
    plan,
    subject: getAcademySubject(query.subject),
    gift: plan.giftLessons ? gift : null,
  };
};

export const getAcademyRegistrationUrl = (
  plan: AcademyPlan,
  subject: AcademySubject,
  gift: AcademyGift,
): string => {
  const query = new URLSearchParams({ package: plan.id, subject });
  if (plan.giftLessons) query.set('gift', gift);
  return `/register?${query.toString()}`;
};

export const formatAcademyPrice = (cents: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    currencyDisplay: 'narrowSymbol',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(cents / 100);
