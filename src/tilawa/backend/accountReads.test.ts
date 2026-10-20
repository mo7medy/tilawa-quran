/* eslint-disable @typescript-eslint/naming-convention, react-func/max-lines-per-function -- Wire fixtures and complete request scenarios. */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import { describe, expect, it, vi } from 'vitest';

import { handleAccountReads, handleAdminReads, readPage, readUuid } from './accountReads';

vi.mock('./teachers', () => ({ signSnapshot: async (_client: unknown, data: unknown) => data }));
const req = (query: NextApiRequest['query']): NextApiRequest => ({ query } as NextApiRequest);
const response = (): NextApiResponse => ({ json: vi.fn() } as unknown as NextApiResponse);
describe('Bounded account/admin read API', () => {
  it('rejects repeated parameters, malformed UUIDs and oversized pages before any RPC', () => {
    expect(() => readPage(['1', '2'])).toThrow('INVALID_INPUT');
    expect(() => readPage('100001')).toThrow('INVALID_INPUT');
    expect(() => readPage('1.5')).toThrow('INVALID_INPUT');
    expect(() => readUuid('------------------------------------')).toThrow('INVALID_INPUT');
  });
  it('preserves owner-scoped view identifiers and stable pages at the SQL boundary', async () => {
    const rpc = vi.fn(async () => ({ data: { pagination: { total: 0 } }, error: null }));
    const res = response();
    await handleAccountReads(
      req({ view: 'lesson', id: '00000000-0000-4000-8000-000000000001', page: '2' }),
      res,
      { rpc } as unknown as SupabaseClient,
    );
    expect(rpc).toHaveBeenCalledWith('tilawa_account_view', {
      p_view: 'lesson',
      p_id: '00000000-0000-4000-8000-000000000001',
      p_page: 2,
      p_status: 'all',
    });
  });
  it('does not silently turn a denied administrator directory into an empty success', async () => {
    const rpc = vi.fn(async () => ({
      data: null,
      error: { code: '42501', message: 'ADMIN_REQUIRED' },
    }));
    const res = response();
    await expect(
      handleAdminReads(req({}), res, { rpc } as unknown as SupabaseClient, [
        'admin',
        'lists',
        'students',
      ]),
    ).rejects.toMatchObject({ code: '42501' });
    expect(res.json).not.toHaveBeenCalled();
  });
});
