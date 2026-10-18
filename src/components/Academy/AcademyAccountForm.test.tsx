import React from 'react';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import AcademyAccountForm from './AcademyAccountForm';

vi.mock('next/router', () => ({ useRouter: () => ({ query: {}, push: vi.fn() }) }));

vi.mock('next-translate/useTranslation', () => ({ default: () => ({ t: (key: string) => key }) }));
afterEach(cleanup);

describe('Account design preview', () => {
  it('toggles password visibility and clears credentials on preview submission', () => {
    render(<AcademyAccountForm mode="register" />);
    const password = screen.getByLabelText('account.password') as HTMLInputElement;
    fireEvent.change(password, { target: { value: 'Example123' } });
    fireEvent.click(screen.getByRole('button', { name: 'account.show-password' }));
    expect(password.type).toBe('text');
    fireEvent.submit(
      screen.getByRole('button', { name: 'account.register.submit' }).closest('form')!,
    );
    expect(password.value).toBe('');
    expect(password.type).toBe('password');
    expect(screen.getByRole('status').textContent).toContain('account.register.preview-result');
  });

  it('reports unconnected Google login and keeps recovery free of password fields', () => {
    const { unmount } = render(<AcademyAccountForm mode="sign-in" />);
    fireEvent.click(screen.getByRole('button', { name: 'account.google' }));
    expect(screen.getByRole('status').textContent).toContain('account.google-preview');
    unmount();
    render(<AcademyAccountForm mode="recovery" />);
    expect(screen.queryByLabelText('account.password')).toBeNull();
    expect(screen.queryByRole('button', { name: 'account.google' })).toBeNull();
    expect(screen.getByLabelText('account.email')).toBeDefined();
  });
});
