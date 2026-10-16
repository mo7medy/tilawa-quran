import useTranslation from 'next-translate/useTranslation';

import styles from './AcademyHome.module.scss';
import AcademyLink from './AcademyLink';

import ArrowRightIcon from '@/icons/arrow-right.svg';
import { ROUTES } from '@/utils/navigation';

const PROGRAMS = ['arabic', 'tajweed', 'memorization'] as const;
const EXTRA_PROGRAMS = ['revision', 'fiqh'] as const;

const AcademyPrograms = (): JSX.Element => {
  const { t } = useTranslation('academy');
  return (
    <section className={styles.programs} id="programs" aria-labelledby="programs-heading">
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle} id="programs-heading">
          {t('programs.title')}
        </h2>
        <p className={styles.sectionSubtitle}>{t('programs.subtitle')}</p>
      </div>
      <div className={styles.programGrid}>
        {PROGRAMS.map((program) => (
          <article className={`${styles.programCard} ${styles[program]}`} key={program}>
            <img
              src={`/tilawa/academy/program-${program}.webp`}
              alt=""
              width={program === 'arabic' ? 900 : 700}
              height={program === 'arabic' ? 600 : 467}
              loading="lazy"
              className={styles.programImage}
            />
            <div className={styles.programCopy}>
              <h3 className={styles.programTitle}>{t(`programs.items.${program}.title`)}</h3>
              <p className={styles.programDescription}>
                {t(`programs.items.${program}.description`)}
              </p>
              <AcademyLink
                className={styles.programLink}
                href={ROUTES.TEACHERS}
                ariaLabel={t('programs.find-teacher', {
                  program: t(`programs.items.${program}.title`),
                })}
              >
                <ArrowRightIcon aria-hidden="true" />
              </AcademyLink>
            </div>
            {program === 'arabic' && (
              <span className={styles.arabicLetter} aria-hidden="true">
                {t('programs.decorative-letter')}
              </span>
            )}
            {program === 'tajweed' && (
              <div className={styles.programWave} aria-hidden="true">
                {[8, 16, 26, 18, 34, 24, 42, 30, 20, 32, 19, 27, 12].map((height) => (
                  <span key={height} style={{ blockSize: height }} />
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
      <details className={styles.extraPrograms}>
        <summary>{t('programs.more-options')}</summary>
        <div className={styles.extraGrid}>
          {EXTRA_PROGRAMS.map((program) => (
            <article key={program}>
              <h3>{t(`programs.items.${program}.title`)}</h3>
              <p>{t(`programs.items.${program}.description`)}</p>
            </article>
          ))}
        </div>
      </details>
    </section>
  );
};

export default AcademyPrograms;
