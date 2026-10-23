import type { ReactNode } from 'react';

import classNames from 'classnames';
import useTranslation from 'next-translate/useTranslation';

import AcademyAccountMenu from './AcademyAccountMenu';
import AcademyAccountShortcuts from './AcademyAccountShortcuts';
import styles from './AcademyHeader.module.scss';
import AcademyIcon from './AcademyIcon';
import AcademyLanguageSwitch from './AcademyLanguageSwitch';
import AcademyLink from './AcademyLink';
import AcademyMobileMenu from './AcademyMobileMenu';
import AcademyPrimaryNavigation from './AcademyPrimaryNavigation';
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
  const { signedIn } = useAccountNavigation();
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
        <AcademyPrimaryNavigation isReader={!!actions} />
        <div className={actions ? styles.readerActions : styles.actions}>
          <div className={actions ? styles.readerActions : styles.desktopActions}>
            {!signedIn && (
              <AcademyLink
                href={ROUTES.QURAN_HOME}
                ariaCurrent={actions ? 'page' : undefined}
                className={classNames(styles.readQuran, actions && styles.readerQuranLink)}
              >
                <AcademyIcon name="book" />
                {t('header.read-quran')}
              </AcademyLink>
            )}
            {actions || (
              <>
                <AcademyLanguageSwitch />
                <AcademyThemeControl isCompact />
                {!signedIn && (
                  <AcademyLink href="/sign-in" className={styles.login}>
                    <AcademyIcon name="user" />
                    {t('header.login')}
                  </AcademyLink>
                )}
              </>
            )}
          </div>
          {!actions && (
            <>
              <AcademyAccountShortcuts />
              <div className={styles.desktopActions}>{signedIn && <AcademyAccountMenu />}</div>
              <AcademyMobileMenu />
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default AcademyHeader;
