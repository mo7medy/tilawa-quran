import React from 'react';

import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import AcademyMobileMenu from './AcademyMobileMenu';

vi.mock('@/icons/globe.svg', () => ({ default: () => <svg aria-hidden="true" /> }));

vi.mock('next-translate/useTranslation', () => ({
  default: () => ({ t: (key: string) => key, lang: 'en' }),
}));
vi.mock('next/router', () => ({
  useRouter: () => ({
    pathname: '/pricing',
    locale: 'en',
    locales: ['en', 'ar'],
    asPath: '/pricing',
  }),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Mobile glass navigation', () => {
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
