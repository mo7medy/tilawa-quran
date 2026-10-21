import useTranslation from 'next-translate/useTranslation';

import AcademyCheckEmail from '@/components/Academy/AcademyCheckEmail';
import NextSeoWrapper from '@/components/NextSeoWrapper';

const CheckEmailPage = (): JSX.Element => {
  const { t } = useTranslation('account');
  return (
    <>
      <NextSeoWrapper title={t('confirmation.title')} noindex />
      <AcademyCheckEmail />
    </>
  );
};

export default CheckEmailPage;
