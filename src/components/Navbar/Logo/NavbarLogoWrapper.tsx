import useTranslation from 'next-translate/useTranslation';

import styles from './NavbarLogoWrapper.module.scss';

import Link from '@/dls/Link/Link';
import { ROUTES } from '@/utils/navigation';

const NavbarLogoWrapper = () => {
  const { t } = useTranslation('common');
  return (
    <Link href={ROUTES.QURAN_HOME} className={styles.logoWrapper} title={t('tilawa')}>
      <img src="/tilawa/logo.svg" alt={t('tilawa')} width={32} height={32} />
      <span className={styles.wordmark}>{t('tilawa')}</span>
    </Link>
  );
};

export default NavbarLogoWrapper;
