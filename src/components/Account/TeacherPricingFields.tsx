import { useState } from 'react';

import styles from './Account.module.scss';
import { Field } from './AccountUi';
import { useAccountUi } from './useAccountUi';

const TeacherPricingFields = (): JSX.Element => {
  const { t, state } = useAccountUi();
  const { teacher } = state;
  const [pricing, setPricing] = useState(teacher.pricing);
  const monthly = pricing !== 'perLesson';
  return (
    <fieldset>
      <legend>{t('teacher-pricing')}</legend>
      <p>{t('separate-pricing')}</p>
      <p className={styles.muted}>{t('teacher-wizard.currency')}</p>
      <label htmlFor="teacher-pricing-mode" className={styles.field}>
        {t('pricing-mode')}
        <select
          id="teacher-pricing-mode"
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
        <div hidden={pricing === 'monthly'}>
          <Field
            label={t('lesson-price')}
            name="price"
            type="number"
            min="0.01"
            step="0.01"
            defaultValue={(teacher.publicProfile.sessionPriceCents ?? 0) / 100}
            required={pricing !== 'monthly'}
            disabled={pricing === 'monthly'}
          />
        </div>
        <Field
          label={t('lesson-duration')}
          name="duration"
          type="number"
          min={15}
          max={120}
          step={5}
          defaultValue={teacher.publicProfile.sessionDurationMinutes}
          required
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
      </div>
      <div className={styles.twoColumns} hidden={!monthly}>
        <Field
          label={t('monthly-price')}
          name="monthlyPrice"
          type="number"
          min="0.01"
          step="0.01"
          defaultValue={teacher.monthlyPriceCents / 100}
          required={monthly}
          disabled={!monthly}
        />
        <Field
          label={t('monthly-lessons')}
          name="monthlyLessons"
          type="number"
          min={1}
          max={60}
          step={1}
          defaultValue={teacher.monthlyLessons}
          required={monthly}
          disabled={!monthly}
        />
      </div>
    </fieldset>
  );
};
export default TeacherPricingFields;
