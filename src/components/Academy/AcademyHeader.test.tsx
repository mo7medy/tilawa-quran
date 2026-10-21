import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import AcademyHeader from './AcademyHeader';

const session = vi.hoisted(() => ({
  userId: undefined as string | undefined,
  snapshot: {} as Record<string, unknown>,
}));
const route = vi.hoisted(() => ({ locale: 'en', asPath: '/profile' }));
vi.mock('@/components/Account/AccountContext', () => ({
  useOptionalAccountPreview: () => session,
}));
vi.mock('next/router', () => ({ useRouter: () => route }));
vi.mock('next-translate/useTranslation', () => ({ default: () => ({ t: (key: string) => key }) }));
vi.mock('./AcademyLanguageSwitch', () => ({ default: () => null }));
vi.mock('./AcademyThemeControl', () => ({ default: () => null }));
vi.mock('./AcademyMobileMenu', () => ({ default: () => null }));

afterEach(() => {
  cleanup();
  session.userId = undefined;
  session.snapshot = {};
  route.asPath = '/profile';
});

describe('Account link visibility in the header', () => {
  it('offers daily student links and retains the teacher dashboard for a teacher', () => {
    session.userId = 'signed-in-user';
    const { rerender } = render(<AcademyHeader />);
    const nav = within(screen.getByRole('navigation', { name: 'site-nav.nav-label' }));
    expect(nav.getByRole('link', { name: 'browse-teachers' }).getAttribute('href')).toBe(
      '/teachers',
    );
    expect(nav.queryByRole('link', { name: 'site-nav.header.programs' })).toBeNull();
    session.snapshot = { teacher: {} };
    route.asPath = '/profile/learning';
    rerender(<AcademyHeader />);
    expect(nav.getByRole('link', { name: 'dashboard' }).getAttribute('href')).toBe(
      '/dashboard/teacher',
    );
  });

  it('shows login to guests, then replaces it with the account link after sign-in', () => {
    const { rerender } = render(<AcademyHeader />);
    expect(screen.queryByRole('link', { name: 'site-nav.header.my-account' })).toBeNull();
    expect(screen.getByRole('link', { name: 'site-nav.header.login' }).getAttribute('href')).toBe(
      '/sign-in',
    );
    session.userId = 'signed-in-user';
    rerender(<AcademyHeader />);
    expect(screen.getByRole('button', { name: 'profile-ui.account-menu' })).toBeDefined();
    expect(screen.queryByRole('link', { name: 'site-nav.header.login' })).toBeNull();
    session.userId = undefined;
    rerender(<AcademyHeader />);
    expect(screen.queryByRole('link', { name: 'site-nav.header.my-account' })).toBeNull();
    expect(screen.getByRole('link', { name: 'site-nav.header.login' })).toBeDefined();
  });
});
