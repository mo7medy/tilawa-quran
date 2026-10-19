/* eslint-disable @typescript-eslint/naming-convention -- Database payload fixture. */
/* eslint-disable react-func/max-lines-per-function -- Keep request scenarios together. */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { handleAdminReports } from './adminReports';

const rpc = vi.fn();
const client = { rpc } as unknown as SupabaseClient;
const request = (extra = {}): NextApiRequest =>
  ({ query: { from: '2026-02-01', until: '2026-03-01', ...extra } } as unknown as NextApiRequest);
const response = () => {
  const res = { setHeader: vi.fn(), status: vi.fn(), json: vi.fn(), send: vi.fn() };
  res.status.mockReturnValue(res);
  return res as unknown as NextApiResponse;
};
beforeEach(() => {
  vi.clearAllMocks();
  rpc.mockResolvedValue({ data: { payments: [] }, error: null });
});
describe('Administrative report API contract', () => {
  it('passes validated date, record filters and page to the protected RPC', async () => {
    await handleAdminReports(
      request({ status: 'paid', kind: 'teacher', page: '2' }),
      response(),
      client,
      'finance',
    );
    expect(rpc).toHaveBeenCalledWith('tilawa_admin_finance', {
      p_from: '2026-02-01',
      p_until: '2026-03-01',
      p_status: 'paid',
      p_kind: 'teacher',
      p_page: 2,
      p_export: false,
    });
  });
  it.each([
    { from: ['2026-02-01'] },
    { status: 'x' },
    { page: '0' },
    { page: '100001' },
    { until: '2026-02-01' },
    { format: 'html' },
  ])('rejects malformed queries before RPC %j', async (extra) => {
    await expect(
      handleAdminReports(request(extra), response(), client, 'finance'),
    ).rejects.toMatchObject({ code: 'INVALID_REPORT_RANGE' });
    expect(rpc).not.toHaveBeenCalled();
  });
  it('rejects unauthorized database results instead of returning an empty report', async () => {
    rpc.mockResolvedValue({ error: { code: '42501', message: 'ADMIN_REQUIRED' } });
    const res = response();
    await expect(handleAdminReports(request(), res, client, 'overview')).rejects.toMatchObject({
      code: '42501',
    });
    expect(res.json).not.toHaveBeenCalled();
  });
  it('distinguishes a missing migration from zero recorded payments', async () => {
    rpc.mockResolvedValue({ error: { code: 'PGRST202' } });
    await expect(
      handleAdminReports(request(), response(), client, 'overview'),
    ).rejects.toMatchObject({ code: 'ADMIN_REPORTS_UNAVAILABLE', status: 503 });
  });
  it('exports filtered records as an attachment through the same guarded RPC', async () => {
    const res = response();
    await handleAdminReports(request({ format: 'csv', status: 'paid' }), res, client, 'finance');
    expect(rpc.mock.calls[0][1].p_export).toBe(true);
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8');
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      expect.stringContaining('attachment;'),
    );
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('amount_usd'));
  });
});
