import React, { useCallback } from 'react';

import { useRouter } from 'next/router';
import useTranslation from 'next-translate/useTranslation';
import { useDispatch } from 'react-redux';

import SITE_NAVIGATION_LINKS from '../../../tilawa/siteNavigation';

import NavigationDrawerItem from './NavigationDrawerItem';

import useGetContinueReadingUrl from '@/hooks/useGetContinueReadingUrl';
import IconBookmarkFilled from '@/icons/bookmark_filled.svg';
import IconHeadphonesFilled from '@/icons/headphones-filled.svg';
import IconHome from '@/icons/home.svg';
import { setIsNavigationDrawerOpen } from '@/redux/slices/navbar';
import { logButtonClick } from '@/utils/eventLogger';
import { getMyQuranNavigationUrl, RECITERS_URL, ROUTES } from '@/utils/navigation';
import { stripLocalePrefix, withLocalePrefix } from '@/utils/tilawaRoutes';

const NavigationDrawerList = (): JSX.Element => {
  const { t } = useTranslation('common');
  const dispatch = useDispatch();
  const { locale, locales } = useRouter();
  const continueReadingUrl = useGetContinueReadingUrl();

  const ITEMS = [
    {
      title: t('academy'),
      icon: <IconHome />,
      href: ROUTES.ACADEMY_HOME,
      eventName: 'navigation_drawer_academy',
    },
    ...SITE_NAVIGATION_LINKS.map(({ href, key }) => ({
      title: t(`site-nav.header.${key}`),
      icon: <IconHome />,
      href,
      eventName: `navigation_drawer_${key}`,
    })),
    {
      title: t('read-quran'),
      icon: <IconHome />,
      href: ROUTES.QURAN_HOME,
      eventName: 'navigation_drawer_quran_home',
    },
    {
      title: t('read'),
      icon: <IconHome />,
      href: continueReadingUrl,
      eventName: 'navigation_drawer_read',
    },
    {
      title: t('my-quran'),
      icon: <IconBookmarkFilled />,
      href: getMyQuranNavigationUrl(),
      eventName: 'navigation_drawer_my_quran',
    },
    {
      title: t('reciters'),
      icon: <IconHeadphonesFilled />,
      href: RECITERS_URL,
      eventName: 'navigation_drawer_reciters',
    },
  ];

  const handleItemClick = useCallback(
    (eventName: string) => {
      dispatch(setIsNavigationDrawerOpen(false));
      logButtonClick(eventName);
    },
    [dispatch],
  );

  return (
    <>
      {ITEMS.map((item) => {
        return (
          <NavigationDrawerItem
            key={item.eventName}
            title={item.title}
            icon={item.icon}
            href={withLocalePrefix(stripLocalePrefix(item.href, locales ?? []), locale)}
            onClick={() => handleItemClick(item.eventName)}
          />
        );
      })}
    </>
  );
};

export default NavigationDrawerList;
