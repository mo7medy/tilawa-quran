import { useId, useState } from 'react';

import useTranslation from 'next-translate/useTranslation';

import AcademyLink from './AcademyLink';
import styles from './TeacherProfile.module.scss';

const TeacherApplication = (): JSX.Element => {
  const { t } = useTranslation('academy');
  const id = useId();
  const [review, setReview] = useState<Record<string, string> | null>(null);
  return (
    <div className={styles.applicationPage}>
      <AcademyLink className={styles.back} href="/teachers">
        {t('profile.back')}
      </AcademyLink>
      <h1>{t('application.title')}</h1>
      <p>{t('application.subtitle')}</p>
      <p className={styles.previewNotice}>{t('application.preview-note')}</p>
      <form
        className={styles.applicationForm}
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          setReview({
            name: String(form.get('name')),
            email: String(form.get('email')),
            subject: String(form.get('subject')),
          });
        }}
        onChange={() => setReview(null)}
      >
        <div className={styles.formGrid}>
          <label htmlFor={`${id}-name`}>
            {t('application.name')}
            <input id={`${id}-name`} name="name" autoComplete="name" required maxLength={100} />
          </label>
          <label htmlFor={`${id}-email`}>
            {t('application.email')}
            <input id={`${id}-email`} name="email" type="email" autoComplete="email" required />
          </label>
          <label htmlFor={`${id}-subject`}>
            {t('application.subject')}
            <select id={`${id}-subject`} name="subject" required>
              {['arabic_for_non_arabic_speakers', 'tajweed', 'memorization', 'fiqh'].map(
                (subject) => (
                  <option key={subject} value={subject}>
                    {t(`teachers.filters.${subject}`)}
                  </option>
                ),
              )}
            </select>
          </label>
          <label htmlFor={`${id}-language`}>
            {t('application.languages')}
            <select id={`${id}-language`} name="language" required>
              <option value="en-ar">{t('application.bilingual')}</option>
              <option value="en">{t('teachers.languages.en')}</option>
              <option value="ar">{t('teachers.languages.ar')}</option>
            </select>
          </label>
          <label htmlFor={`${id}-duration`}>
            {t('application.duration')}
            <select id={`${id}-duration`} name="duration" required>
              {[30, 45, 60].map((minutes) => (
                <option key={minutes} value={minutes}>
                  {t('profile.minutes', { count: minutes })}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor={`${id}-price`}>
            {t('application.price')}
            <input id={`${id}-price`} name="price" type="number" min="0.01" step="0.01" required />
          </label>
        </div>
        <label htmlFor={`${id}-bio`}>
          {t('application.bio')}
          <textarea id={`${id}-bio`} name="bio" rows={5} required maxLength={1500} />
        </label>
        <div className={styles.formGrid}>
          <label htmlFor={`${id}-photo`}>
            {t('application.photo')}
            <input
              id={`${id}-photo`}
              name="photo"
              type="file"
              accept="image/png,image/jpeg,image/webp"
            />
          </label>
          <label htmlFor={`${id}-video`}>
            {t('application.video')}
            <input
              id={`${id}-video`}
              name="video"
              type="url"
              aria-describedby={`${id}-video-hint`}
            />
            <small id={`${id}-video-hint`}>{t('application.video-hint')}</small>
          </label>
        </div>
        <label htmlFor={`${id}-qualifications`}>
          {t('application.qualifications')}
          <textarea id={`${id}-qualifications`} name="qualifications" rows={3} maxLength={1500} />
        </label>
        <label htmlFor={`${id}-availability`}>
          {t('application.availability')}
          <textarea
            id={`${id}-availability`}
            name="availability"
            rows={3}
            required
            maxLength={500}
          />
        </label>
        <p className={styles.small}>{t('application.approval-note')}</p>
        <button className={styles.primaryButton} type="submit">
          {t('application.review')}
        </button>
        {review && (
          <div className={styles.requestSummary} role="status">
            <h2>{t('application.summary')}</h2>
            <p>
              {review.name} · {review.email}
            </p>
            <p>{t(`teachers.filters.${review.subject}`)}</p>
            <strong>{t('profile.not-submitted')}</strong>
          </div>
        )}
      </form>
    </div>
  );
};

export default TeacherApplication;
