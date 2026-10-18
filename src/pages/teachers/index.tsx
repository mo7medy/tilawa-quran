import type { GetServerSideProps } from 'next';
import useTranslation from 'next-translate/useTranslation';

import styles from './teachers.module.scss';

import TeachersDirectory from '@/components/Academy/TeachersDirectory';
import NextSeoWrapper from '@/components/NextSeoWrapper';
import { loadPublicTeachers } from '@/tilawa/backend/teachers';
import type { AcademyTeacherProfile } from '@/tilawa/teachers';
import { getLanguageAlternates } from '@/utils/locale';
import { getCanonicalUrl } from '@/utils/navigation';

/**
 * Tilawa academy teachers browse (`/teachers`, `/ar/teachers`).
 *
 * Explicitly labelled design profiles until the approved-only directory
 * adapter is connected. Preview cards never create bookings or payments.
 *
 * @returns {JSX.Element} the teachers browse page
 */
const TeachersPage = ({ teachers }: { teachers?: AcademyTeacherProfile[] }): JSX.Element => {
  const { t, lang } = useTranslation('academy');

  return (
    <>
      <NextSeoWrapper
        title={t('teachers.title')}
        description={t('teachers.subtitle')}
        url={getCanonicalUrl(lang, '/teachers')}
        languageAlternates={getLanguageAlternates('/teachers')}
      />
      <div className={styles.page} data-testid="teachers-page">
        <TeachersDirectory isStandalonePage initialTeachers={teachers} />
      </div>
    </>
  );
};

export default TeachersPage;
export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    return { props: { teachers: await loadPublicTeachers() } };
  } catch {
    // eslint-disable-next-line no-param-reassign -- Next's response status is set before rendering the failure state.
    res.statusCode = 503;
    return { props: {} };
  }
};
