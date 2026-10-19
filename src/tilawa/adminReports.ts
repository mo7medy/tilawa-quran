import type { FinancePayment, ReportRange } from './adminReportTypes';

export type ReportPeriod = 'today' | 'week' | 'month' | 'custom';
export const reportDate = (value: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !value.startsWith('0000-') &&
  Number.isFinite(Date.parse(`${value}T00:00:00Z`)) &&
  new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
export const shiftReportDate = (value: string, days: number): string => {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};
export const validReportRange = (range: ReportRange): boolean =>
  reportDate(range.from) &&
  reportDate(range.until) &&
  range.until > range.from &&
  (Date.parse(range.until) - Date.parse(range.from)) / 86400000 <= 366;
export const periodRange = (
  period: Exclude<ReportPeriod, 'custom'>,
  now = new Date(),
): ReportRange => {
  const today = now.toISOString().slice(0, 10);
  const days = { today: 1, week: 7, month: 30 }[period];
  return { from: shiftReportDate(today, 1 - days), until: shiftReportDate(today, 1) };
};
// Quote every cell and neutralise formulas, including ones preceded by whitespace.
export const csvCell = (value: string | number | null): string => {
  let text = String(value ?? '');
  if (/^[\s\uFEFF]*[=+@-]|^[\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};
export const financeCsv = (payments: FinancePayment[]): string => {
  const header = [
    'payment_id',
    'created_at_utc',
    'status',
    'source',
    'subject',
    'amount_usd',
    'currency',
    'student',
    'teacher',
  ];
  const records = payments.map((p) => [
    p.id,
    p.created_at,
    p.status,
    p.kind,
    p.subject,
    (p.amount_cents / 100).toFixed(2),
    p.currency,
    p.student,
    p.teacher,
  ]);
  return `\uFEFF${[header, ...records].map((row) => row.map(csvCell).join(',')).join('\r\n')}\r\n`;
};
