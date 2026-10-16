import useTranslation from 'next-translate/useTranslation';

import { getTeacherName, getTeachersDirectoryState } from '../../tilawa/teachers';
import type { AcademyTeacherProfile } from '../../tilawa/teachers';

import AcademyIcon from './AcademyIcon';
import AcademyLink from './AcademyLink';
import styles from './TeacherProfile.module.scss';
import TeacherReviews from './TeacherReviews';

import { getLocaleName } from '@/utils/locale';

interface TeacherProfileDetailsProps {
  teacher: AcademyTeacherProfile;
  onBook: () => void;
}

const TeacherProfileDetails = ({ teacher, onBook }: TeacherProfileDetailsProps): JSX.Element => {
  const { t, lang } = useTranslation('academy');
  const locale = lang === 'ar' ? 'ar' : 'en';
  const related = getTeachersDirectoryState()
    .teachers.filter((item) => item.id !== teacher.id)
    .slice(0, 2);
  return (
    <div className={styles.profileDetails}>
      <nav className={styles.sectionNav} aria-label={t('profile.navigation')}>
        {['about', 'languages', 'reviews', 'qualifications', 'lessons'].map((item) => (
          <a key={item} href={`#${item}`}>
            {t(`profile.sections.${item}`)}
          </a>
        ))}
      </nav>
      <section className={styles.panel} id="about">
        <h2>{t('profile.sections.about')}</h2>
        <p>{teacher.biography?.[locale]}</p>
        <div className={styles.factRow}>
          <span>{t('profile.audience')}</span>
          <span>{t('profile.delivery')}</span>
        </div>
      </section>
      <section className={styles.panel} id="languages">
        <h2>{t('marketplace.i-speak')}</h2>
        <ul className={styles.languageList}>
          {teacher.teachingLanguages?.map((item) => (
            <li key={item}>
              <AcademyIcon name="globe" />
              {getLocaleName(item)}
              <span>{t('marketplace.teaching-language')}</span>
            </li>
          ))}
        </ul>
      </section>
      <TeacherReviews teacher={teacher} />
      <section className={styles.panel} id="qualifications">
        <h2>{t('marketplace.resume')}</h2>
        <h3 className={styles.resumeHeading}>{t('marketplace.certifications')}</h3>
        {teacher.qualifications?.length > 0 ? (
          <ul className={styles.qualifications}>
            {teacher.qualifications.map((item) => (
              <li key={item.en}>
                <AcademyIcon name="book" />
                <p>{item[locale]}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.emptySection}>{t('profile.no-qualifications')}</p>
        )}
      </section>
      <section className={styles.panel} id="lessons">
        <h2>{t('profile.sections.lessons')}</h2>
        <div className={styles.lessonDescriptions}>
          {['intro', 'follow_up', 'intensive_review'].map((item) => (
            <article key={item}>
              <h3>{t(`profile.lesson-types.${item}`)}</h3>
              <p>{t(`profile.lesson-descriptions.${item}`)}</p>
            </article>
          ))}
        </div>
        <button type="button" className={styles.secondaryButton} onClick={onBook}>
          <AcademyIcon name="clock" />
          {t('marketplace.view-schedule')}
        </button>
        <p className={styles.small}>{t('profile.eligibility-note')}</p>
        <details>
          <summary>{t('profile.booking-guidance')}</summary>
          <p>{t('profile.guidance-description')}</p>
        </details>
      </section>
      {related.length > 0 && (
        <section className={styles.panel} aria-labelledby="related-teachers">
          <h2 id="related-teachers">{t('marketplace.related')}</h2>
          <div className={styles.relatedList}>
            {related.map((item) => (
              <AcademyLink
                key={item.id}
                href={`/teachers/${item.slug}`}
                className={styles.relatedCard}
              >
                <img src={item.photoUrl} alt="" width={300} height={225} loading="lazy" />
                <strong>{getTeacherName(item, lang)}</strong>
                <span>
                  {item.specialties
                    .map((specialty) => t(`teachers.filters.${specialty}`))
                    .join(' · ')}
                </span>
                {item.isIllustrative && <small>{t('teachers.sample-profile')}</small>}
              </AcademyLink>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default TeacherProfileDetails;
