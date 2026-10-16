import useTranslation from 'next-translate/useTranslation';

import AcademyAccount from '@/components/Academy/AcademyAccount';
import NextSeoWrapper from '@/components/NextSeoWrapper';
import { getCanonicalUrl } from '@/utils/navigation';

const SignInPage = (): JSX.Element => {
  const { t, lang } = useTranslation('academy');
  return (
    <>
      <NextSeoWrapper
        title={t('account.sign-in.title')}
        description={t('account.sign-in.subtitle')}
        url={getCanonicalUrl(lang, '/sign-in')}
        noindex
      />
      <AcademyAccount mode="sign-in" />
    </>
  );
};

export default SignInPage;
