/* eslint-disable react-func/max-lines-per-function -- Declarative form fields and explicit protocol mappings are kept together for auditability. */
/* eslint-disable import/prefer-default-export -- Named backend entrypoints make route and domain imports explicit. */
import type { AccountSubscription } from '../account/types';

import { string } from './rows';
import type { Row } from './rows';

export const mapSubscription = (s: Row, credits: Row[]): AccountSubscription => {
  const entries = credits.filter((c) => c.subscription_id === s.id);
  const regular = entries.filter((c) => c.bucket === 'regular');
  const reserved = regular.filter(
    (c) =>
      c.operation === 'reserve' &&
      !entries.some(
        (e) =>
          e.booking_id === c.booking_id && ['consume', 'release'].includes(string(e.operation)),
      ),
  ).length;
  return {
    id: string(s.id),
    kind: s.kind as 'academy' | 'teacher',
    planId: (s.plan_id ?? 'essential') as AccountSubscription['planId'],
    teacherId: string(s.teacher_id),
    subject: s.subject === 'arabic' ? 'arabic' : 'quran',
    used: regular.filter((c) => c.operation === 'consume').length,
    gift: s.gift_type === 'memorization' ? 'memorization' : 'recitation',
    giftUsed: entries.some((c) => c.bucket === 'gift' && c.operation === 'consume'),
    giftChosen: !!s.gift_type,
    giftReserved: entries.some(
      (c) =>
        c.bucket === 'gift' &&
        c.operation === 'reserve' &&
        !entries.some(
          (e) =>
            e.booking_id === c.booking_id && ['consume', 'release'].includes(string(e.operation)),
        ),
    ),
    startsAt: string(s.starts_at),
    renewsAt: string(s.ends_at),
    expiresAt: string(s.access_ends_at),
    status: string(s.status),
    includedLessons: Number(s.included_lessons),
    reservedLessons: reserved,
    remainingLessons: Math.max(
      0,
      regular.reduce((sum, c) => sum + Number(c.delta), 0),
    ),
    priceCents: Number(s.price_cents),
    durationMinutes: Number(s.duration_minutes),
  };
};
