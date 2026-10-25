/* eslint-disable react-func/max-lines-per-function -- Session races need complete setup and lifecycle assertions. */
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { StudioClientError } from './client';
import useStudioSession, { StudioSession } from './useStudioSession';

type AuthCallback = (event: string, session: { user: { id: string } } | null) => void;
const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  callback: null as AuthCallback | null,
}));
vi.mock('./client', async (original) => ({
  ...(await original<typeof import('./client')>()),
  studioRequest: mocks.request,
}));
vi.mock('@/lib/supabase/config', () => ({ isSupabaseConfigured: () => true }));
vi.mock('@/lib/supabase/browser', () => ({
  getBrowserSupabase: () => ({ auth: { onAuthStateChange: mocks.subscribe } }),
}));

const owner = (scope = 'user:one'): StudioSession => ({
  scope,
  registered: scope.startsWith('user:'),
  quota: {
    remaining: 10,
    limit: 10,
    maxDurationMs: 180000,
    storageBytes: 0,
    storageLimit: 1073741824,
    resetAt: Date.now() + 86400000,
    available: true,
  },
});
const emit = (event: string, id?: string): void => {
  mocks.callback?.(event, id ? { user: { id } } : null);
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.request.mockReset().mockResolvedValue(owner());
  mocks.callback = null;
  mocks.subscribe.mockImplementation((callback: AuthCallback) => {
    mocks.callback = callback;
    return { data: { subscription: { unsubscribe: mocks.unsubscribe } } };
  });
});
afterEach(cleanup);

describe('studio session lifecycle', () => {
  it.each(['SIGNED_IN', 'TOKEN_REFRESHED', 'USER_UPDATED'])(
    'keeps the editor session mounted while %s confirms the same account',
    async (event) => {
      const { result } = renderHook(useStudioSession);
      await waitFor(() => expect(result.current.session?.scope).toBe('user:one'));
      const previous = result.current.session;
      mocks.request.mockReturnValueOnce(new Promise(() => {}));
      await act(async () => emit(event, 'one'));
      expect(mocks.request).toHaveBeenCalledTimes(2);
      expect(result.current.session).toBe(previous);
    },
  );

  it('keeps the session while focus revalidates quota', async () => {
    const { result } = renderHook(useStudioSession);
    await waitFor(() => expect(result.current.session?.scope).toBe('user:one'));
    const previous = result.current.session;
    mocks.request.mockReturnValueOnce(new Promise(() => {}));
    act(() => window.dispatchEvent(new Event('focus')));
    expect(mocks.request).toHaveBeenCalledTimes(2);
    expect(result.current.session).toBe(previous);
  });

  it('preserves editing state through a transient refresh error and clears it on recovery', async () => {
    const { result } = renderHook(useStudioSession);
    await waitFor(() => expect(result.current.session?.scope).toBe('user:one'));
    const previous = result.current.session;
    mocks.request.mockRejectedValueOnce(new Error('Offline'));
    await act(async () => result.current.refresh());
    expect(result.current.session).toBe(previous);
    expect(result.current.error).toBe('NETWORK_ERROR');
    await act(async () => result.current.refresh());
    expect(result.current.session?.scope).toBe('user:one');
    expect(result.current.error).toBe('');
  });

  it('clears a changed account immediately and ignores a late response for the previous owner', async () => {
    const { result } = renderHook(useStudioSession);
    await waitFor(() => expect(result.current.session?.scope).toBe('user:one'));
    let release: (session: StudioSession) => void = vi.fn();
    const stale = new Promise<StudioSession>((resolve) => {
      release = resolve;
    });
    mocks.request.mockReturnValueOnce(stale).mockResolvedValueOnce(owner('user:two'));
    act(() => window.dispatchEvent(new Event('focus')));
    act(() => emit('SIGNED_IN', 'two'));
    expect(result.current.session).toBeNull();
    await waitFor(() => expect(result.current.session?.scope).toBe('user:two'));
    await act(async () => release(owner('user:one')));
    expect(result.current.session?.scope).toBe('user:two');
  });

  it('clears the previous account on sign-out before loading the guest session', async () => {
    const { result } = renderHook(useStudioSession);
    await waitFor(() => expect(result.current.session?.scope).toBe('user:one'));
    mocks.request.mockResolvedValueOnce(owner('guest:browser'));
    act(() => emit('SIGNED_OUT'));
    expect(result.current.session).toBeNull();
    await waitFor(() => expect(result.current.session?.scope).toBe('guest:browser'));
  });

  it('fails closed if the server rejects the account session', async () => {
    const { result } = renderHook(useStudioSession);
    await waitFor(() => expect(result.current.session?.scope).toBe('user:one'));
    mocks.request.mockRejectedValueOnce(new StudioClientError('AUTH_REQUIRED'));
    await act(async () => result.current.refresh());
    expect(result.current.session).toBeNull();
    expect(result.current.error).toBe('AUTH_REQUIRED');
  });

  it('unsubscribes and ignores queued auth notifications after unmount', async () => {
    const { result, unmount } = renderHook(useStudioSession);
    await waitFor(() => expect(result.current.session?.scope).toBe('user:one'));
    unmount();
    await act(async () => emit('SIGNED_IN', 'one'));
    expect(mocks.unsubscribe).toHaveBeenCalledOnce();
    expect(mocks.request).toHaveBeenCalledTimes(1);
  });
});
