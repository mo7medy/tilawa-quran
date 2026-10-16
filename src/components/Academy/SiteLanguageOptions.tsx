import useTranslation from 'next-translate/useTranslation';

import i18nConfig from '../../../i18n.json';

import styles from './AcademyLanguageSwitch.module.scss';

import { getLocaleName } from '@/utils/locale';

interface SiteLanguageOptionsProps {
  changingLocale: string | null;
  onSelect: (locale: string) => Promise<void>;
}

/**
 * One locale list and selected state for academy and Quran pages.
 * @returns {JSX.Element} language buttons with selection and busy states
 */
const SiteLanguageOptions = ({
  changingLocale,
  onSelect,
}: SiteLanguageOptionsProps): JSX.Element => {
  const { lang } = useTranslation('common');
  return (
    <div className={styles.list} aria-busy={changingLocale !== null}>
      {i18nConfig.locales.map((locale) => (
        <button
          type="button"
          key={locale}
          className={styles.option}
          lang={locale}
          dir="auto"
          aria-current={locale === lang ? 'true' : undefined}
          disabled={changingLocale !== null}
          data-testid={`language-item-${locale}`}
          onClick={() => onSelect(locale)}
        >
          {getLocaleName(locale)}
          {changingLocale === locale && <span className={styles.loading} aria-hidden="true" />}
        </button>
      ))}
    </div>
  );
};

export default SiteLanguageOptions;
