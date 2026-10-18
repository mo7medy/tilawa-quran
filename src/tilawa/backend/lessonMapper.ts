/* eslint-disable react-func/max-lines-per-function -- Declarative form fields and explicit protocol mappings are kept together for auditability. */
/* eslint-disable no-nested-ternary -- Small enum/label selections keep existing UI and wire-state mappings adjacent. */
/* eslint-disable import/prefer-default-export -- Named backend entrypoints make route and domain imports explicit. */
import type { Lesson } from '../account/types';

import { object, string } from './rows';
import type { Row } from './rows';

export const mapLesson = (l: Row): Lesson => {
  const completion = object(l.completion);
  const cancellation = object(l.cancellation);
  const review = object(l.review);
  return {
    id: string(l.id),
    studentId: string(l.student_id),
    teacherId: string(l.teacher_id),
    subject: l.subject === 'arabic' ? 'arabic' : 'quran',
    scheduledAt: string(l.scheduled_at),
    duration: Number(l.duration_minutes),
    type: l.lesson_type === 'intro' ? 'intro' : l.subscription_id ? 'subscription' : 'regular',
    status: l.status === 'scheduled' ? 'upcoming' : (l.status as Lesson['status']),
    paid: ['paid', 'covered'].includes(string(l.payment_status)),
    completion:
      completion.status === 'pending'
        ? 'pending'
        : completion.status === 'rejected'
        ? 'rejected'
        : 'none',
    cancellation:
      cancellation.status === 'pending'
        ? 'pending'
        : cancellation.status === 'rejected'
        ? 'rejected'
        : 'none',
    requestedBy: cancellation.requester_id === l.teacher_id ? 'teacher' : 'student',
    history: Array.isArray(l.history) ? l.history.map(string) : [],
    review: review.id ? { rating: Number(review.rating), text: string(review.body) } : undefined,
    fundingSource: string(l.funding_source),
    paymentState: string(l.payment_status),
    meetingUrl: string(l.meeting_url),
  };
};
