/* eslint-disable react-func/max-lines-per-function -- Keep the linked resend lifecycle assertions together. */
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import useEmailConfirmation from './useEmailConfirmation';

import { savePendingConfirmation } from '@/tilawa/backend/pendingConfirmation';

const state = vi.hoisted(() => ({ resend: vi.fn(), query: { next: '/ar/profile/teacher' } }));
vi.mock('next/router', () => ({ useRouter: () => ({ query: state.query, locale: 'ar' }) }));
vi.mock('@/lib/supabase/browser', () => ({
  getBrowserSupabase: () => ({ auth: { resend: state.resend } }),
}));

beforeEach(() => {
  vi.useFakeTimers();
  state.resend.mockReset();
  state.resend.mockResolvedValue({ error: null });
});
afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.useRealTimers();
});

describe('Confirmation email resend', () => {
  it('restores the address and enforces cooldown across remounts', async () => {
    savePendingConfirmation('learner@example.com', '/profile/teacher');
    const { result } = renderHook(() => useEmailConfirmation());
    expect(result.current.email).toBe('learner@example.com');
    expect(result.current.remaining).toBe(60);
    await act(async () => {
      await result.current.resend();
    });
    expect(state.resend).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(60000);
    });
    await act(async () => {
      await result.current.resend();
    });
    expect(state.resend).toHaveBeenCalledOnce();
    const request = state.resend.mock.calls[0][0];
    const redirect = new URL(request.options.emailRedirectTo);
    expect(request).toMatchObject({ type: 'signup', email: 'learner@example.com' });
    expect(redirect.origin).toBe(window.location.origin);
    expect(redirect.pathname).toBe('/auth/confirm');
    expect(redirect.searchParams.get('next')).toBe('/ar/profile/teacher');
    expect(redirect.searchParams.get('lang')).toBe('ar');
    expect(result.current.feedback).toBe('sent');
    expect(readEmail()).toBe('learner@example.com');
  });
  it('does not report success for rate limits or transport failures', async () => {
    const { result } = renderHook(() => useEmailConfirmation());
    act(() => result.current.setEmail('learner@example.com'));
    state.resend.mockResolvedValueOnce({ error: { status: 429 } });
    await act(async () => {
      await result.current.resend();
    });
    expect(result.current.feedback).toBe('rate-limited');
    act(() => {
      vi.advanceTimersByTime(60000);
    });
    state.resend.mockRejectedValueOnce(new Error('offline'));
    await act(async () => {
      await result.current.resend();
    });
    expect(result.current.feedback).toBe('failed');
    expect(result.current.busy).toBe(false);
  });
  it('allows only one pending resend request', async () => {
    let finish: (value: { error: null }) => void = () => {};
    state.resend.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const { result } = renderHook(() => useEmailConfirmation());
    act(() => result.current.setEmail('learner@example.com'));
    await act(async () => {
      const first = result.current.resend();
      await result.current.resend();
      finish({ error: null });
      await first;
    });
    expect(state.resend).toHaveBeenCalledOnce();
  });
});

const readEmail = (): string =>
  JSON.parse(sessionStorage.getItem('tilawa-pending-confirmation') || '{}').email;
