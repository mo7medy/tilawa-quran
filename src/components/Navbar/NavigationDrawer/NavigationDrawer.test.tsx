/* eslint-disable react-func/max-lines-per-function -- Integration scenarios exercise nested dialogs and navigation. */
import React from 'react';

import { configureStore } from '@reduxjs/toolkit';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import NavigationDrawer from './NavigationDrawer';

import AcademyThemeProvider from '@/components/Academy/AcademyThemeProvider';
import navbarReducer, { setIsNavigationDrawerOpen } from '@/redux/slices/navbar';

const mocks = vi.hoisted(() => ({
  loggedIn: false,
  locale: 'en',
  labels: { account: 'Account', trigger: 'Open reader menu' },
  handlers: new Map<string, () => void>(),
  changeLanguage: vi.fn(async (locale: string, onComplete?: () => void) => onComplete?.()),
}));
vi.mock('next/router', () => ({
  useRouter: () => ({
    pathname: '/[chapterId]',
    locale: mocks.locale,
    locales: ['en', 'ar'],
    asPath: '/22',
    events: {
      on: (name: string, callback: () => void) => mocks.handlers.set(name, callback),
      off: (name: string) => mocks.handlers.delete(name),
    },
  }),
}));
vi.mock('next-translate/useTranslation', () => ({
  default: () => ({ t: (key: string) => key, lang: mocks.locale }),
}));
vi.mock('@/icons/globe.svg', () => ({ default: () => <svg aria-hidden="true" /> }));
vi.mock('@/utils/auth/login', () => ({ isLoggedIn: () => mocks.loggedIn }));
vi.mock('@/components/Account/AccountContext', () => ({
  useOptionalAccountPreview: () =>
    mocks.loggedIn ? { userId: 'reader-user', snapshot: { teacher: null } } : null,
}));
vi.mock('@/hooks/useGetContinueReadingUrl', () => ({ default: () => '/ar/22?startingVerse=1' }));
vi.mock('@/hooks/useLanguageChange', () => ({
  default: () => ({
    changingLocale: null,
    onLanguageChange: mocks.changeLanguage,
  }),
}));
vi.mock('../NavbarBody/ProfileAvatarButton', () => ({
  default: () => <button type="button">{mocks.labels.account}</button>,
}));

const renderMenu = () => {
  const store = configureStore({ reducer: { navbar: navbarReducer } });
  render(
    <Provider store={store}>
      <AcademyThemeProvider>
        <button
          type="button"
          data-testid="open-navigation-drawer"
          onClick={() => store.dispatch(setIsNavigationDrawerOpen(true))}
        >
          {mocks.labels.trigger}
        </button>
        <NavigationDrawer />
      </AcademyThemeProvider>
    </Provider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Open reader menu' }));
  return store;
};
beforeEach(() => {
  mocks.loggedIn = false;
  mocks.locale = 'en';
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mocks.handlers.clear();
});

describe('Reader shared glass navigation', () => {
  it('keeps site links, Quran tools and guest account actions in the shared panel', () => {
    renderMenu();
    const menu = screen.getByRole('dialog', { name: 'site-nav.header.menu-title' });
    expect(screen.getByTestId('navigation-drawer')).toBe(menu);
    expect(within(menu).getAllByRole('link', { name: 'site-nav.header.read-quran' })).toHaveLength(
      1,
    );
    expect(within(menu).getByRole('link', { name: 'read' }).getAttribute('href')).toBe(
      '/22?startingVerse=1',
    );
    expect(within(menu).getByRole('link', { name: 'my-quran' }).getAttribute('href')).toBe(
      '/my-quran',
    );
    expect(within(menu).getByRole('link', { name: 'reciters' }).getAttribute('href')).toBe(
      '/reciters',
    );
    expect(
      within(menu).getByRole('link', { name: 'site-nav.header.login' }).getAttribute('href'),
    ).toBe('/sign-in?r=%2F22');
    expect(
      within(menu)
        .getByRole('link', { name: 'site-nav.account.register-link' })
        .getAttribute('href'),
    ).toBe('/register');
  });

  it('closes with Escape, unlocks the header and restores its external trigger focus', async () => {
    const store = renderMenu();
    expect(store.getState().navbar.lockVisibilityState).toBe(true);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(store.getState().navbar.isNavigationDrawerOpen).toBe(false);
    expect(store.getState().navbar.lockVisibilityState).toBe(false);
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByTestId('open-navigation-drawer')),
    );
  });

  it('keeps the menu open when the nested language picker closes and uses reader language synchronization', async () => {
    renderMenu();
    fireEvent.click(screen.getByRole('button', { name: 'languages' }));
    const picker = screen.getByRole('dialog', { name: 'select-language' });
    fireEvent.keyDown(picker, { key: 'Escape' });
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'select-language' })).toBeNull(),
    );
    expect(screen.getByRole('dialog', { name: 'site-nav.header.menu-title' })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'languages' }));
    fireEvent.click(screen.getByTestId('language-item-ar'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(mocks.changeLanguage).toHaveBeenCalledWith('ar', expect.any(Function));
  });

  it('dismisses on route changes and preserves the signed-in account controls', async () => {
    mocks.loggedIn = true;
    mocks.locale = 'ar';
    const store = renderMenu();
    const menu = screen.getByRole('dialog');
    expect(menu.getAttribute('dir')).toBe('rtl');
    expect(within(menu).getByRole('link', { name: 'profile' }).getAttribute('href')).toBe(
      '/profile',
    );
    expect(within(menu).getByRole('button', { name: 'logout' })).toBeDefined();
    expect(within(menu).queryByRole('link', { name: 'site-nav.header.login' })).toBeNull();
    act(() => mocks.handlers.get('routeChangeComplete')?.());
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(store.getState().navbar.isNavigationDrawerOpen).toBe(false);
  });
});
