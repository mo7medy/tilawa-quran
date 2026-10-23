import { useRouter } from 'next/router';
import useTranslation from 'next-translate/useTranslation';

import SITE_NAVIGATION_LINKS from '../../tilawa/siteNavigation';

import styles from './AcademyHeader.module.scss';
import AcademyIcon from './AcademyIcon';
import type { AcademyIconName } from './AcademyIcon';
import AcademyLink from './AcademyLink';
import useAccountNavigation from './useAccountNavigation';

import { isAccountLinkActive } from '@/tilawa/account/navigation';
import { ROUTES } from '@/utils/navigation';
import { stripLocalePrefix } from '@/utils/tilawaRoutes';

const AcademyPrimaryNavigation = ({ isReader = false }: { isReader?: boolean }): JSX.Element => {
  const { signedIn, ready, teacher, primaryHref, primaryKey, unreadMessages } =
    useAccountNavigation();
  const { t: tAccount } = useTranslation('account');
  const { t: tCommon } = useTranslation('common');
  const t = (key: string): string => tCommon(`site-nav.${key}`);
  const router = useRouter();
  const current = stripLocalePrefix(
    (router.asPath || router.pathname || '/').split('?')[0],
    router.locales ?? ['en', 'ar'],
  );
  const links: { href: string; label: string; icon: AcademyIconName; unread?: number }[] = signedIn
    ? [
        ...(ready
          ? [
              {
                href: primaryHref,
                label: tAccount(primaryKey),
                icon: (teacher ? 'dashboard' : 'search') as AcademyIconName,
              },
            ]
          : []),
        {
          href: '/profile/messages',
          label: tAccount('messages'),
          icon: 'chat',
          unread: unreadMessages,
        },
        { href: ROUTES.QURAN_HOME, label: t('header.read-quran'), icon: 'book' },
      ]
    : SITE_NAVIGATION_LINKS.map(({ href, key, icon }) => ({
        href,
        label: t(`header.${key}`),
        icon,
      }));

  const isCurrent = (href: string): boolean => {
    if (isReader && href === ROUTES.QURAN_HOME) return true;
    if (href.includes('#')) return current === href;
    return isAccountLinkActive(current.split('#')[0], href, links);
  };

  return (
    <nav className={styles.nav} aria-label={t('nav-label')}>
      {links.map(({ href, label, icon, unread }) => (
        <AcademyLink key={href} href={href} ariaCurrent={isCurrent(href) ? 'page' : undefined}>
          <AcademyIcon name={icon} />
          <span>{label}</span>
          {!!unread && (
            <span
              className={styles.inlineBadge}
              aria-label={tAccount('profile-ui.unread-messages', { count: unread })}
            >
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </AcademyLink>
      ))}
    </nav>
  );
};
export default AcademyPrimaryNavigation;
