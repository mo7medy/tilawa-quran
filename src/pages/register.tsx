import useTranslation from 'next-translate/useTranslation';

import AcademyAccount from '@/components/Academy/AcademyAccount';
import NextSeoWrapper from '@/components/NextSeoWrapper';
import { getLanguageAlternates } from '@/utils/locale';
import { getCanonicalUrl } from '@/utils/navigation';

const RegisterPage = (): JSX.Element => {
  const { t, lang } = useTranslation('academy');
  return (
    <>
      <NextSeoWrapper
        title={t('account.register.title')}
        description={t('account.register.subtitle')}
        url={getCanonicalUrl(lang, '/register')}
        languageAlternates={getLanguageAlternates('/register')}
      />
      <AcademyAccount mode="register" />
    </>
  );
};

export default RegisterPage;
