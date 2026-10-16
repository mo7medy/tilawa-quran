import { useId } from 'react';

import useTranslation from 'next-translate/useTranslation';

import type { PreviewLessonOption, PreviewLessonType } from '../../tilawa/teacherBookingPreview';

import styles from './TeacherProfile.module.scss';

interface LessonOptionsProps {
  options: PreviewLessonOption[];
  value: PreviewLessonType;
  onChange: (value: PreviewLessonType) => void;
}

const LessonOptions = ({ options, value, onChange }: LessonOptionsProps): JSX.Element => {
  const { t, lang } = useTranslation('academy');
  const id = useId();
  const priceLabel = (cents: number | null): string => {
    if (cents === null) return t('profile.price-pending');
    if (cents === 0) return t('profile.free-intro');
    return new Intl.NumberFormat(lang === 'ar' ? 'ar' : 'en', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };
  return (
    <fieldset className={styles.lessonOptions}>
      <legend>{t('profile.lesson-type')}</legend>
      {options.map((option) => (
        <label className={styles.lessonChoice} key={option.id} htmlFor={`${id}-${option.id}`}>
          <input
            id={`${id}-${option.id}`}
            type="radio"
            name="lesson-type"
            value={option.id}
            checked={value === option.id}
            onChange={() => onChange(option.id)}
          />
          <span>
            <strong>{t(`profile.lesson-types.${option.id}`)}</strong>
            <small>{t('profile.minutes', { count: option.durationMinutes })}</small>
          </span>
          <span className={styles.price}>{priceLabel(option.priceCents)}</span>
        </label>
      ))}
    </fieldset>
  );
};

export default LessonOptions;
