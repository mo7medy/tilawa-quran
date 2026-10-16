import { useMemo } from 'react';

import type { AppProps } from 'next/app';

import AppContent from '@/components/AppContent/AppContent';
import FontPreLoader from '@/components/Fonts/FontPreLoader';
import { OnboardingProvider } from '@/components/Onboarding/OnboardingProvider';
import SessionIncrementor from '@/components/SessionIncrementor';
import ReduxProvider from '@/redux/Provider';
import DataContext from 'src/contexts/DataContext';
import ThemeProvider from 'src/styles/ThemeProvider';
import { AudioPlayerMachineProvider } from 'src/xstate/AudioPlayerMachineContext';
import ChaptersData from 'types/ChaptersData';

interface QuranPageProps {
  chaptersData?: ChaptersData;
  [key: string]: unknown;
}

interface QuranAppShellProps {
  Component: AppProps['Component'];
  pageProps: QuranPageProps;
  locale: string;
}

/**
 * Original Quran providers and tools, styled with the shared Tilawa palette.
 * Mounted for every non-academy route (`/quran` and all reader/auth routes).
 *
 * @param {QuranAppShellProps} props shell props
 * @returns {JSX.Element} the Quran shell
 */
const QuranAppShell = ({ Component, pageProps, locale }: QuranAppShellProps): JSX.Element => {
  // Pages without data fetching (e.g. `/login`) carry no chapters: fall back
  // to the same `{}` default the context itself declares — never undefined.
  // Memoized so the provider value keeps a stable reference across renders.
  const chaptersData = useMemo(() => pageProps.chaptersData ?? {}, [pageProps.chaptersData]);
  return (
    <>
      <FontPreLoader locale={locale} />
      <DataContext.Provider value={chaptersData}>
        <AudioPlayerMachineProvider>
          <ReduxProvider locale={locale}>
            <ThemeProvider>
              <OnboardingProvider>
                <AppContent Component={Component} pageProps={pageProps} />
              </OnboardingProvider>
            </ThemeProvider>
            <SessionIncrementor />
          </ReduxProvider>
        </AudioPlayerMachineProvider>
      </DataContext.Provider>
    </>
  );
};

export default QuranAppShell;
