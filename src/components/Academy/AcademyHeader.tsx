import type { ReactNode } from 'react';

import classNames from 'classnames';
import useTranslation from 'next-translate/useTranslation';

import SITE_NAVIGATION_LINKS from '../../tilawa/siteNavigation';

import AcademyAccountMenu from './AcademyAccountMenu';
import AcademyAccountShortcuts from './AcademyAccountShortcuts';
import styles from './AcademyHeader.module.scss';
import AcademyLanguageSwitch from './AcademyLanguageSwitch';
import AcademyLink from './AcademyLink';
import AcademyMobileMenu from './AcademyMobileMenu';
import AcademyThemeControl from './AcademyThemeControl';
import useAccountNavigation from './useAccountNavigation';

import { ROUTES } from '@/utils/navigation';

interface AcademyHeaderProps {
  actions?: ReactNode;
  isFixed?: boolean;
  isVisible?: boolean;
  isDimmed?: boolean;
}

const AcademyHeader = ({
  actions,
  isFixed = false,
  isVisible = true,
  isDimmed = false,
}: AcademyHeaderProps): JSX.Element => {
  const { signedIn, ready, primaryHref, primaryKey, unreadMessages } = useAccountNavigation();
  const { t: tAccount } = useTranslation('account');
  const { t: tCommon } = useTranslation('common');
  const t = (key: string): string => tCommon(`site-nav.${key}`);

  return (
    <header
      className={classNames(styles.header, {
        [styles.fixed]: isFixed,
        [styles.hidden]: !isVisible,
      })}
      data-testid={isFixed ? 'navbar' : 'academy-header'}
      data-isvisible={isVisible}
    >
      <div
        className={classNames(styles.inner, { [styles.dimmed]: isDimmed })}
        inert={isDimmed || !isVisible || undefined}
      >
        <AcademyLink
          href={ROUTES.ACADEMY_HOME}
          ariaLabel={tCommon('tilawa')}
          className={styles.brand}
        >
          <img
            src="/tilawa/logo.svg"
            alt={tCommon('tilawa')}
            className={styles.logo}
            width={36}
            height={36}
          />
          <span className={styles.brandName}>{tCommon('tilawa')}</span>
        </AcademyLink>
        <nav className={styles.nav} aria-label={t('nav-label')}>
          {signedIn ? (
            <>
              {ready && <AcademyLink href={primaryHref}>{tAccount(primaryKey)}</AcademyLink>}
              <AcademyLink href="/profile/messages">
                {tAccount('messages')}
                {unreadMessages > 0 && (
                  <span className={styles.inlineBadge}>
                    {unreadMessages > 99 ? '99+' : unreadMessages}
                  </span>
                )}
              </AcademyLink>
              <AcademyLink href={ROUTES.QURAN_HOME}>{t('header.read-quran')}</AcademyLink>
            </>
          ) : (
            SITE_NAVIGATION_LINKS.map(({ href, key }) => (
              <AcademyLink key={key} href={href}>
                {t(`header.${key}`)}
              </AcademyLink>
            ))
          )}
        </nav>
        <div className={actions ? styles.readerActions : styles.actions}>
          {!signedIn && (
            <AcademyLink
              href={ROUTES.QURAN_HOME}
              className={classNames(styles.readQuran, actions && styles.readerQuranLink)}
            >
              {t('header.read-quran')}
            </AcademyLink>
          )}
          {actions || (
            <>
              <AcademyLanguageSwitch />
              <AcademyThemeControl isCompact />
              {signedIn && <AcademyAccountMenu />}
              {!signedIn && (
                <AcademyLink href="/sign-in" className={styles.login}>
                  {t('header.login')}
                </AcademyLink>
              )}
            </>
          )}
        </div>
        {!actions && (
          <>
            <AcademyAccountShortcuts />
            <AcademyMobileMenu />
          </>
        )}
      </div>
    </header>
  );
};

export default AcademyHeader;
