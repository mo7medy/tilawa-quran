import useTranslation from 'next-translate/useTranslation';

import styles from './AcademyHome.module.scss';
import AcademyIcon from './AcademyIcon';
import AcademyLink from './AcademyLink';

import ArrowRightIcon from '@/icons/arrow-right.svg';
import { ROUTES } from '@/utils/navigation';

const AcademyHero = (): JSX.Element => {
  const { t } = useTranslation('academy');
  return (
    <section className={styles.hero} aria-labelledby="academy-hero-title">
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}>{t('hero.eyebrow')}</p>
        <h1 className={styles.heroTitle} id="academy-hero-title">
          <span>
            {t('hero.title-lead')} <em>{t('hero.title-focus')}</em>{' '}
          </span>
          <span>{t('hero.title-second')}</span>
        </h1>
        <p className={styles.heroSubtitle}>{t('hero.subtitle')}</p>
        <div className={styles.heroCtas}>
          <AcademyLink className={styles.primaryCta} href="/#programs">
            {t('hero.cta-primary')} <ArrowRightIcon aria-hidden="true" />
          </AcademyLink>
          <AcademyLink className={styles.secondaryCta} href={ROUTES.TEACHERS}>
            <AcademyIcon name="search" />
            {t('hero.cta-secondary')}
          </AcademyLink>
        </div>
        <AcademyLink className={styles.readLink} href={ROUTES.QURAN_HOME}>
          {t('hero.cta-tertiary')} <ArrowRightIcon aria-hidden="true" />
        </AcademyLink>
      </div>
      <figure className={styles.heroVisual}>
        <div className={styles.heroArch}>
          <img
            src="/tilawa/academy/hero-teacher-young.webp"
            alt={t('hero.image-alt')}
            width={1100}
            height={733}
            loading="eager"
            className={styles.heroPhoto}
          />
        </div>
        <div className={styles.lessonPreview} aria-hidden="true">
          <p className={styles.lessonLabel}>{t('hero.lesson-label')}</p>
          <div className={styles.lessonPhotos}>
            <img src="/tilawa/academy/hero-teacher-young.webp" alt="" width={1100} height={733} />
            <img src="/tilawa/academy/lesson-student.webp" alt="" width={360} height={360} />
          </div>
          <div className={styles.lessonWave}>
            {[12, 22, 15, 30, 20, 10, 25, 16, 28, 13, 23].map((height) => (
              <span key={height} style={{ blockSize: height }} />
            ))}
          </div>
        </div>
        <div className={styles.subjectPills} aria-hidden="true">
          <span>
            <AcademyIcon name="globe" />
            {t('hero.subjects.arabic')}
          </span>
          <span>
            <AcademyIcon name="book" />
            {t('hero.subjects.tajweed')}
          </span>
          <span>
            <AcademyIcon name="graduation" />
            {t('hero.subjects.memorization')}
          </span>
        </div>
        <figcaption className={styles.imageCaption}>{t('hero.image-caption')}</figcaption>
      </figure>
    </section>
  );
};

export default AcademyHero;
