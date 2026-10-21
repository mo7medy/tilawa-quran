import { useEffect, useId, useRef, useState } from 'react';

import styles from './Account.module.scss';
import AccountAvatar from './AccountAvatar';
import { useAccountUi } from './useAccountUi';

const PhotoField = ({
  value,
  onChange,
  isOptional = false,
}: {
  value: string;
  onChange: (photo: string) => void;
  isOptional?: boolean;
}): JSX.Element => {
  const { t, role, state } = useAccountUi();
  const id = useId();
  const reader = useRef<FileReader | null>(null);
  const [error, setError] = useState(false);
  const original = role === 'teacher' ? state.teacher.publicProfile.photoUrl : state.student.photo;
  useEffect(() => () => reader.current?.abort(), []);
  return (
    <div className={styles.photoField}>
      <AccountAvatar
        large
        photo={value}
        name={role === 'teacher' ? state.teacher.publicProfile.displayName : state.student.name}
      />
      <label htmlFor={id}>
        {isOptional ? t('teacher-wizard.optional-field', { field: t('photo') }) : t('photo')}
        <span className={styles.photoChoose}>{t('profile-ui.change-photo')}</span>
        <input
          id={id}
          className={styles.fileInput}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            if (
              !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
              file.size > 5 * 1024 * 1024
            ) {
              setError(true);
              return;
            }
            reader.current?.abort();
            const next = new FileReader();
            reader.current = next;
            next.onload = () => {
              if (typeof next.result === 'string') onChange(next.result);
            };
            next.onerror = () => setError(true);
            next.readAsDataURL(file);
            setError(false);
          }}
        />
        <small>{t('photo-hint')}</small>
      </label>
      {value !== original && (
        <button
          type="button"
          className={styles.secondary}
          onClick={() => {
            reader.current?.abort();
            onChange(original);
            setError(false);
          }}
        >
          {t('profile-ui.undo-photo')}
        </button>
      )}
      {error && (
        <p role="alert" className={styles.error}>
          {t('photo-error')}
        </p>
      )}
    </div>
  );
};
export default PhotoField;
