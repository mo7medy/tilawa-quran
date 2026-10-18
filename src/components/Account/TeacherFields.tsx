/* eslint-disable max-lines -- Keep this cohesive form or typed data contract together; reader services are split by feature. */
import { useState } from 'react';

import styles from './Account.module.scss';
import { Field, TextField } from './AccountUi';
import { useAccountUi } from './useAccountUi';

const TeacherFields = (): JSX.Element => {
  const { t, state, lang, backend } = useAccountUi();
  const [pricing, setPricing] = useState(state.teacher.pricing);
  const { teacher } = state;
  const profile = teacher.publicProfile;
  const locale = lang === 'ar' ? 'ar' : 'en';
  return (
    <>
      <div className={styles.twoColumns}>
        <Field
          label={t('full-name')}
          name="name"
          defaultValue={profile.displayName}
          required
          maxLength={100}
        />
        <Field
          label={t('country')}
          name="country"
          defaultValue={teacher.country}
          required
          maxLength={80}
        />
        <Field
          label={t('email')}
          name="email"
          defaultValue={teacher.email}
          type="email"
          required
          disabled={backend}
        />
        <label className={styles.field} htmlFor="teacher-gender">
          {t('gender')}
          <select id="teacher-gender" name="gender" defaultValue={profile.gender}>
            <option value="male">{t('male')}</option>
            <option value="female">{t('female')}</option>
          </select>
        </label>
        <Field
          label={t('phone')}
          name="phone"
          defaultValue={teacher.phone}
          type="tel"
          maxLength={30}
        />
        <Field
          label={t('experience')}
          name="experience"
          defaultValue={teacher.experience}
          type="number"
          min={0}
          max={80}
          step={1}
          required
        />
        <Field
          label={t('languages')}
          name="languages"
          defaultValue={profile.teachingLanguages.join(', ')}
          required
          maxLength={150}
        />
      </div>
      <fieldset>
        <legend>{t('specialties')}</legend>
        {['arabic_for_non_arabic_speakers', 'tajweed', 'memorization'].map((specialty) => (
          <label
            htmlFor={`account-teacherfields-1610-${specialty}`}
            key={specialty}
            className={styles.check}
          >
            <input
              id={`account-teacherfields-1610-${specialty}`}
              type="checkbox"
              name="specialty"
              value={specialty}
              defaultChecked={profile.specialties.includes(
                specialty as (typeof profile.specialties)[number],
              )}
            />
            {t(`specialty.${specialty}`)}
          </label>
        ))}
      </fieldset>
      <TextField label={t('bio')} name="bio" value={profile.biography?.[locale]} required />
      <TextField
        label={t('teaching-style')}
        name="approach"
        value={profile.approach?.[locale]}
        required
      />
      <TextField
        label={t('qualifications')}
        name="qualifications"
        value={profile.qualifications.map((item) => item[locale]).join('\n')}
      />
      <Field
        label={t('intro-video')}
        name="video"
        type="url"
        defaultValue={profile.introductionVideoUrl ?? ''}
      />
      <p className={styles.muted}>{t('video-hint')}</p>
      <fieldset>
        <legend>{t('teacher-pricing')}</legend>
        <p>{t('separate-pricing')}</p>
        <label htmlFor="account-teacherfields-2751" className={styles.field}>
          {t('pricing-mode')}
          <select
            id="account-teacherfields-2751"
            name="pricing"
            value={pricing}
            onChange={(event) => setPricing(event.target.value as typeof pricing)}
          >
            {['perLesson', 'monthly', 'both'].map((mode) => (
              <option key={mode} value={mode}>
                {t(`pricing.${mode}`)}
              </option>
            ))}
          </select>
        </label>
        <div className={styles.twoColumns}>
          <Field
            label={t('lesson-price')}
            name="price"
            type="number"
            min="0.01"
            step="0.01"
            defaultValue={(profile.sessionPriceCents ?? 0) / 100}
            required={pricing !== 'monthly'}
            disabled={pricing === 'monthly'}
          />
          <Field
            label={t('lesson-duration')}
            name="duration"
            type="number"
            min={15}
            max={120}
            step={5}
            defaultValue={profile.sessionDurationMinutes}
            required
          />
          <Field
            label={t('monthly-price')}
            name="monthlyPrice"
            type="number"
            min="0.01"
            step="0.01"
            defaultValue={teacher.monthlyPriceCents / 100}
            required={pricing !== 'perLesson'}
            disabled={pricing === 'perLesson'}
          />
          <Field
            label={t('monthly-lessons')}
            name="monthlyLessons"
            type="number"
            min={1}
            max={60}
            step={1}
            defaultValue={teacher.monthlyLessons}
            required
          />
        </div>
      </fieldset>
    </>
  );
};
export default TeacherFields;
