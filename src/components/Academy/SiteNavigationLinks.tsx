import { useRouter } from 'next/router';
import useTranslation from 'next-translate/useTranslation';

import AcademyIcon from './AcademyIcon';
import AcademyLink from './AcademyLink';
import styles from './AcademyMobileMenu.module.scss';
import useAccountNavigation from './useAccountNavigation';

import { STUDENT_ACCOUNT_LINKS, TEACHER_ACCOUNT_LINKS } from '@/tilawa/account/navigation';
import SITE_NAVIGATION_LINKS from '@/tilawa/siteNavigation';
import { stripLocalePrefix } from '@/utils/tilawaRoutes';

const SiteNavigationLinks = ({
  onNavigate,
  extraLinks,
}: {
  onNavigate: () => void;
  extraLinks: readonly { href: string; label: string }[];
}): JSX.Element => {
  const { signedIn, teacher, primaryHref, primaryKey } = useAccountNavigation();
  const { t } = useTranslation('account');
  const { t: common } = useTranslation('common');
  const router = useRouter();
  const current = stripLocalePrefix(
    (router.asPath || router.pathname).split(/[?#]/)[0],
    router.locales ?? ['en', 'ar'],
  );
  const accountLinks = teacher
    ? [
        ...TEACHER_ACCOUNT_LINKS.filter(
          ([to]) => !['/profile/messages', '/profile/notifications'].includes(to),
        ).map(([href, key]) => ({ href, key })),
        { href: '/profile/settings', key: 'settings' },
      ]
    : STUDENT_ACCOUNT_LINKS;
  const primaryLinks = signedIn
    ? accountLinks.map(({ href, key }) => ({ href, label: t(key) }))
    : [...SITE_NAVIGATION_LINKS, { href: '/quran', key: 'read-quran' }].map(({ href, key }) => ({
        href,
        label: common(`site-nav.header.${key}`),
      }));
  const quickLinks = signedIn
    ? [
        { href: primaryHref, label: t(primaryKey) },
        { href: '/profile/messages', label: t('messages') },
        { href: '/quran', label: t('profile-ui.read-quran') },
        { href: '/profile/notifications', label: t('notifications') },
      ].filter(({ href }) => !primaryLinks.some((link) => link.href === href))
    : [];
  const groups = [
    { links: primaryLinks, quick: false },
    { links: [...quickLinks, ...extraLinks], quick: signedIn },
  ];
  return (
    <nav className={styles.navigation} aria-label={common('site-nav.nav-label')}>
      {groups.map(({ links, quick }, group) =>
        links.length ? (
          <div key={group === 0 ? 'primary' : 'extra'} className={styles.linkGroup}>
            {quick && <h3 className={styles.groupTitle}>{t('profile-ui.quick-links')}</h3>}
            <div className={`${styles.links} ${quick ? styles.quickLinks : ''}`}>
              {links.map(({ href, label }) => (
                <AcademyLink
                  key={href}
                  href={href}
                  onClick={onNavigate}
                  ariaCurrent={current === href ? 'page' : undefined}
                >
                  <span>{label}</span>
                  {!quick && <AcademyIcon name="arrow" />}
                </AcademyLink>
              ))}
            </div>
          </div>
        ) : null,
      )}
    </nav>
  );
};

export default SiteNavigationLinks;
