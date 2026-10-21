import { useCallback, useEffect } from 'react';

import { useRouter } from 'next/router';
import useTranslation from 'next-translate/useTranslation';
import { useDispatch, useSelector } from 'react-redux';

import { TestId } from '../../../../tests/test-ids';

import SiteLanguageDialog from '@/components/Academy/SiteLanguageDialog';
import SiteNavigationDrawer from '@/components/Academy/SiteNavigationDrawer';
import useGetContinueReadingUrl from '@/hooks/useGetContinueReadingUrl';
import useLanguageChange from '@/hooks/useLanguageChange';
import {
  selectIsNavigationDrawerOpen,
  setIsNavigationDrawerOpen,
  setLockVisibilityState,
} from '@/redux/slices/navbar';
import { getLoginNavigationUrl, getMyQuranNavigationUrl, RECITERS_URL } from '@/utils/navigation';
import { stripLocalePrefix } from '@/utils/tilawaRoutes';

const NavigationDrawer = (): JSX.Element => {
  const { t } = useTranslation('common');
  const { events, locales, asPath } = useRouter();
  const dispatch = useDispatch();
  const isOpen = useSelector(selectIsNavigationDrawerOpen);
  const continueReadingUrl = useGetContinueReadingUrl();
  const { changingLocale, onLanguageChange } = useLanguageChange();
  const onOpenChange = useCallback(
    (nextOpen: boolean): void => {
      dispatch(setIsNavigationDrawerOpen(nextOpen));
    },
    [dispatch],
  );
  const handleClose = useCallback((): void => onOpenChange(false), [onOpenChange]);

  useEffect(() => {
    events.on('routeChangeComplete', handleClose);
    return () => events.off('routeChangeComplete', handleClose);
  }, [events, handleClose]);

  useEffect(() => {
    if (!isOpen) return undefined;
    dispatch(setLockVisibilityState(true));
    return () => {
      dispatch(setLockVisibilityState(false));
    };
  }, [dispatch, isOpen]);

  const extraLinks = [
    { href: stripLocalePrefix(continueReadingUrl, locales ?? []), label: t('read') },
    { href: getMyQuranNavigationUrl(), label: t('my-quran') },
    { href: RECITERS_URL, label: t('reciters') },
  ];

  return (
    <SiteNavigationDrawer
      id="navigation-drawer"
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      extraLinks={extraLinks}
      loginHref={getLoginNavigationUrl(asPath)}
      languageControl={
        <SiteLanguageDialog
          changingLocale={changingLocale}
          onLanguageChange={onLanguageChange}
          onNavigate={handleClose}
        />
      }
      onCloseAutoFocus={(event) => {
        event.preventDefault();
        document
          .querySelector<HTMLButtonElement>(`[data-testid="${TestId.OPEN_NAVIGATION_DRAWER}"]`)
          ?.focus();
      }}
    />
  );
};

export default NavigationDrawer;
