import { useEffect, useRef } from 'react';

import useTranslation from 'next-translate/useTranslation';

import styles from './TeacherProfile.module.scss';

interface TeacherPreviewDialogProps {
  label: string;
  onClose: () => void;
  children: React.ReactNode;
}

const TeacherPreviewDialog = ({
  label,
  onClose,
  children,
}: TeacherPreviewDialogProps): JSX.Element => {
  const { t } = useTranslation('academy');
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previousOverflow = document.body.style.overflow;
    if (!dialog.open) dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);
  return (
    <dialog ref={ref} className={styles.dialog} aria-label={label} onClose={onClose}>
      <div className={styles.dialogTop}>
        <span>{label}</span>
        <button
          type="button"
          onClick={() => ref.current.close()}
          aria-label={t('marketplace.close')}
        >
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
};

export default TeacherPreviewDialog;
