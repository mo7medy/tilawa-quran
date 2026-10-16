import useTranslation from 'next-translate/useTranslation';

import AcademyHero from './AcademyHero';
import styles from './AcademyHome.module.scss';
import AcademyLink from './AcademyLink';
import AcademyPrograms from './AcademyPrograms';
import TeachersDirectory from './TeachersDirectory';

import { ROUTES } from '@/utils/navigation';

const STEP_KEYS = ['first', 'second', 'third'] as const;
const FAQ_KEYS = ['who', 'language', 'format', 'price'] as const;

const AcademyHome = (): JSX.Element => {
  const { t } = useTranslation('academy');
  return (
    <div className={styles.page} data-testid="academy-home">
      <AcademyHero />
      <div className={styles.sections}>
        <AcademyPrograms />
        <section className={styles.how} id="how-it-works" aria-label={t('how.title')}>
          <ol className={styles.steps}>
            {STEP_KEYS.map((step, index) => (
              <li className={styles.step} key={step}>
                <span className={styles.stepNumber} aria-hidden="true">
                  {index + 1}
                </span>
                <div>
                  <h3 className={styles.stepTitle}>{t(`how.steps.${step}.title`)}</h3>
                  <p className={styles.stepDescription}>{t(`how.steps.${step}.description`)}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
        <TeachersDirectory />
        <section className={styles.cta} aria-labelledby="cta-heading">
          <div>
            <p className={styles.eyebrow}>{t('hero.eyebrow')}</p>
            <h2 className={styles.ctaTitle} id="cta-heading">
              {t('cta.title')}
            </h2>
            <p className={styles.ctaSubtitle}>{t('cta.subtitle')}</p>
          </div>
          <div className={styles.ctaButtons}>
            <AcademyLink className={styles.primaryCta} href="/#programs">
              {t('cta.primary')}
            </AcademyLink>
            <AcademyLink className={styles.secondaryCta} href={ROUTES.QURAN_HOME}>
              {t('cta.secondary')}
            </AcademyLink>
          </div>
        </section>
        <section className={styles.faq} id="faq" aria-labelledby="faq-heading">
          <h2 className={styles.sectionTitle} id="faq-heading">
            {t('faq.title')}
          </h2>
          <div className={styles.faqList}>
            {FAQ_KEYS.map((item) => (
              <details className={styles.faqItem} key={item}>
                <summary className={styles.faqQuestion}>{t(`faq.items.${item}.question`)}</summary>
                <p className={styles.faqAnswer}>{t(`faq.items.${item}.answer`)}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AcademyHome;
