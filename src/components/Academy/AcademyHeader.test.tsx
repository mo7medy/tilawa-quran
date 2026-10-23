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
  it('keeps Quran selected on a chapter route while preserving reader actions', () => {
    session.userId = 'student';
    route.asPath = '/ar/2/255';
    const readerAction = 'Reader settings';
    render(<AcademyHeader actions={<button type="button">{readerAction}</button>} />);
    const nav = within(screen.getByRole('navigation', { name: 'site-nav.nav-label' }));
    expect(
      nav.getByRole('link', { name: 'site-nav.header.read-quran' }).getAttribute('aria-current'),
    ).toBe('page');
    expect(screen.getByRole('button', { name: readerAction })).toBeDefined();
  });

  it('marks the localized message route active and exposes its unread count', () => {
    session.userId = 'signed-in-user';
    session.snapshot = { unreadMessages: 4 };
    route.asPath = '/ar/profile/messages?conversation=chat-1';
    render(<AcademyHeader />);
    const nav = within(screen.getByRole('navigation', { name: 'site-nav.nav-label' }));
    const link = nav.getByRole('link', { name: /messages/ });
    expect(link.getAttribute('aria-current')).toBe('page');
    expect(within(link).getByLabelText('profile-ui.unread-messages').textContent).toBe('4');
    expect(
      nav.getByRole('link', { name: 'browse-teachers' }).getAttribute('aria-current'),
    ).toBeNull();
  });

  it('keeps one current item when viewing teacher lesson details', () => {
    session.userId = 'teacher';
    session.snapshot = { teacher: {} };
    route.asPath = '/dashboard/teacher/lessons';
    render(<AcademyHeader />);
    const nav = screen.getByRole('navigation', { name: 'site-nav.nav-label' });
    expect(within(nav).getByRole('link', { name: 'dashboard' }).getAttribute('aria-current')).toBe(
      'page',
    );
    expect(nav.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    expect(nav.querySelector('a a')).toBeNull();
  });

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
