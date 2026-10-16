/* eslint-disable react-func/max-lines-per-function */
import React from 'react';

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ACADEMY_THEME_STORAGE_KEY } from '../../tilawa/academyTheme';

import AcademyThemeControl from './AcademyThemeControl';
import AcademyThemeProvider from './AcademyThemeProvider';

vi.mock('next-translate/useTranslation', () => ({ default: () => ({ t: (key: string) => key }) }));

afterEach(() => {
  cleanup();
  localStorage.removeItem(ACADEMY_THEME_STORAGE_KEY);
  delete document.documentElement.dataset.tilawaTheme;
  delete document.documentElement.dataset.theme;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const renderTheme = (): ReturnType<typeof render> =>
  render(
    <AcademyThemeProvider>
      <AcademyThemeControl />
    </AcademyThemeProvider>,
  );

describe('Independent academy appearance', () => {
  it('persists the selected mode, restores it on remount, and leaves Quran settings intact', () => {
    document.documentElement.dataset.theme = 'sepia';
    const first = renderTheme();
    fireEvent.click(screen.getByRole('button', { name: 'appearance.dark' }));
    expect(document.documentElement.dataset.tilawaTheme).toBe('dark');
    expect(localStorage.getItem(ACADEMY_THEME_STORAGE_KEY)).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('sepia');
    first.unmount();
    renderTheme();
    expect(
      screen.getByRole('button', { name: 'appearance.dark' }).getAttribute('aria-pressed'),
    ).toBe('true');
  });

  it('tracks system changes only in Auto mode', () => {
    let change: (() => void) | undefined;
    const media = {
      matches: false,
      addEventListener: (eventName: string, callback: () => void): void => {
        change = callback;
      },
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal('matchMedia', () => media);
    renderTheme();
    media.matches = true;
    act(() => change?.());
    expect(document.documentElement.dataset.tilawaTheme).toBe('dark');
    fireEvent.click(screen.getByRole('button', { name: 'appearance.light' }));
    act(() => change?.());
    expect(document.documentElement.dataset.tilawaTheme).toBe('light');
  });

  it('allows switching even when saving preferences is blocked', () => {
    renderTheme();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Blocked');
    });
    fireEvent.click(screen.getByRole('button', { name: 'appearance.dark' }));
    expect(document.documentElement.dataset.tilawaTheme).toBe('dark');
  });

  it('synchronizes changes made in another tab', () => {
    renderTheme();
    localStorage.setItem(ACADEMY_THEME_STORAGE_KEY, 'dark');
    act(() =>
      window.dispatchEvent(
        new StorageEvent('storage', { key: ACADEMY_THEME_STORAGE_KEY, newValue: 'dark' }),
      ),
    );
    expect(document.documentElement.dataset.tilawaTheme).toBe('dark');
  });
});
