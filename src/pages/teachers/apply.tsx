import type { GetServerSideProps } from 'next';
import useTranslation from 'next-translate/useTranslation';

import TeacherApplication from '@/components/Academy/TeacherApplication';
import NextSeoWrapper from '@/components/NextSeoWrapper';
import { withLocalePrefix } from '@/utils/tilawaRoutes';

const TeacherApplicationPage = (): JSX.Element => {
  const { t } = useTranslation('academy');
  return (
    <>
      <NextSeoWrapper title={t('application.title')} noindex />
      <TeacherApplication />
    </>
  );
};

export default TeacherApplicationPage;
export const getServerSideProps: GetServerSideProps = async ({ locale }) => ({
  redirect: { destination: withLocalePrefix('/profile/teacher', locale), permanent: false },
});
