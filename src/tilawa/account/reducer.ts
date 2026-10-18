/* eslint-disable react-func/max-lines-per-function -- Declarative fixtures and exhaustive state transitions are kept together. */
/* eslint-disable import/prefer-default-export -- Named domain helpers form the account preview contract. */
import { createAccountFixtures } from './fixtures';
import { updatePreviewLesson } from './lessonReducer';
import { availableBalance, canReviewRequest, validAvailability } from './rules';
import type { AccountPreviewState, PreviewAction } from './types';

/** Preview-only state transitions. No auth, network, storage or financial effects.
 * @returns {AccountPreviewState} the derived preview value
 */
export const accountPreviewReducer = (
  state: AccountPreviewState,
  action: PreviewAction,
): AccountPreviewState => {
  switch (action.type) {
    case 'reset':
      return {
        ...createAccountFixtures(action.now ? new Date(action.now) : undefined),
        revision: state.revision + 1,
      };
    case 'scenario':
      return { ...state, teacher: { ...state.teacher, approval: action.approval } };
    case 'student':
      return { ...state, student: action.value };
    case 'teacher':
      return {
        ...state,
        teacher: {
          ...action.value,
          approval:
            state.teacher.approval === 'rejected' || state.teacher.approval === 'incomplete'
              ? 'pending'
              : state.teacher.approval,
        },
      };
    case 'request': {
      const request = state.requests.find((item) => item.id === action.id);
      if (state.teacher.approval !== 'approved' || !request || !canReviewRequest(request)) {
        return state;
      }
      const lessonId = `lesson-${request.id}`;
      return {
        ...state,
        requests: state.requests.map((item) =>
          item.id === request.id
            ? {
                ...item,
                status: action.accept ? 'accepted' : 'rejected',
                lessonId: action.accept ? lessonId : undefined,
              }
            : item,
        ),
        lessons: action.accept
          ? [
              ...state.lessons,
              {
                id: lessonId,
                studentId: request.studentId,
                teacherId: request.teacherId,
                subject: request.subject,
                scheduledAt: request.scheduledAt,
                duration: request.duration,
                type: request.type,
                paid: request.paid,
                status: 'upcoming',
                completion: 'none',
                cancellation: 'none',
                history: ['accepted'],
              },
            ]
          : state.lessons,
      };
    }
    case 'lesson':
      if (action.role === 'teacher' && state.teacher.approval !== 'approved') return state;
      return {
        ...state,
        lessons: state.lessons.map((lesson) => updatePreviewLesson(lesson, action)),
      };
    case 'review':
      return {
        ...state,
        lessons: state.lessons.map((lesson) => updatePreviewLesson(lesson, action)),
      };
    case 'gift':
      return {
        ...state,
        subscriptions: state.subscriptions.map((item) =>
          item.id === action.id &&
          item.kind === 'academy' &&
          item.planId !== 'essential' &&
          !item.giftUsed
            ? { ...item, gift: action.gift }
            : item,
        ),
      };
    case 'availability':
      return validAvailability(action.value)
        ? { ...state, availability: action.value, availabilityZone: action.zone }
        : state;
    case 'coupon': {
      const coupon = action.value;
      if (
        state.teacher.approval !== 'approved' ||
        !/^[A-Z0-9_-]{3,24}$/.test(coupon.code) ||
        !Number.isInteger(coupon.percent) ||
        coupon.percent < 1 ||
        coupon.percent > 90 ||
        !Number.isInteger(coupon.limit) ||
        coupon.limit < 1 ||
        state.coupons.some((item) => item.id !== coupon.id && item.code === coupon.code)
      ) {
        return state;
      }
      return {
        ...state,
        coupons: [...state.coupons.filter((item) => item.id !== coupon.id), coupon],
      };
    }
    case 'message':
      return action.text.trim() && action.text.length <= 2000
        ? {
            ...state,
            messages: [
              ...state.messages,
              {
                id: `message-${state.messages.length + 1}`,
                role: action.role,
                text: action.text.trim(),
              },
            ],
          }
        : state;
    case 'withdrawal':
      return Number.isInteger(action.amountCents) &&
        action.amountCents > 0 &&
        action.amountCents <= availableBalance(state) &&
        action.method.trim()
        ? {
            ...state,
            withdrawals: [
              ...state.withdrawals,
              {
                id: `withdrawal-${state.withdrawals.length + 1}`,
                amountCents: action.amountCents,
                method: action.method.trim(),
                status: 'pending',
              },
            ],
          }
        : state;
    default:
      return state;
  }
};
