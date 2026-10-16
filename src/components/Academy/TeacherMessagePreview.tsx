import { useId, useState } from 'react';

import useTranslation from 'next-translate/useTranslation';

import { getTeacherName } from '../../tilawa/teachers';
import type { AcademyTeacherProfile } from '../../tilawa/teachers';

import styles from './TeacherProfile.module.scss';

interface TeacherMessagePreviewProps {
  teacher: AcademyTeacherProfile;
}

const TeacherMessagePreview = ({ teacher }: TeacherMessagePreviewProps): JSX.Element => {
  const { t, lang } = useTranslation('academy');
  const id = useId();
  const [message, setMessage] = useState('');
  const [reviewed, setReviewed] = useState(false);
  return (
    <form
      className={styles.messageForm}
      onSubmit={(event) => {
        event.preventDefault();
        if (message.trim()) setReviewed(true);
      }}
    >
      <h2>{t('marketplace.message')}</h2>
      <p>{getTeacherName(teacher, lang)}</p>
      <p className={styles.previewNotice}>{t('marketplace.message-preview-note')}</p>
      <label htmlFor={id}>{t('marketplace.your-message')}</label>
      <textarea
        id={id}
        value={message}
        required
        maxLength={2000}
        rows={6}
        onChange={(event) => {
          setMessage(event.target.value);
          setReviewed(false);
        }}
      />
      <button className={styles.primaryButton} type="submit" disabled={!message.trim()}>
        {t('marketplace.preview-message')}
      </button>
      {reviewed && (
        <div className={styles.requestSummary} role="status">
          <p>{message}</p>
          <strong>{t('marketplace.message-not-sent')}</strong>
        </div>
      )}
    </form>
  );
};

export default TeacherMessagePreview;
