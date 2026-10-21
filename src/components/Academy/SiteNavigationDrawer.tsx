/* eslint-disable react-func/max-lines-per-function -- Shared dialog layout keeps navigation and account controls together. */
import type { ReactNode } from 'react';

import * as Dialog from '@radix-ui/react-dialog';
import useTranslation from 'next-translate/useTranslation';

import AcademyDrawerAccount from './AcademyDrawerAccount';
import AcademyIcon from './AcademyIcon';
import AcademyLanguageSwitch from './AcademyLanguageSwitch';
import AcademyLink from './AcademyLink';
import styles from './AcademyMobileMenu.module.scss';
import AcademyThemeControl from './AcademyThemeControl';
import SiteNavigationLinks from './SiteNavigationLinks';
import useAccountNavigation from './useAccountNavigation';

interface SiteNavigationDrawerProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  trigger?: ReactNode;
  id?: string;
  extraLinks?: readonly { href: string; label: string }[];
  languageControl?: ReactNode;
  accountActions?: ReactNode;
  loginHref?: string;
  onCloseAutoFocus?: (event: Event) => void;
}

/**
 * The shared glass navigation panel for the academy and Quran reader.
 * @returns {JSX.Element} accessible navigation using the same layout and style in both shells
 */
const SiteNavigationDrawer = ({
  isOpen,
  onOpenChange,
  trigger,
  id,
  extraLinks = [],
  languageControl,
  accountActions,
  loginHref = '/sign-in',
  onCloseAutoFocus,
}: SiteNavigationDrawerProps): JSX.Element => {
  const { signedIn } = useAccountNavigation();
  const { t: tAccount } = useTranslation('account');
  const { t: tCommon, lang } = useTranslation('common');
  const t = (key: string): string => tCommon(`site-nav.${key}`);
  const handleClose = (): void => onOpenChange(false);

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      {trigger && <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content
          id={id}
          data-testid={id}
          className={`${styles.drawer} ${lang === 'ar' ? styles.arabic : ''}`}
          dir={lang === 'ar' ? 'rtl' : 'ltr'}
          onCloseAutoFocus={onCloseAutoFocus}
        >
          <div className={styles.top}>
            <AcademyLink href="/" className={styles.brand} onClick={handleClose}>
              <img src="/tilawa/logo.svg" alt="" width={32} height={32} />
              <span>{tCommon('tilawa')}</span>
            </AcademyLink>
            <Dialog.Close className={styles.close} aria-label={t('header.close-menu')}>
              <AcademyIcon name="close" />
            </Dialog.Close>
          </div>
          <div className={styles.body}>
            <Dialog.Title className={styles.title}>
              {signedIn ? tAccount('account-sections') : t('header.menu-title')}
            </Dialog.Title>
            <Dialog.Description className={styles.description}>
              {signedIn ? tAccount('profile-ui.navigation-note') : t('header.menu-description')}
            </Dialog.Description>
            <SiteNavigationLinks onNavigate={handleClose} extraLinks={extraLinks} />
            <div className={styles.bottom}>
              <AcademyThemeControl />
              <div className={styles.language}>
                <span>{t('language-switch.label')}</span>
                {languageControl ?? <AcademyLanguageSwitch onNavigate={handleClose} />}
              </div>
              {accountActions ??
                (signedIn ? (
                  <AcademyDrawerAccount onNavigate={handleClose} />
                ) : (
                  <>
                    <AcademyLink href={loginHref} className={styles.login} onClick={handleClose}>
                      {t('header.login')}
                    </AcademyLink>
                    <AcademyLink href="/register" className={styles.register} onClick={handleClose}>
                      {t('account.register-link')}
                    </AcademyLink>
                  </>
                ))}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default SiteNavigationDrawer;
