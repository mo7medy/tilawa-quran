/* eslint-disable react-func/max-lines-per-function */
import React from 'react';

import { configureStore } from '@reduxjs/toolkit';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it, vi } from 'vitest';

import AcademyThemeControl from '../components/Academy/AcademyThemeControl';
import AcademyThemeProvider from '../components/Academy/AcademyThemeProvider';
import { ACADEMY_THEME_STORAGE_KEY } from '../tilawa/academyTheme';

import ThemeProvider from './ThemeProvider';

let pathname = '/quran';
vi.mock('next/router', () => ({ useRouter: () => ({ pathname }) }));
vi.mock('next-translate/useTranslation', () => ({ default: () => ({ t: (key: string) => key }) }));
vi.mock('@/redux/slices/theme', () => ({
  selectTheme: (state: { theme: { type: string } }) => state.theme,
  setTheme: (value: string) => ({ type: 'theme/selected', payload: value }),
}));
vi.mock('@/redux/slices/QuranReader/font-faces', () => ({
  resetLoadedFontFaces: () => ({ type: 'fonts/reset' }),
}));

const createStore = (initialTheme = 'light') =>
  configureStore({
    reducer: (
      // Redux reducers accept state before action, including the initial default.
      // eslint-disable-next-line default-param-last
      state = {
        theme: { type: initialTheme },
        reader: { font: 'uthmani', fontScale: 3, reciter: 7, bookmark: '2:38' },
        fontResets: 0,
      },
      action,
    ) => {
      if (action.type === 'theme/selected') {
        return { ...state, theme: { type: String(action.payload) } };
      }
      if (action.type === 'fonts/reset') return { ...state, fontResets: state.fontResets + 1 };
      return state;
    },
  });

const view = (store: ReturnType<typeof createStore>, reader = true): JSX.Element => (
  <AcademyThemeProvider>
    <Provider store={store}>
      {reader ? (
        <ThemeProvider>
          <AcademyThemeControl />
        </ThemeProvider>
      ) : (
        <AcademyThemeControl />
      )}
    </Provider>
  </AcademyThemeProvider>
);

afterEach(() => {
  cleanup();
  pathname = '/quran';
  localStorage.removeItem(ACADEMY_THEME_STORAGE_KEY);
  delete document.body.dataset.theme;
  delete document.documentElement.dataset.tilawaTheme;
  vi.unstubAllGlobals();
});

describe('Shared Quran and academy appearance', () => {
  it('applies a saved site appearance without changing reading, reciter or bookmark settings', () => {
    localStorage.setItem(ACADEMY_THEME_STORAGE_KEY, 'dark');
    const store = createStore();
    const originalReader = store.getState().reader;
    render(view(store));
    expect(store.getState().theme.type).toBe('dark');
    expect(store.getState().reader).toEqual(originalReader);
    expect(document.body.dataset.theme).toBe('dark');
    expect(store.getState().fontResets).toBe(1);
  });

  it('carries a selection from the academy to the Quran shell and back', () => {
    const store = createStore();
    const screenView = render(view(store, false));
    fireEvent.click(screen.getByRole('button', { name: 'appearance.dark' }));
    screenView.rerender(view(store));
    expect(store.getState().theme.type).toBe('dark');
    fireEvent.click(screen.getByRole('button', { name: 'appearance.light' }));
    screenView.rerender(view(store, false));
    expect(
      screen.getByRole('button', { name: 'appearance.light' }).getAttribute('aria-pressed'),
    ).toBe('true');
    expect(localStorage.getItem(ACADEMY_THEME_STORAGE_KEY)).toBe('light');
  });

  it('keeps Auto and refreshes theme-aware fonts on system appearance changes', () => {
    let change: (() => void) | undefined;
    const media = {
      matches: false,
      addEventListener: (event: string, callback: () => void): void => {
        change = callback;
      },
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal('matchMedia', () => media);
    const store = createStore();
    render(view(store));
    expect(store.getState().theme.type).toBe('auto');
    const resets = store.getState().fontResets;
    media.matches = true;
    act(() => change?.());
    expect(document.body.dataset.theme).toBe('dark');
    expect(store.getState().fontResets).toBe(resets + 1);
  });

  it('does not let legacy Redux rehydration override the shared appearance', () => {
    localStorage.setItem(ACADEMY_THEME_STORAGE_KEY, 'dark');
    const store = createStore();
    render(view(store));
    act(() => store.dispatch({ type: 'theme/selected', payload: 'light' }));
    expect(store.getState().theme.type).toBe('dark');
    expect(document.documentElement.dataset.tilawaTheme).toBe('dark');
  });

  it('preserves independent embed settings', () => {
    pathname = '/embed/v1';
    localStorage.setItem(ACADEMY_THEME_STORAGE_KEY, 'dark');
    const store = createStore('sepia');
    render(view(store));
    expect(store.getState().theme.type).toBe('sepia');
    expect(store.getState().fontResets).toBe(0);
  });
});
