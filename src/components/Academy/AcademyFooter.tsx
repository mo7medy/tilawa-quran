import useTranslation from 'next-translate/useTranslation';

import styles from './AcademyFooter.module.scss';
import AcademyIcon from './AcademyIcon';
import AcademyLink from './AcademyLink';
import AcademyThemeControl from './AcademyThemeControl';

import { useOptionalAccountPreview } from '@/components/Account/AccountContext';
import { ROUTES } from '@/utils/navigation';

const AcademyFooter = ({ compact = false }: { compact?: boolean }): JSX.Element => {
  const account = useOptionalAccountPreview();
  const { t } = useTranslation('academy');
  const { t: tCommon } = useTranslation('common');

  return (
    <footer
      className={`${styles.footer} ${compact ? styles.compact : ''}`}
      data-testid="academy-footer"
    >
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
            {!compact && <p className={styles.tagline}>{t('footer.tagline')}</p>}
          </div>
        </div>
        {!compact && (
          <nav className={styles.links} aria-label={t('nav-label')}>
            <AcademyLink href={ROUTES.ACADEMY_HOME}>
              <AcademyIcon name="graduation" />
              {t('header.academy')}
            </AcademyLink>
            <AcademyLink href={ROUTES.TEACHERS}>
              <AcademyIcon name="users" />
              {t('header.teachers')}
            </AcademyLink>
            <AcademyLink href="/pricing">
              <AcademyIcon name="package" />
              {t('header.pricing')}
            </AcademyLink>
            {!account?.userId && (
              <AcademyLink href="/register">
                <AcademyIcon name="user" />
                {t('account.register-link')}
              </AcademyLink>
            )}
            <AcademyLink href={ROUTES.QURAN_HOME}>
              <AcademyIcon name="book" />
              {t('footer.read-quran')}
            </AcademyLink>
            {!account?.userId && (
              <AcademyLink href="/sign-in">
                <AcademyIcon name="user" />
                {t('footer.login')}
              </AcademyLink>
            )}
          </nav>
        )}
        {!compact && (
          <div className={styles.appearance}>
            <AcademyThemeControl />
          </div>
        )}
        <p className={styles.license}>{t('footer.license-note')}</p>
      </div>
    </footer>
  );
};

export default AcademyFooter;
