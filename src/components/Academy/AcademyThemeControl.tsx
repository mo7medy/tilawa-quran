/* eslint-disable react-func/max-lines-per-function */
import useTranslation from 'next-translate/useTranslation';

import AcademyIcon from './AcademyIcon';
import styles from './AcademyThemeControl.module.scss';
import { useAcademyTheme } from './AcademyThemeProvider';

interface AcademyThemeControlProps {
  isCompact?: boolean;
}

const THEME_ICONS = { light: 'sun', dark: 'moon', system: 'monitor' } as const;

const AcademyThemeControl = ({ isCompact = false }: AcademyThemeControlProps): JSX.Element => {
  const { t } = useTranslation('common');
  const { preference, resolvedTheme, setPreference } = useAcademyTheme();
  const next = resolvedTheme === 'dark' ? 'light' : 'dark';
  if (isCompact) {
    return (
      <button
        className={styles.toggle}
        type="button"
        aria-label={t(`appearance.switch-${next}`)}
        title={t(`appearance.switch-${next}`)}
        onClick={() => setPreference(next)}
      >
        <AcademyIcon name={THEME_ICONS[next]} />
      </button>
    );
  }
  return (
    <fieldset className={styles.control}>
      <legend>{t('appearance.label')}</legend>
      <div role="group" aria-label={t('appearance.label')}>
        {(['light', 'dark', 'system'] as const).map((theme) => (
          <button
            type="button"
            key={theme}
            aria-pressed={preference === theme}
            onClick={() => setPreference(theme)}
          >
            <AcademyIcon name={THEME_ICONS[theme]} />
            <span>{t(`appearance.${theme}`)}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
};

export default AcademyThemeControl;
