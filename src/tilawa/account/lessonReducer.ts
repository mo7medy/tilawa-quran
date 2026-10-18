/* eslint-disable react-func/max-lines-per-function -- Declarative fixtures and exhaustive state transitions are kept together. */
/* eslint-disable import/prefer-default-export -- Named domain helpers form the account preview contract. */
import { canCompleteLesson } from './rules';
import type { Lesson, PreviewAction } from './types';

export const updatePreviewLesson = (lesson: Lesson, action: PreviewAction): Lesson => {
  if (action.type === 'review') {
    if (
      lesson.id !== action.id ||
      lesson.status !== 'completed' ||
      lesson.type === 'intro' ||
      lesson.review ||
      !Number.isInteger(action.rating) ||
      action.rating < 1 ||
      action.rating > 5 ||
      !action.text.trim() ||
      action.text.length > 2000
    ) {
      return lesson;
    }
    return { ...lesson, review: { rating: action.rating, text: action.text.trim() } };
  }
  if (action.type !== 'lesson' || lesson.id !== action.id || lesson.status !== 'upcoming') {
    return lesson;
  }
  const change = (patch: Partial<Lesson>): Lesson => ({
    ...lesson,
    ...patch,
    history: [...lesson.history, action.operation],
  });
  if (
    action.operation === 'reschedule' &&
    action.at &&
    lesson.cancellation !== 'pending' &&
    lesson.completion !== 'pending' &&
    Date.parse(action.at) > Date.parse(action.now)
  ) {
    return change({ scheduledAt: action.at });
  }
  if (
    action.operation === 'cancel' &&
    lesson.cancellation !== 'pending' &&
    lesson.completion !== 'pending'
  ) {
    return lesson.paid
      ? change({ cancellation: 'pending', requestedBy: action.role })
      : change({ status: 'cancelled' });
  }
  if (
    action.operation === 'request-completion' &&
    action.role === 'teacher' &&
    lesson.completion !== 'pending' &&
    lesson.cancellation !== 'pending' &&
    canCompleteLesson(lesson, action.now)
  ) {
    return change({ completion: 'pending' });
  }
  if (action.role === 'student' && lesson.completion === 'pending') {
    if (action.operation === 'confirm-completion') {
      return change({ status: 'completed', completion: 'none' });
    }
    if (action.operation === 'reject-completion') return change({ completion: 'rejected' });
  }
  if (lesson.cancellation === 'pending' && lesson.requestedBy !== action.role) {
    if (action.operation === 'confirm-cancellation') {
      return change({ status: 'cancelled', cancellation: 'none' });
    }
    if (action.operation === 'reject-cancellation') return change({ cancellation: 'rejected' });
  }
  return lesson;
};
