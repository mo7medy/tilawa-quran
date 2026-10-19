/* eslint-disable @typescript-eslint/naming-convention -- Payment rows preserve the database wire contract. */
export interface ReportRange {
  from: string;
  until: string;
}
export interface ReportDay {
  day: string;
  accounts: number;
  lessons: number;
}
export interface AdminOverviewReport {
  asOf: string;
  timeZone: string;
  students: number;
  approvedTeachers: number;
  pendingTeachers: number;
  lessonsToday: number;
  completedLessons: number;
  cancelledLessons: number;
  activeSubscriptions: number;
  endingSoon: number;
  pendingPayments: number;
  newAccounts: number;
  trend: ReportDay[];
  subjects: { arabic: number; quran: number };
  plans: { id: string; lessons: number; count: number }[];
  teacherSubscriptions: number;
}
export interface FinancePayment {
  id: string;
  created_at: string;
  status: string;
  kind: string;
  subject: string;
  amount_cents: number;
  currency: string;
  student: string | null;
  teacher: string | null;
}
export interface FinanceWithdrawal {
  id: string;
  created_at: string;
  amount_cents: number;
  status: string;
  teacher: string | null;
}
export interface AdminFinanceReport {
  asOf: string;
  currency: string;
  paymentsEnabled: boolean;
  paidCents: number;
  pendingCents: number;
  failedCents: number;
  refundedCents: number;
  pendingOrdersCents: number;
  platformShareCents: null;
  sources: { kind: string; paidCents: number }[];
  pendingEarningsCents: number;
  availableEarningsCents: number;
  pendingWithdrawalsCents: number;
  approvedWithdrawalsCents: number;
  paidWithdrawalsCents: number;
  payments: FinancePayment[];
  total: number;
  page: number;
  pageSize: number;
  withdrawals: FinanceWithdrawal[];
}
