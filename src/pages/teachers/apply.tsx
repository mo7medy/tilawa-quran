import useTranslation from 'next-translate/useTranslation';

import TeacherApplication from '@/components/Academy/TeacherApplication';
import NextSeoWrapper from '@/components/NextSeoWrapper';

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
