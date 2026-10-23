import useTranslation from 'next-translate/useTranslation';

import { getTeacherName } from '../../tilawa/teachers';
import type { AcademyTeacherProfile } from '../../tilawa/teachers';

import AcademyIcon from './AcademyIcon';
import AcademyLink from './AcademyLink';
import TeacherPrice from './TeacherPrice';
import styles from './TeachersDirectory.module.scss';

import { getLocaleName } from '@/utils/locale';

interface TeacherProfileCardProps {
  teacher: AcademyTeacherProfile;
}

const TeacherProfileCard = ({ teacher }: TeacherProfileCardProps): JSX.Element => {
  const { t, lang } = useTranslation('academy');
  const name = getTeacherName(teacher, lang);
  const href = `/teachers/${encodeURIComponent(teacher.slug)}`;
  return (
    <li className={styles.card}>
      <AcademyLink
        href={href}
        className={styles.portrait}
        ariaLabel={t('marketplace.profile-of', { name })}
      >
        {teacher.photoUrl ? (
          <img src={teacher.photoUrl} alt="" width={600} height={450} loading="lazy" />
        ) : (
          <span aria-hidden="true">{name.charAt(0)}</span>
        )}
      </AcademyLink>
      <div className={styles.cardBody}>
        <h3 className={styles.name}>
          <AcademyLink href={href}>{name}</AcademyLink>
        </h3>
        {teacher.isIllustrative && (
          <span className={styles.sampleBadge} data-testid="teacher-preview-badge">
            {t('teachers.sample-profile')}
          </span>
        )}
        <p className={styles.specialty}>
          <AcademyIcon name="book" />
          {teacher.specialties.map((item) => t(`teachers.filters.${item}`)).join(' · ')}
        </p>
        <p className={styles.meta}>
          <AcademyIcon name="globe" />
          {teacher.teachingLanguages?.map((item) => getLocaleName(item)).join(' · ')}
        </p>
        <p className={styles.introduction}>{teacher.introduction?.[lang === 'ar' ? 'ar' : 'en']}</p>
        <AcademyLink className={styles.profileLink} href={href}>
          {t('teachers.view-profile')}
          <AcademyIcon name="arrow" />
        </AcademyLink>
      </div>
      <div className={styles.cardActions}>
        <TeacherPrice teacher={teacher} />
        <p className={styles.cardRating}>
          <AcademyIcon name="star" />
          {teacher.reviewCount > 0
            ? `${teacher.rating.toFixed(1)} · ${t('marketplace.review-count', {
                count: teacher.reviewCount,
              })}`
            : t('marketplace.new-teacher')}
        </p>
        <AcademyLink href={`${href}?action=booking`} className={styles.bookButton}>
          <AcademyIcon name="calendar" />
          {t('profile.choose-lesson')}
        </AcademyLink>
        <AcademyLink href={`${href}?action=message`} className={styles.messageButton}>
          <AcademyIcon name="chat" />
          {t('marketplace.message')}
        </AcademyLink>
      </div>
    </li>
  );
};

export default TeacherProfileCard;
