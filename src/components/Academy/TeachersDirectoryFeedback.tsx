import useTranslation from 'next-translate/useTranslation';

import AcademyIcon from './AcademyIcon';
import styles from './TeachersDirectory.module.scss';

interface TeachersDirectoryFeedbackProps {
  loading: boolean;
  failed: boolean;
  onRetry: () => void;
}

const TeachersDirectoryFeedback = ({
  loading,
  failed,
  onRetry,
}: TeachersDirectoryFeedbackProps): JSX.Element | null => {
  const { t } = useTranslation('academy');
  const { t: accountText } = useTranslation('account');
  if (failed) {
    return (
      <div role="alert" className={styles.loadError}>
        <AcademyIcon name="users" size={24} />
        <p>{t('teachers.load-error')}</p>
        <button type="button" className={styles.browse} onClick={onRetry}>
          {accountText('admin-console.retry')}
        </button>
      </div>
    );
  }
  if (!loading) return null;
  return (
    <div role="status" aria-label={t('teachers.loading')} className={styles.loadingCards}>
      <span>{t('teachers.loading')}</span>
      {[0, 1, 2].map((item) => (
        <div key={item} className={styles.skeletonCard} aria-hidden="true" />
      ))}
    </div>
  );
};
export default TeachersDirectoryFeedback;
