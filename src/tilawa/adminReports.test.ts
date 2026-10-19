/* eslint-disable @typescript-eslint/naming-convention -- Payment response fixture. */
/* eslint-disable react-func/max-lines-per-function -- Group related boundary and CSV assertions. */
import { describe, expect, it } from 'vitest';

import {
  csvCell,
  financeCsv,
  periodRange,
  reportDate,
  shiftReportDate,
  validReportRange,
} from './adminReports';

describe('Administrative reporting boundaries', () => {
  it('rejects impossible dates and reversed or oversized ranges', () => {
    expect(reportDate('2026-02-29')).toBe(false);
    expect(reportDate('0000-01-01')).toBe(false);
    expect(reportDate('2024-02-29')).toBe(true);
    expect(validReportRange({ from: '2026-01-01', until: '2026-01-01' })).toBe(false);
    expect(validReportRange({ from: '2024-01-01', until: '2026-01-01' })).toBe(false);
    expect(validReportRange({ from: '2026-02-01', until: '2026-03-01' })).toBe(true);
  });
  it('uses UTC boundaries across time zones and daylight-saving changes', () => {
    expect(periodRange('today', new Date('2026-03-08T23:30:00-07:00'))).toEqual({
      from: '2026-03-09',
      until: '2026-03-10',
    });
    expect(periodRange('week', new Date('2026-03-09T00:00:00Z'))).toEqual({
      from: '2026-03-03',
      until: '2026-03-10',
    });
    expect(shiftReportDate('2024-02-28', 1)).toBe('2024-02-29');
  });
  it.each(['=HYPERLINK("x")', '  +cmd', '\t=cmd', '@SUM(A1)', '-cmd'])(
    'neutralises CSV formula text %s',
    (value) => {
      expect(csvCell(value).startsWith('"\'')).toBe(true);
    },
  );
  it('quotes commas and newlines and keeps currency amounts exact', () => {
    const csv = financeCsv([
      {
        id: 'payment',
        created_at: '2026-01-01T00:00:00Z',
        status: 'paid',
        kind: 'academy',
        subject: 'arabic',
        amount_cents: 8015,
        currency: 'USD',
        student: 'A,"B"\nC',
        teacher: null,
      },
    ]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('"80.15","USD"');
    expect(csv).toContain('"A,""B""\nC"');
  });
});
