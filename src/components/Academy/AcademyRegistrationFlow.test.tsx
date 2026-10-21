import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import AcademyAccountForm from './AcademyAccountForm';

const state = vi.hoisted(() => ({ signUp: vi.fn(), push: vi.fn() }));
vi.mock('next/router', () => ({
  useRouter: () => ({ query: { r: '/ar/quran' }, locale: 'ar', push: state.push }),
}));
vi.mock('next-translate/useTranslation', () => ({ default: () => ({ t: (key: string) => key }) }));
vi.mock('@/lib/supabase/config', () => ({ isSupabaseConfigured: () => true }));
vi.mock('@/lib/supabase/browser', () => ({
  getBrowserSupabase: () => ({ auth: { signUp: state.signUp } }),
}));

beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'production');
  state.signUp.mockReset();
  state.push.mockReset();
});
afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.unstubAllEnvs();
});

const submit = () => {
  render(<AcademyAccountForm mode="register" />);
  fireEvent.change(screen.getByLabelText('account.name'), { target: { value: 'Learner' } });
  fireEvent.change(screen.getByLabelText('account.email'), {
    target: { value: 'learner@example.com' },
  });
  fireEvent.change(screen.getByLabelText('account.password'), { target: { value: 'Example123' } });
  fireEvent.submit(
    screen.getByRole('button', { name: 'account.register.submit' }).closest('form')!,
  );
};

describe('Live registration navigation', () => {
  it('opens an independent waiting page when confirmation is required', async () => {
    state.signUp.mockResolvedValueOnce({ data: { session: null }, error: null });
    submit();
    await waitFor(() => expect(state.push).toHaveBeenCalledOnce());
    expect(state.push.mock.calls[0][0]).toBe('/auth/check-email?next=%2Far%2Fquran');
    const stored = sessionStorage.getItem('tilawa-pending-confirmation')!;
    expect(stored).toContain('learner@example.com');
    expect(stored).not.toContain('Example123');
    expect(state.signUp.mock.calls[0][0].options.emailRedirectTo).toContain('/auth/confirm?');
  });
  it('does not show a waiting page for an already-established session', async () => {
    state.signUp.mockResolvedValueOnce({
      data: { session: {} },
      error: null,
    });
    submit();
    await waitFor(() => expect(state.push).toHaveBeenCalledWith('/ar/quran'));
    expect(sessionStorage.getItem('tilawa-pending-confirmation')).toBeNull();
  });
  it('stays on the form when registration fails', async () => {
    state.signUp.mockResolvedValueOnce({
      data: { session: null },
      error: { code: 'signup_failed' },
    });
    submit();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('auth-failed'));
    expect(state.push).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('tilawa-pending-confirmation')).toBeNull();
  });
});
