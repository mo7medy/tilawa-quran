/* eslint-disable react-func/max-lines-per-function */
import { useEffect, useState } from 'react';

import * as Dialog from '@radix-ui/react-dialog';
import { useRouter } from 'next/router';
import useTranslation from 'next-translate/useTranslation';

import SITE_NAVIGATION_LINKS from '../../tilawa/siteNavigation';

import AcademyIcon from './AcademyIcon';
import AcademyLanguageSwitch from './AcademyLanguageSwitch';
import AcademyLink from './AcademyLink';
import styles from './AcademyMobileMenu.module.scss';
import AcademyThemeControl from './AcademyThemeControl';

const MENU_LINKS = [...SITE_NAVIGATION_LINKS, { href: '/quran', key: 'read-quran' }] as const;

const AcademyMobileMenu = (): JSX.Element => {
  const { t: tCommon, lang } = useTranslation('common');
  const t = (key: string): string => tCommon(`site-nav.${key}`);
  const { pathname } = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const handleClose = (): void => setIsOpen(false);

  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const desktop = window.matchMedia('(min-width: 1201px)');
    const handleResize = (): void => {
      if (desktop.matches) setIsOpen(false);
    };
    desktop.addEventListener('change', handleResize);
    return () => desktop.removeEventListener('change', handleResize);
  }, []);

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Trigger className={styles.trigger} aria-label={t('header.open-menu')}>
        <AcademyIcon name="menu" />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content
          className={`${styles.drawer} ${lang === 'ar' ? styles.arabic : ''}`}
          dir={lang === 'ar' ? 'rtl' : 'ltr'}
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
          </nav>
          <div className={styles.bottom}>
            <AcademyThemeControl />
            <div className={styles.language}>
              <span>{t('language-switch.label')}</span>
              <AcademyLanguageSwitch onNavigate={handleClose} />
            </div>
            <AcademyLink href="/sign-in" className={styles.login} onClick={handleClose}>
              {t('header.login')}
            </AcademyLink>
            <AcademyLink href="/register" className={styles.register} onClick={handleClose}>
              {t('account.register-link')}
            </AcademyLink>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default AcademyMobileMenu;
