import useTranslation from 'next-translate/useTranslation';

import { getTeacherName } from '../../tilawa/teachers';
import type { AcademyTeacherProfile } from '../../tilawa/teachers';

import AcademyIcon from './AcademyIcon';
import TeacherPrice from './TeacherPrice';
import styles from './TeacherProfile.module.scss';

import { getLocaleName } from '@/utils/locale';

interface TeacherProfileHeaderProps {
  teacher: AcademyTeacherProfile;
  onMessage: () => void;
}

const TeacherProfileHeader = ({ teacher, onMessage }: TeacherProfileHeaderProps): JSX.Element => {
  const { t, lang } = useTranslation('academy');
  const name = getTeacherName(teacher, lang);
  return (
    <header className={styles.profileHero}>
      <div className={styles.identity}>
        <img src={teacher.photoUrl} alt={name} width={112} height={112} className={styles.photo} />
        <div>
          <h1>{name}</h1>
          {teacher.countryLabel && <p>{teacher.countryLabel}</p>}
          <p className={styles.specialty}>
            {teacher.specialties.map((item) => t(`teachers.filters.${item}`)).join(' · ')}
          </p>
          {teacher.isIllustrative && (
            <span className={styles.badge}>{t('teachers.sample-profile')}</span>
          )}
        </div>
      </div>
      <p className={styles.headline}>{teacher.introduction?.[lang === 'ar' ? 'ar' : 'en']}</p>
      <button className={styles.secondaryButton} type="button" onClick={onMessage}>
        <AcademyIcon name="chat" />
        {t('marketplace.message')}
      </button>
      <div className={styles.statistics}>
        <div>
          <AcademyIcon name="star" />
          <strong>
            {teacher.reviewCount > 0 ? teacher.rating.toFixed(1) : t('marketplace.new-teacher')}
          </strong>
          <small>
            {teacher.reviewCount > 0
              ? t('marketplace.review-count', { count: teacher.reviewCount })
              : t('marketplace.reviews-pending')}
          </small>
        </div>
        <div>
          <AcademyIcon name="book" />
          <strong>{teacher.completedLessons ?? '—'}</strong>
          <small>{t('marketplace.lessons-taught')}</small>
        </div>
        <TeacherPrice teacher={teacher} />
      </div>
      <div className={styles.profileFacts}>
        <AcademyIcon name="globe" />
        <div>
          <strong>{t('marketplace.speaks')}</strong>
          <p>{teacher.teachingLanguages?.map((item) => getLocaleName(item)).join(' · ')}</p>
        </div>
      </div>
      <div className={styles.styleCard}>
        <AcademyIcon name="book" />
        <div>
          <strong>{t('profile.approach')}</strong>
          <p>{teacher.approach?.[lang === 'ar' ? 'ar' : 'en']}</p>
        </div>
      </div>
    </header>
  );
};

export default TeacherProfileHeader;
