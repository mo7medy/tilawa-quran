import { useId } from 'react';

import useTranslation from 'next-translate/useTranslation';

import styles from './TeachersDirectory.module.scss';

export type TeacherSubjectFilter = 'all' | 'arabic' | 'quran';

interface TeacherFiltersProps {
  query: string;
  subject: TeacherSubjectFilter;
  gender: string;
  maxPrice: string;
  onGenderChange: (gender: string) => void;
  onMaxPriceChange: (price: string) => void;
  onQueryChange: (query: string) => void;
  onSubjectChange: (subject: TeacherSubjectFilter) => void;
}

const SUBJECTS = ['all', 'arabic', 'quran'] as const;

const TeacherFilters = ({
  query,
  subject,
  gender,
  maxPrice,
  onGenderChange,
  onMaxPriceChange,
  onQueryChange,
  onSubjectChange,
}: TeacherFiltersProps): JSX.Element => {
  const { t } = useTranslation('academy');
  const controlId = useId();
  return (
    <div className={styles.filters}>
      <div className={styles.subjects} role="group" aria-label={t('teachers.filters-label')}>
        {SUBJECTS.map((item) => (
          <button
            key={item}
            type="button"
            className={styles.filter}
            aria-pressed={subject === item}
            onClick={() => onSubjectChange(item)}
          >
            {t(`teachers.filters.${item}`)}
          </button>
        ))}
      </div>
      <label className={styles.searchLabel} htmlFor={`${controlId}-search`}>
        <span className={styles.srOnly}>{t('teachers.search-label')}</span>
        <input
          id={`${controlId}-search`}
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={t('teachers.search-placeholder')}
          className={styles.search}
        />
      </label>
      <label className={styles.selectLabel} htmlFor={`${controlId}-gender`}>
        <span className={styles.srOnly}>{t('marketplace.gender-label')}</span>
        <select
          id={`${controlId}-gender`}
          className={styles.filterSelect}
          value={gender}
          onChange={(event) => onGenderChange(event.target.value)}
        >
          <option value="all">{t('marketplace.any-teacher')}</option>
          <option value="male">{t('marketplace.male')}</option>
          <option value="female">{t('marketplace.female')}</option>
        </select>
      </label>
      <label className={styles.selectLabel} htmlFor={`${controlId}-price`}>
        <span className={styles.srOnly}>{t('marketplace.price-label')}</span>
        <select
          id={`${controlId}-price`}
          className={styles.filterSelect}
          value={maxPrice}
          onChange={(event) => onMaxPriceChange(event.target.value)}
        >
          <option value="all">{t('marketplace.any-price')}</option>
          {[1000, 2000, 3000].map((cents) => (
            <option key={cents} value={cents}>
              {t('marketplace.up-to-price', { price: cents / 100 })}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
};

export default TeacherFilters;
