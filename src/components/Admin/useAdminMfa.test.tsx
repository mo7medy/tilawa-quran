/* eslint-disable @typescript-eslint/naming-convention -- Supabase MFA response fixture keys. */
/* eslint-disable react-func/max-lines-per-function -- Complete factor lifecycle and failure scenarios. */
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import useAdminMfa from './useAdminMfa';

const api = vi.hoisted(() => ({
  listFactors: vi.fn(),
  enroll: vi.fn(),
  challengeAndVerify: vi.fn(),
  unenroll: vi.fn(),
  refreshSession: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock('../Account/useAccountUi', () => ({
  useAccountUi: () => ({ userId: 'administrator', refresh: api.refresh }),
}));
vi.mock('@/lib/supabase/browser', () => ({
  getSessionUserId: () => 'administrator',
  getBrowserSupabase: () => ({ auth: { mfa: api, refreshSession: api.refreshSession } }),
}));
beforeEach(() => {
  vi.clearAllMocks();
  api.listFactors.mockResolvedValue({ data: { totp: [] }, error: null });
  api.enroll.mockResolvedValue({
    data: { id: 'test-factor', totp: { qr_code: '<svg/>', secret: 'SYNTHETIC-TEST-ONLY' } },
    error: null,
  });
  api.challengeAndVerify.mockResolvedValue({ data: {}, error: null });
  api.unenroll.mockResolvedValue({ data: {}, error: null });
  api.refreshSession.mockResolvedValue({ data: {}, error: null });
});
describe('Administrator authenticator lifecycle', () => {
  it('enrolls only on explicit action, verifies the chosen factor and clears setup material', async () => {
    const { result } = renderHook(() => useAdminMfa());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(api.enroll).not.toHaveBeenCalled();
    await act(() => result.current.start());
    expect(result.current.pending?.id).toBe('test-factor');
    act(() => result.current.setCode('123456'));
    await act(() => result.current.verify());
    expect(api.challengeAndVerify).toHaveBeenCalledWith({
      factorId: 'test-factor',
      code: '123456',
    });
    expect(result.current.pending).toBeNull();
    expect(result.current.code).toBe('');
    expect(api.refresh).toHaveBeenCalled();
  });
  it('refreshes the Auth session before refreshing protected data after factor removal', async () => {
    const { result } = renderHook(() => useAdminMfa());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    await act(() => result.current.remove('verified-factor'));
    expect(api.unenroll).toHaveBeenCalledWith({ factorId: 'verified-factor' });
    expect(api.refreshSession.mock.invocationCallOrder[0]).toBeLessThan(
      api.refresh.mock.invocationCallOrder[0],
    );
  });
  it('retains the verification form and reports a rejected code', async () => {
    api.challengeAndVerify.mockResolvedValue({ error: new Error('Invalid code') });
    const { result } = renderHook(() => useAdminMfa());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    await act(() => result.current.start());
    act(() => result.current.setCode('000000'));
    await act(() => result.current.verify());
    expect(result.current.error).toBe(true);
    expect(result.current.pending?.id).toBe('test-factor');
    expect(api.refresh).not.toHaveBeenCalled();
  });
});
