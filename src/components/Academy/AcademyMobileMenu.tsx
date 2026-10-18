import { useEffect, useState } from 'react';

import useTranslation from 'next-translate/useTranslation';

import AcademyIcon from './AcademyIcon';
import styles from './AcademyMobileMenu.module.scss';
import SiteNavigationDrawer from './SiteNavigationDrawer';

const AcademyMobileMenu = (): JSX.Element => {
  const { t } = useTranslation('common');
  const [isOpen, setIsOpen] = useState(false);

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
    <SiteNavigationDrawer
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      trigger={
        <button
          className={styles.trigger}
          type="button"
          aria-label={t('site-nav.header.open-menu')}
        >
          <AcademyIcon name="menu" />
        </button>
      }
    />
  );
};

export default AcademyMobileMenu;
