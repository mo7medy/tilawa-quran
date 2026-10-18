/* eslint-disable react-func/max-lines-per-function -- Shared dialog layout keeps navigation and account controls together. */
import type { ReactNode } from 'react';

import * as Dialog from '@radix-ui/react-dialog';
import { useRouter } from 'next/router';
import useTranslation from 'next-translate/useTranslation';

import SITE_NAVIGATION_LINKS from '../../tilawa/siteNavigation';

import AcademyIcon from './AcademyIcon';
import AcademyLanguageSwitch from './AcademyLanguageSwitch';
import AcademyLink from './AcademyLink';
import styles from './AcademyMobileMenu.module.scss';
import AcademyThemeControl from './AcademyThemeControl';

import { useOptionalAccountPreview } from '@/components/Account/AccountContext';

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

const MENU_LINKS = [
  ...SITE_NAVIGATION_LINKS,
  { href: '/quran', key: 'read-quran' },
  { href: '/profile', key: 'my-account' },
] as const;

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
  const account = useOptionalAccountPreview();
  const { t: tCommon, lang } = useTranslation('common');
  const t = (key: string): string => tCommon(`site-nav.${key}`);
  const { pathname } = useRouter();
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
          <Dialog.Title className={styles.title}>{t('header.menu-title')}</Dialog.Title>
          <Dialog.Description className={styles.description}>
            {t('header.menu-description')}
          </Dialog.Description>
          <nav className={styles.links} aria-label={t('nav-label')}>
            {MENU_LINKS.map(({ href, key }) => (
              <AcademyLink
                key={key}
                href={href}
                onClick={handleClose}
                ariaCurrent={pathname === href ? 'page' : undefined}
              >
                <span>{t(`header.${key}`)}</span>
                <AcademyIcon name="arrow" />
              </AcademyLink>
            ))}
            {extraLinks.map(({ href, label }) => (
              <AcademyLink key={href} href={href} onClick={handleClose}>
                <span>{label}</span>
                <AcademyIcon name="arrow" />
              </AcademyLink>
            ))}
          </nav>
          <div className={styles.bottom}>
            <AcademyThemeControl />
            <div className={styles.language}>
              <span>{t('language-switch.label')}</span>
              {languageControl ?? <AcademyLanguageSwitch onNavigate={handleClose} />}
            </div>
            {accountActions ??
              (account?.userId ? (
                <AcademyLink href="/profile" className={styles.login} onClick={handleClose}>
                  {t('header.my-account')}
                </AcademyLink>
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
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default SiteNavigationDrawer;
