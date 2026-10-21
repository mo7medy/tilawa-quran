/* eslint-disable @typescript-eslint/naming-convention -- Supabase confirmation query names are protocol fields. */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { getServerSideProps } from '../../pages/auth/confirm';

const auth = vi.hoisted(() => ({ exchangeCodeForSession: vi.fn(), verifyOtp: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ serverSupabase: () => ({ auth }) }));
afterEach(() => vi.resetAllMocks());

const confirm = async (query: Record<string, string>) =>
  getServerSideProps({ req: {}, res: { setHeader: vi.fn() }, query, locale: 'en' } as never);

describe('Email confirmation callback', () => {
  it('exchanges a PKCE code and returns to the requested Arabic account page', async () => {
    auth.exchangeCodeForSession.mockResolvedValueOnce({ error: null });
    const result = await confirm({ code: 'test-code', next: '/profile/teacher', lang: 'ar' });
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith('test-code');
    expect(result).toEqual({ redirect: { destination: '/ar/profile/teacher', permanent: false } });
  });
  it('supports token-hash confirmation without external redirects', async () => {
    auth.verifyOtp.mockResolvedValueOnce({ error: null });
    const result = await confirm({
      token_hash: 'test-hash',
      type: 'email',
      next: '//external.example',
    });
    expect(auth.verifyOtp).toHaveBeenCalledWith({ type: 'email', token_hash: 'test-hash' });
    expect(result).toEqual({ redirect: { destination: '/profile', permanent: false } });
  });
  it('routes an expired or invalid link to a visible sign-in error', async () => {
    auth.exchangeCodeForSession.mockResolvedValueOnce({ error: { code: 'otp_expired' } });
    expect(await confirm({ code: 'expired', lang: 'ar' })).toEqual({
      redirect: { destination: '/ar/sign-in?authError=1', permanent: false },
    });
    expect(auth.verifyOtp).not.toHaveBeenCalled();
  });
});
