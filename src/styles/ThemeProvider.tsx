import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

import { useRouter } from 'next/router';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';

import { useAcademyTheme } from '@/components/Academy/AcademyThemeProvider';
import { resetLoadedFontFaces } from '@/redux/slices/QuranReader/font-faces';
import { selectTheme, setTheme } from '@/redux/slices/theme';
import ThemeType from '@/redux/types/ThemeType';
import type { AcademyResolvedTheme } from '@/tilawa/academyTheme';

const READER_THEMES = { system: ThemeType.Auto, dark: ThemeType.Dark, light: ThemeType.Light };

// Keep theme-aware Quran fonts/widgets in sync with the shared site appearance.
// Embeds retain their independent, URL-configured reading theme.
const ThemeProvider = ({ children }: { children: ReactNode }): JSX.Element => {
  const { pathname } = useRouter();
  const { isReady, preference, resolvedTheme } = useAcademyTheme();
  const theme = useSelector(selectTheme, shallowEqual);
  const dispatch = useDispatch();
  const previousTheme = useRef<AcademyResolvedTheme | null>(null);
  const isEmbed = pathname === '/embed/v1';

  useEffect(() => {
    if (!isReady || isEmbed) return;
    const readerTheme = READER_THEMES[preference];
    if (theme.type !== readerTheme) dispatch(setTheme(readerTheme));
    if (
      theme.type !== readerTheme ||
      (previousTheme.current && previousTheme.current !== resolvedTheme)
    ) {
      dispatch(resetLoadedFontFaces());
    }
    previousTheme.current = resolvedTheme;
  }, [dispatch, isReady, isEmbed, preference, resolvedTheme, theme.type]);

  useEffect(() => {
    document.body.dataset.theme = isEmbed ? theme.type : resolvedTheme;
  }, [isEmbed, resolvedTheme, theme.type]);

  return <div data-tilawa-reader>{children}</div>;
};

export default ThemeProvider;
