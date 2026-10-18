import { useEffect } from 'react';

import { DirectionProvider } from '@radix-ui/react-direction';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import { useRouter } from 'next/router';

import AcademyShell from '@/components/Academy/AcademyShell';
import AcademyThemeProvider from '@/components/Academy/AcademyThemeProvider';
import AccountPreviewProvider from '@/components/Account/AccountPreviewProvider';
import GuestQuranImport from '@/components/Account/GuestQuranImport';
import QuranAppShell from '@/components/QuranAppShell';
import ThirdPartyScripts from '@/components/ThirdPartyScripts/ThirdPartyScripts';
import { AuthProvider } from '@/contexts/AuthContext';
import ToastContainerProvider from '@/dls/Toast/ToastProvider';
import { API_HOST } from '@/utils/api';
import { logAndRedirectUnsupportedLogicalCSS } from '@/utils/css';
import * as gtag from '@/utils/gtag';
import { getDir } from '@/utils/locale';
import { isAcademyRoutePathname } from '@/utils/tilawaRoutes';

import 'src/styles/reset.scss';
import 'src/styles/fonts.scss';
import 'src/styles/theme.scss';
import 'src/styles/global.scss';
import 'src/styles/variables.scss';
import 'src/styles/tilawa.scss';

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const { locale } = router;
  const resolvedLocale = locale ?? 'en';
  const languageDirection = getDir(resolvedLocale);
  // Academy pages (`/`, `/teachers`) mount the standalone Tilawa shell with
  // none of the Quran navbar/footer/audio/font stack. Everything else keeps
  // the reader provider tree via `QuranAppShell`, with shared site appearance.
  const isAcademyPage = isAcademyRoutePathname(router.pathname);

  useEffect(() => {
    const root = document.documentElement;

    // When switching between LTR/RTL locales, many off-canvas components use `[dir='rtl']`
    // transform overrides. If we flip `dir` while transitions are enabled, hidden drawers can
    // animate across the viewport (appearing to "open"). Disable transitions for 1 frame.
    const shouldDisableTransitions = root.dir !== languageDirection;
    if (shouldDisableTransitions) {
      root.dataset.disableTransitions = 'true';
    }

    root.dir = languageDirection;
    logAndRedirectUnsupportedLogicalCSS();

    if (shouldDisableTransitions) {
      const raf = requestAnimationFrame(() => {
        delete root.dataset.disableTransitions;
      });
      return () => cancelAnimationFrame(raf);
    }

    return undefined;
  }, [languageDirection]);

  useEffect(() => {
    const handleRouteChange = (url: string) => gtag.pageView(url);
    router.events.on('routeChangeComplete', handleRouteChange);
    return () => router.events.off('routeChangeComplete', handleRouteChange);
  }, [router.events]);

  return (
    <AccountPreviewProvider>
      <AcademyThemeProvider>
        <AuthProvider>
          <Head>
            <link rel="icon" href="/tilawa/logo.svg" type="image/svg+xml" />
            <link rel="apple-touch-icon" href="/tilawa/app_icon.png" />
            <link rel="manifest" href="/manifest.json" />
            <link rel="preconnect" href={API_HOST} />
            <script
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{
                __html: `window.__BUILD_INFO__ = {
              date: "${process.env.NEXT_PUBLIC_BUILD_DATE || new Date().toISOString()}",
              hash: "${process.env.NEXT_PUBLIC_COMMIT_HASH || 'development'}",
              version: "${process.env.NEXT_PUBLIC_APP_VERSION || ''}",
              env: "${process.env.NEXT_PUBLIC_APP_ENV}"
            }`,
              }}
            />
          </Head>
          <DirectionProvider dir={languageDirection}>
            <TooltipProvider>
              <ToastContainerProvider>
                <GuestQuranImport />
                {isAcademyPage ? (
                  <AcademyShell>
                    <Component {...pageProps} />
                  </AcademyShell>
                ) : (
                  <QuranAppShell
                    Component={Component}
                    pageProps={pageProps}
                    locale={resolvedLocale}
                  />
                )}
              </ToastContainerProvider>
            </TooltipProvider>
          </DirectionProvider>
          <ThirdPartyScripts />
        </AuthProvider>
      </AcademyThemeProvider>
    </AccountPreviewProvider>
  );
}

export default MyApp;
