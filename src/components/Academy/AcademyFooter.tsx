import useTranslation from 'next-translate/useTranslation';

import styles from './AcademyFooter.module.scss';
import AcademyLink from './AcademyLink';
import AcademyThemeControl from './AcademyThemeControl';

import { ROUTES } from '@/utils/navigation';

const AcademyFooter = (): JSX.Element => {
  const { t } = useTranslation('academy');
  const { t: tCommon } = useTranslation('common');

  return (
    <footer className={styles.footer} data-testid="academy-footer">
      <div className={styles.inner}>
        <div className={styles.brand}>
          <img
            src="/tilawa/logo.svg"
            alt={tCommon('tilawa')}
            className={styles.logo}
            width={32}
            height={32}
          />
          <div>
            <div className={styles.name}>{tCommon('tilawa')}</div>
            <p className={styles.tagline}>{t('footer.tagline')}</p>
          </div>
        </div>
        <nav className={styles.links} aria-label={t('nav-label')}>
          <AcademyLink href={ROUTES.ACADEMY_HOME}>{t('header.academy')}</AcademyLink>
          <AcademyLink href={ROUTES.TEACHERS}>{t('header.teachers')}</AcademyLink>
          <AcademyLink href="/pricing">{t('header.pricing')}</AcademyLink>
          <AcademyLink href="/register">{t('account.register-link')}</AcademyLink>
          <AcademyLink href={ROUTES.QURAN_HOME}>{t('footer.read-quran')}</AcademyLink>
          <AcademyLink href="/sign-in">{t('footer.login')}</AcademyLink>
        </nav>
        <div className={styles.appearance}>
          <AcademyThemeControl />
        </div>
        <p className={styles.license}>{t('footer.license-note')}</p>
      </div>
    </footer>
  );
};

export default AcademyFooter;
