import { useState } from 'react';

import useTranslation from 'next-translate/useTranslation';

import { getTeacherName, getTeachersDirectoryState } from '../../tilawa/teachers';

import AcademyLink from './AcademyLink';
import TeacherFilters, { TeacherSubjectFilter } from './TeacherFilters';
import TeacherProfileCard from './TeacherProfileCard';
import styles from './TeachersDirectory.module.scss';

import { ROUTES } from '@/utils/navigation';

interface TeachersDirectoryProps {
  isStandalonePage?: boolean;
}

const TeachersDirectory = ({ isStandalonePage = false }: TeachersDirectoryProps): JSX.Element => {
  const { t, lang } = useTranslation('academy');
  const [query, setQuery] = useState('');
  const [subject, setSubject] = useState<TeacherSubjectFilter>('all');
  const [gender, setGender] = useState('all');
  const [maxPrice, setMaxPrice] = useState('all');
  const directory = getTeachersDirectoryState();
  const teachers = directory.teachers.filter(
    (teacher) =>
      (subject === 'all' ||
        (subject === 'arabic' && teacher.specialties.includes('arabic_for_non_arabic_speakers')) ||
        (subject === 'quran' &&
          teacher.specialties.some((item) => item === 'tajweed' || item === 'memorization'))) &&
      (gender === 'all' || teacher.gender === gender) &&
      (maxPrice === 'all' ||
        (teacher.sessionPriceCents !== null && teacher.sessionPriceCents <= Number(maxPrice))) &&
      getTeacherName(teacher, lang).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );
  return (
    <section
      className={styles.section}
      id="teachers"
      aria-labelledby="teachers-heading"
      data-testid="teachers-directory"
    >
      <div className={styles.headingRow}>
        <div>
          <p className={styles.eyebrow}>{t('teachers.eyebrow')}</p>
          {isStandalonePage ? (
            <h1 className={styles.title} id="teachers-heading">
              {t('teachers.title')}
            </h1>
          ) : (
            <h2 className={styles.title} id="teachers-heading">
              {t('teachers.title')}
            </h2>
          )}
          <p className={styles.subtitle}>{t('teachers.subtitle')}</p>
        </div>
        {!isStandalonePage && (
          <AcademyLink className={styles.browse} href={ROUTES.TEACHERS}>
            {t('teachers.browse')}
          </AcademyLink>
        )}
      </div>
      {isStandalonePage && (
        <TeacherFilters
          query={query}
          subject={subject}
          gender={gender}
          maxPrice={maxPrice}
          onGenderChange={setGender}
          onMaxPriceChange={setMaxPrice}
          onQueryChange={setQuery}
          onSubjectChange={setSubject}
        />
      )}
      {directory.status === 'preview' && (
        <p className={styles.previewNotice}>{t('teachers.preview-notice')}</p>
      )}
      {directory.status !== 'empty' && teachers.length > 0 ? (
        <ul className={styles.list}>
          {teachers.map((teacher) => (
            <TeacherProfileCard key={teacher.id} teacher={teacher} />
          ))}
        </ul>
      ) : (
        <div className={styles.empty} data-testid="teachers-empty-state" role="status">
          <div className={styles.emptyCopy}>
            <p className={styles.emptyTitle}>
              {t(directory.status === 'empty' ? 'teachers.empty-title' : 'teachers.no-results')}
            </p>
            <p className={styles.emptyDescription}>
              {t(
                directory.status === 'empty'
                  ? 'teachers.empty-description'
                  : 'teachers.no-results-description',
              )}
            </p>
          </div>
          <img
            className={styles.emptyPhoto}
            src="/tilawa/academy/hero-teacher.webp"
            alt={t('hero.image-alt')}
            width={1100}
            height={733}
            loading="lazy"
          />
        </div>
      )}
      {isStandalonePage && (
        <aside className={styles.application} aria-labelledby="teacher-application-title">
          <div>
            <h2 id="teacher-application-title">{t('teachers.application.title')}</h2>
            <p>{t('teachers.application.description')}</p>
            <AcademyLink className={styles.applicationAction} href="/teachers/apply">
              {t('teachers.application.action')}
            </AcademyLink>
          </div>
          <img
            src="/tilawa/academy/program-arabic.webp"
            alt=""
            width={900}
            height={600}
            loading="lazy"
          />
        </aside>
      )}
    </section>
  );
};

export default TeachersDirectory;
