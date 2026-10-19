/* eslint-disable @typescript-eslint/naming-convention -- Synthetic database response rows. */
// Synthetic reports used only by local UI tests and the ignored visual harness.
import type { AdminFinanceReport, AdminOverviewReport } from '@/tilawa/adminReportTypes';

export const overviewTestReport: AdminOverviewReport = {
  asOf: '2026-10-20T00:00:00Z',
  timeZone: 'UTC',
  students: 18,
  approvedTeachers: 4,
  pendingTeachers: 2,
  lessonsToday: 5,
  completedLessons: 12,
  cancelledLessons: 1,
  activeSubscriptions: 8,
  endingSoon: 2,
  pendingPayments: 1,
  newAccounts: 3,
  trend: [
    { day: '2026-10-18', accounts: 1, lessons: 3 },
    { day: '2026-10-19', accounts: 2, lessons: 5 },
    { day: '2026-10-20', accounts: 0, lessons: 5 },
  ],
  subjects: { arabic: 5, quran: 3 },
  plans: [
    { id: 'essential', lessons: 8, count: 3 },
    { id: 'progress', lessons: 12, count: 2 },
    { id: 'immersive', lessons: 16, count: 1 },
  ],
  teacherSubscriptions: 2,
};
export const financeTestReport: AdminFinanceReport = {
  asOf: '2026-10-20T00:00:00Z',
  currency: 'USD',
  paymentsEnabled: false,
  paidCents: 20000,
  pendingCents: 3000,
  failedCents: 5000,
  refundedCents: 10000,
  pendingOrdersCents: 3000,
  platformShareCents: null,
  sources: [
    { kind: 'academy', paidCents: 8000 },
    { kind: 'teacher', paidCents: 12000 },
    { kind: 'lesson', paidCents: 0 },
  ],
  pendingEarningsCents: 2000,
  availableEarningsCents: 5500,
  pendingWithdrawalsCents: 3000,
  approvedWithdrawalsCents: 500,
  paidWithdrawalsCents: 1000,
  payments: [
    {
      id: '00000000-0000-4000-8000-000000000201',
      created_at: '2026-10-19T12:00:00Z',
      status: 'paid',
      kind: 'academy',
      subject: 'arabic',
      amount_cents: 8000,
      currency: 'USD',
      student: '[Preview] Student',
      teacher: '[Preview] Teacher',
    },
  ],
  total: 1,
  page: 1,
  pageSize: 25,
  withdrawals: [
    {
      id: 'withdrawal-preview',
      created_at: '2026-10-19T12:00:00Z',
      amount_cents: 3000,
      status: 'pending',
      teacher: '[Preview] Teacher',
    },
  ],
};
