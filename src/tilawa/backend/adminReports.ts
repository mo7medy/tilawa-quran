/* eslint-disable import/prefer-default-export -- Named API handler. */
/* eslint-disable react-func/max-lines-per-function -- Validate and authorize the complete read-only report request together. */
/* eslint-disable @typescript-eslint/naming-convention -- Existing database RPC parameters. */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';

import { BackendError } from '@/lib/supabase/server';
import { financeCsv, validReportRange } from '@/tilawa/adminReports';
import type { AdminFinanceReport } from '@/tilawa/adminReportTypes';

const parameter = (value: string | string[] | undefined, fallback: string): string => {
  if (Array.isArray(value)) throw new BackendError('INVALID_REPORT_RANGE', 422);
  return value ?? fallback;
};
export const handleAdminReports = async (
  req: NextApiRequest,
  res: NextApiResponse,
  client: SupabaseClient,
  section: string,
): Promise<void> => {
  if (!['overview', 'finance'].includes(section)) throw new BackendError('NOT_FOUND', 404);
  const from = parameter(req.query.from, '');
  const until = parameter(req.query.until, '');
  const status = parameter(req.query.status, 'all');
  const kind = parameter(req.query.kind, 'all');
  const page = parameter(req.query.page, '1');
  const format = parameter(req.query.format, 'json');
  if (
    !validReportRange({ from, until }) ||
    !/^[1-9]\d{0,5}$/.test(page) ||
    Number(page) > 100000 ||
    !['all', 'paid', 'pending', 'failed', 'refunded'].includes(status) ||
    !['all', 'academy', 'teacher', 'lesson'].includes(kind) ||
    !['json', 'csv'].includes(format) ||
    (section !== 'finance' && format === 'csv')
  ) {
    throw new BackendError('INVALID_REPORT_RANGE', 422);
  }
  const result =
    section === 'overview'
      ? await client.rpc('tilawa_admin_overview', { p_from: from, p_until: until })
      : await client.rpc('tilawa_admin_finance', {
          p_from: from,
          p_until: until,
          p_status: status,
          p_kind: kind,
          p_page: Number(page),
          p_export: format === 'csv',
        });
  if (result.error) {
    if (result.error.code === 'PGRST202') throw new BackendError('ADMIN_REPORTS_UNAVAILABLE', 503);
    throw result.error;
  }
  if (format === 'csv') {
    const report = result.data as AdminFinanceReport;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="tilawa-payments-${from}-${until}.csv"`,
    );
    res.status(200).send(financeCsv(report.payments));
    return;
  }
  res.status(200).json({ data: result.data });
};
