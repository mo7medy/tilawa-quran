/* eslint-disable react-func/max-lines-per-function */
import { runInNewContext } from 'node:vm';

import { describe, expect, it, vi } from 'vitest';

import { ACADEMY_THEME_INIT_SCRIPT, parseAcademyTheme, resolveAcademyTheme } from './academyTheme';

describe('Academy theme first paint', () => {
  it.each([
    ['dark', false, 'dark'],
    ['light', true, 'light'],
    ['invalid', true, 'dark'],
    [null, false, 'light'],
  ] as const)(
    'applies saved %s with system dark %s before React renders',
    (saved, isDark, expected) => {
      const setAttribute = vi.fn();
      runInNewContext(ACADEMY_THEME_INIT_SCRIPT, {
        localStorage: { getItem: () => saved },
        window: { matchMedia: () => ({ matches: isDark }) },
        document: { documentElement: { setAttribute } },
      });
      expect(setAttribute).toHaveBeenCalledTimes(1);
      expect(setAttribute).toHaveBeenCalledWith('data-tilawa-theme', expected);
      expect(resolveAcademyTheme(parseAcademyTheme(saved), isDark)).toBe(expected);
    },
  );

  it('still paints the system theme when browser storage is unavailable', () => {
    const setAttribute = vi.fn();
    runInNewContext(ACADEMY_THEME_INIT_SCRIPT, {
      localStorage: {
        getItem: () => {
          throw new Error('Blocked');
        },
      },
      window: { matchMedia: () => ({ matches: true }) },
      document: { documentElement: { setAttribute } },
    });
    expect(setAttribute).toHaveBeenCalledWith('data-tilawa-theme', 'dark');
  });
});
