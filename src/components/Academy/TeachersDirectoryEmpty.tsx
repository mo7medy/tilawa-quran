import useTranslation from 'next-translate/useTranslation';

import AcademyIcon from './AcademyIcon';
import styles from './TeachersDirectory.module.scss';

const TeachersDirectoryEmpty = ({ hasTeachers }: { hasTeachers: boolean }): JSX.Element => {
  const { t } = useTranslation('academy');
  return (
    <div className={styles.empty} data-testid="teachers-empty-state" role="status">
      <div className={styles.emptyCopy}>
        <span className={styles.emptyIcon}>
          <AcademyIcon name="search" size={24} />
        </span>
        <p className={styles.emptyTitle}>
          {t(hasTeachers ? 'teachers.no-results' : 'teachers.empty-title')}
        </p>
        <p className={styles.emptyDescription}>
          {t(hasTeachers ? 'teachers.no-results-description' : 'teachers.empty-description')}
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
  );
};
export default TeachersDirectoryEmpty;
