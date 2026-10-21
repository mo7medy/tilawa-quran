import React from 'react';

import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import AcademyMobileMenu from './AcademyMobileMenu';

const session = vi.hoisted(() => ({ userId: undefined as string | undefined }));
const route = vi.hoisted(() => ({
  pathname: '/pricing',
  locale: 'en',
  locales: ['en', 'ar'],
  asPath: '/pricing',
}));
vi.mock('@/components/Account/AccountContext', () => ({
  useOptionalAccountPreview: () => session,
}));
vi.mock('@/icons/globe.svg', () => ({ default: () => <svg aria-hidden="true" /> }));

vi.mock('next-translate/useTranslation', () => ({
  default: () => ({ t: (key: string) => key, lang: 'en' }),
}));
vi.mock('next/router', () => ({ useRouter: () => route }));

afterEach(() => {
  cleanup();
  session.userId = undefined;
  route.pathname = '/pricing';
  route.asPath = '/pricing';
  vi.unstubAllGlobals();
});

describe('Mobile glass navigation', () => {
  it('marks the localized account route active and separates daily shortcuts', () => {
    session.userId = 'signed-in-user';
    route.pathname = '/profile/[[...section]]';
    route.asPath = '/ar/profile/settings?from=menu';
    render(<AcademyMobileMenu />);
    fireEvent.click(screen.getByRole('button', { name: 'site-nav.header.open-menu' }));
    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByRole('link', { name: 'settings' }).getAttribute('aria-current')).toBe(
      'page',
    );
    expect(dialog.getByRole('heading', { name: 'profile-ui.quick-links' })).toBeDefined();
    expect(dialog.getAllByRole('link', { name: 'messages' })).toHaveLength(1);
    expect(dialog.getAllByRole('link', { name: 'profile-ui.read-quran' })).toHaveLength(1);
  });
  it('closes with Escape and returns focus to its trigger', async () => {
    render(<AcademyMobileMenu />);
    const trigger = screen.getByRole('button', { name: 'site-nav.header.open-menu' });
    fireEvent.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'site-nav.header.menu-title' });
    expect(dialog.contains(document.activeElement)).toBe(true);
    fireEvent.keyDown(dialog, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it('closes on navigation and retains all main routes', () => {
    render(<AcademyMobileMenu />);
    fireEvent.click(screen.getByRole('button', { name: 'site-nav.header.open-menu' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).queryByRole('link', { name: 'site-nav.header.my-account' })).toBeNull();
    expect(
      within(dialog).getByRole('link', { name: 'site-nav.header.read-quran' }).getAttribute('href'),
    ).toBe('/quran');
    expect(
      within(dialog)
        .getByRole('link', { name: 'site-nav.account.register-link' })
        .getAttribute('href'),
    ).toBe('/register');
    const pricingLink = within(dialog).getByRole('link', { name: 'site-nav.header.pricing' });
    pricingLink.addEventListener('click', (event) => event.preventDefault(), { once: true });
    fireEvent.click(pricingLink);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('hides account links immediately when a signed-in visitor signs out', () => {
    session.userId = 'signed-in-user';
    const { rerender } = render(<AcademyMobileMenu />);
    fireEvent.click(screen.getByRole('button', { name: 'site-nav.header.open-menu' }));
    expect(screen.getAllByRole('link', { name: 'profile' }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('link', { name: 'site-nav.header.login' })).toBeNull();
    session.userId = undefined;
    rerender(<AcademyMobileMenu />);
    expect(screen.queryByRole('link', { name: 'profile' })).toBeNull();
    expect(screen.getByRole('link', { name: 'site-nav.header.login' })).toBeDefined();
  });

  it('dismisses an open panel when the viewport returns to desktop', async () => {
    let resize: (() => void) | undefined;
    const media = {
      matches: false,
      addEventListener: (eventName: string, listener: () => void): void => {
        resize = listener;
      },
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal('matchMedia', () => media);
    render(<AcademyMobileMenu />);
    fireEvent.click(screen.getByRole('button', { name: 'site-nav.header.open-menu' }));
    expect(screen.getByRole('dialog')).toBeDefined();
    media.matches = true;
    act(() => resize?.());
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
