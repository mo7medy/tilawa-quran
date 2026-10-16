import React from 'react';

import NextLink from 'next/link';
import { useRouter } from 'next/router';
import useTranslation from 'next-translate/useTranslation';

import styles from './AcademyLanguageSwitch.module.scss';

import { getLocaleName } from '@/utils/locale';
import { ACADEMY_LOCALES, stripLocalePrefix, withLocalePrefix } from '@/utils/tilawaRoutes';

const SUPPORTED_LOCALES: readonly string[] = ACADEMY_LOCALES;

interface AcademyLanguageSwitchProps {
  onNavigate?: () => void;
}

/**
 * Academy language switch (English/Arabic).
 *
 * Links to the same route in the other academy locale — the target href is
 * computed explicitly (strip current prefix, add target prefix) so switching
 * never drops the visitor to the wrong locale or homepage. Renders nothing
 * when there is no other academy locale.
 *
 * @returns {JSX.Element | null} language switch or null
 */
const AcademyLanguageSwitch = ({ onNavigate }: AcademyLanguageSwitchProps): JSX.Element | null => {
  const { t } = useTranslation('common');
  const { locale, locales, asPath } = useRouter();
  const targets = (locales ?? []).filter(
    (candidate) => candidate !== locale && SUPPORTED_LOCALES.includes(candidate),
  );
  if (targets.length === 0) return null;

  const unprefixedPath = stripLocalePrefix(asPath || '/', locales ?? []);

  return (
    <nav aria-label={t('site-nav.language-switch.label')} data-testid="academy-language-switch">
      {targets.map((target) => (
        <NextLink
          key={target}
          href={withLocalePrefix(unprefixedPath, target)}
          locale={target}
          lang={target}
          hrefLang={target}
          className={styles.switchLink}
          onClick={onNavigate}
        >
          {getLocaleName(target)}
        </NextLink>
      ))}
    </nav>
  );
};

export default AcademyLanguageSwitch;
