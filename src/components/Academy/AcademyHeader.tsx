import type { ReactNode } from 'react';

import classNames from 'classnames';
import useTranslation from 'next-translate/useTranslation';

import SITE_NAVIGATION_LINKS from '../../tilawa/siteNavigation';

import styles from './AcademyHeader.module.scss';
import AcademyLanguageSwitch from './AcademyLanguageSwitch';
import AcademyLink from './AcademyLink';
import AcademyMobileMenu from './AcademyMobileMenu';
import AcademyThemeControl from './AcademyThemeControl';

import { useOptionalAccountPreview } from '@/components/Account/AccountContext';
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
  const account = useOptionalAccountPreview();
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
          {SITE_NAVIGATION_LINKS.map(({ href, key }) => (
            <AcademyLink key={key} href={href}>
              {t(`header.${key}`)}
            </AcademyLink>
          ))}
        </nav>
        <div className={actions ? styles.readerActions : styles.actions}>
          <AcademyLink
            href={ROUTES.QURAN_HOME}
            className={classNames(styles.readQuran, actions && styles.readerQuranLink)}
          >
            {t('header.read-quran')}
          </AcademyLink>
          {actions || (
            <>
              <AcademyLanguageSwitch />
              <AcademyThemeControl isCompact />
              <AcademyLink href="/profile" className={styles.readQuran}>
                {t('header.my-account')}
              </AcademyLink>
              {!account?.userId && (
                <AcademyLink href="/sign-in" className={styles.login}>
                  {t('header.login')}
                </AcademyLink>
              )}
            </>
          )}
        </div>
        {!actions && <AcademyMobileMenu />}
      </div>
    </header>
  );
};

export default AcademyHeader;
