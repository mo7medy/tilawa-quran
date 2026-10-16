import React from 'react';

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import AcademyAccount from './AcademyAccount';

const state = vi.hoisted(() => ({
  query: { r: '/ar/quran', package: 'progress', subject: 'quran', gift: 'memorization' } as Record<
    string,
    string
  >,
}));
vi.mock('next/router', () => ({
  useRouter: () => ({ query: state.query, locale: 'en' }),
}));
vi.mock('next-translate/useTranslation', () => ({
  default: () => ({ t: (key: string) => key, lang: 'en' }),
}));
afterEach(cleanup);

describe('Shared account pages', () => {
  it('uses the new sign-in form and keeps context on registration and recovery links', () => {
    render(<AcademyAccount mode="sign-in" />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('account.sign-in.title');
    expect(screen.getByLabelText('account.email')).toBeDefined();
    expect(screen.queryByLabelText('account.name')).toBeNull();
    const register = screen.getByRole('link', { name: 'account.register-link' });
    const registerUrl = new URL(register.getAttribute('href')!, 'https://tilawa.example');
    expect(registerUrl.pathname).toBe('/register');
    expect(registerUrl.searchParams.get('r')).toBe('/ar/quran');
    expect(registerUrl.searchParams.get('package')).toBe('progress');
    const recovery = screen.getByRole('link', { name: 'account.forgot-password' });
    expect(recovery.getAttribute('href')).toContain('recovery=1');
    expect(recovery.getAttribute('href')).toContain('r=%2Far%2Fquran');
  });

  it('uses the new registration form and preserves the return path when switching to sign-in', () => {
    render(<AcademyAccount mode="register" />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('account.register.title');
    expect(screen.getByLabelText('account.name')).toBeDefined();
    const login = screen.getByRole('link', { name: 'header.login' });
    expect(login.getAttribute('href')).toContain('/sign-in?');
    expect(login.getAttribute('href')).toContain('r=%2Far%2Fquran');
  });
});
