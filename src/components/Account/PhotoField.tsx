import { useEffect, useId, useRef, useState } from 'react';

import styles from './Account.module.scss';
import { useAccountUi } from './useAccountUi';

const PhotoField = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (photo: string) => void;
}): JSX.Element => {
  const { t, role, state } = useAccountUi();
  const id = useId();
  const reader = useRef<FileReader | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => () => reader.current?.abort(), []);
  return (
    <div className={styles.photoField}>
      {value ? (
        <img src={value} alt={t('photo')} width={80} height={80} />
      ) : (
        <span className={styles.avatar}>
          {(role === 'teacher'
            ? state.teacher.publicProfile.displayName
            : state.student.name
          ).slice(0, 1)}
        </span>
      )}
      <label htmlFor={id}>
        {t('photo')}
        <input
          id={id}
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
      {error && (
        <p role="alert" className={styles.error}>
          {t('photo-error')}
        </p>
      )}
    </div>
  );
};
export default PhotoField;
