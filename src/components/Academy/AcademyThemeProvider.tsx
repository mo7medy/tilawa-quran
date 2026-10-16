/* eslint-disable react-func/max-lines-per-function */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import {
  ACADEMY_THEME_STORAGE_KEY,
  parseAcademyTheme,
  resolveAcademyTheme,
} from '../../tilawa/academyTheme';
import type { AcademyResolvedTheme, AcademyThemePreference } from '../../tilawa/academyTheme';

interface AcademyThemeContextValue {
  isReady: boolean;
  preference: AcademyThemePreference;
  resolvedTheme: AcademyResolvedTheme;
  setPreference: (preference: AcademyThemePreference) => void;
}

const AcademyThemeContext = createContext<AcademyThemeContextValue>({
  isReady: false,
  preference: 'system',
  resolvedTheme: 'light',
  setPreference: () => undefined,
});

// One appearance preference for the academy and the Quran UI. Reader font,
// audio and bookmark settings remain in their original Redux slices.
const AcademyThemeProvider = ({ children }: { children: ReactNode }): JSX.Element => {
  const [isReady, setIsReady] = useState(false);
  const [preference, setPreferenceState] = useState<AcademyThemePreference>('system');
  const [resolvedTheme, setResolvedTheme] = useState<AcademyResolvedTheme>('light');

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    let currentPreference: AcademyThemePreference = 'system';
    const apply = (): void => {
      const theme = resolveAcademyTheme(currentPreference, media?.matches ?? false);
      document.documentElement.dataset.tilawaTheme = theme;
      setResolvedTheme(theme);
      setPreferenceState(currentPreference);
      setIsReady(true);
    };
    const read = (): void => {
      try {
        currentPreference = parseAcademyTheme(localStorage.getItem(ACADEMY_THEME_STORAGE_KEY));
      } catch {
        currentPreference = 'system';
      }
      apply();
    };
    const handleStorage = (event: StorageEvent): void => {
      if (event.key === ACADEMY_THEME_STORAGE_KEY || event.key === null) read();
    };
    const handleChoice = (event: Event): void => {
      currentPreference = parseAcademyTheme((event as CustomEvent<string>).detail);
      apply();
    };
    read();
    media?.addEventListener('change', apply);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('tilawa-theme-change', handleChoice);
    return () => {
      media?.removeEventListener('change', apply);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('tilawa-theme-change', handleChoice);
    };
  }, []);

  const setPreference = useCallback((next: AcademyThemePreference): void => {
    try {
      localStorage.setItem(ACADEMY_THEME_STORAGE_KEY, next);
    } catch {
      // The current tab still works when storage is blocked or unavailable.
    }
    window.dispatchEvent(new CustomEvent('tilawa-theme-change', { detail: next }));
  }, []);

  const value = useMemo(
    () => ({ isReady, preference, resolvedTheme, setPreference }),
    [isReady, preference, resolvedTheme, setPreference],
  );

  return <AcademyThemeContext.Provider value={value}>{children}</AcademyThemeContext.Provider>;
};

export const useAcademyTheme = (): AcademyThemeContextValue => useContext(AcademyThemeContext);

export default AcademyThemeProvider;
