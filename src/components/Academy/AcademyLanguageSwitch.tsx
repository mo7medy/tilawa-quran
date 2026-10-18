import SiteLanguageDialog from './SiteLanguageDialog';

import useSiteLanguageChange from '@/hooks/useSiteLanguageChange';

interface AcademyLanguageSwitchProps {
  onNavigate?: () => void;
}

const AcademyLanguageSwitch = ({ onNavigate }: AcademyLanguageSwitchProps): JSX.Element => {
  const { changingLocale, onLanguageChange } = useSiteLanguageChange();
  return (
    <SiteLanguageDialog
      onNavigate={onNavigate}
      changingLocale={changingLocale}
      onLanguageChange={onLanguageChange}
    />
  );
};

export default AcademyLanguageSwitch;
