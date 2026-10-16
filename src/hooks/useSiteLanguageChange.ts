import { useRef, useState } from 'react';

import setLanguage from 'next-translate/setLanguage';
import useTranslation from 'next-translate/useTranslation';

import { ToastStatus, useToast } from '@/dls/Toast/Toast';
import { addOrUpdateUserPreference } from '@/utils/auth/api';
import { isLoggedIn } from '@/utils/auth/login';
import { clearLocaleCookie, getLocaleCookie, setLocaleCookie } from '@/utils/cookies';
import { logValueChange } from '@/utils/eventLogger';
import PreferenceGroup from 'types/auth/PreferenceGroup';

interface UseSiteLanguageChangeReturn {
  isChangingLanguage: boolean;
  changingLocale: string | null;
  onLanguageChange: (newLocale: string, onComplete?: () => void) => Promise<void>;
}

const navigateToLocale = async (locale: string): Promise<void> => {
  // The Worker must see the manual choice before navigation reaches the default locale URL.
  setLocaleCookie(locale);
  const navigated = await setLanguage(locale);
  if (navigated === false) throw new Error('Locale navigation was cancelled');
};

/**
 * Shared locale navigation, cookie and account preference persistence for both shells.
 * @returns {UseSiteLanguageChangeReturn} locale change state and handler
 */
const useSiteLanguageChange = (
  beforeChange?: (newLocale: string, loggedIn: boolean) => void,
): UseSiteLanguageChangeReturn => {
  const { t, lang } = useTranslation('common');
  const toast = useToast();
  const inFlight = useRef(false);
  const [changingLocale, setChangingLocale] = useState<string | null>(null);

  const handlePreferencePersistError = (): void => {
    toast(t('error.pref-persist-fail'), {
      status: ToastStatus.Warning,
      actions: [
        {
          text: t('undo'),
          primary: true,
          onClick: () => navigateToLocale(lang),
        },
        { text: t('continue'), primary: false },
      ],
    });
  };

  const onLanguageChange = async (newLocale: string, onComplete?: () => void): Promise<void> => {
    if (inFlight.current) return;
    if (newLocale === lang) {
      setLocaleCookie(newLocale);
      onComplete?.();
      return;
    }
    inFlight.current = true;
    setChangingLocale(newLocale);
    const previousLocale = getLocaleCookie();
    try {
      const loggedIn = isLoggedIn();
      beforeChange?.(newLocale, loggedIn);
      logValueChange('locale', lang, newLocale);
      await navigateToLocale(newLocale);
      if (loggedIn) {
        addOrUpdateUserPreference(
          PreferenceGroup.LANGUAGE,
          newLocale,
          PreferenceGroup.LANGUAGE,
        ).catch(handlePreferencePersistError);
      }
      onComplete?.();
    } catch {
      if (previousLocale) setLocaleCookie(previousLocale);
      else clearLocaleCookie();
      toast(t('error.language-change-failed'), { status: ToastStatus.Error });
    } finally {
      inFlight.current = false;
      setChangingLocale(null);
    }
  };

  return { isChangingLanguage: changingLocale !== null, changingLocale, onLanguageChange };
};

export default useSiteLanguageChange;
