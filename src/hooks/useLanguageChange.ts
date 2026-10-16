import useTranslation from 'next-translate/useTranslation';
import { useDispatch, useSelector } from 'react-redux';

import useSiteLanguageChange from './useSiteLanguageChange';

import resetSettings from '@/redux/actions/reset-settings';
import syncLocaleDependentSettings from '@/redux/actions/sync-locale-dependent-settings';
import { selectIsUsingDefaultSettings } from '@/redux/slices/defaultSettings';

/**
 * Preserve reader defaults without mounting the Quran store on academy pages.
 * @returns {ReturnType<typeof useSiteLanguageChange>} shared controls with reader settings synchronization
 */
const useLanguageChange = (): ReturnType<typeof useSiteLanguageChange> => {
  const { lang } = useTranslation('common');
  const isUsingDefaultSettings = useSelector(selectIsUsingDefaultSettings);
  const dispatch = useDispatch();

  return useSiteLanguageChange((newLocale, loggedIn) => {
    if (!loggedIn && !isUsingDefaultSettings) {
      dispatch(syncLocaleDependentSettings({ prevLocale: lang, nextLocale: newLocale }));
    }
    if (isUsingDefaultSettings) dispatch(resetSettings(newLocale));
  });
};

export default useLanguageChange;
