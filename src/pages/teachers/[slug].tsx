import type { GetServerSideProps } from 'next';

import { getTeacherName } from '../../tilawa/teachers';
import type { AcademyTeacherProfile } from '../../tilawa/teachers';

import TeacherAccountPreview from '@/components/Account/TeacherAccountPreview';
import NextSeoWrapper from '@/components/NextSeoWrapper';
import { loadPublicTeachers } from '@/tilawa/backend/teachers';
import { getCanonicalUrl } from '@/utils/navigation';

interface TeacherProfilePageProps {
  teacher: AcademyTeacherProfile;
  referenceDate: string;
  locale: string;
}

const TeacherProfilePage = ({
  teacher,
  referenceDate,
  locale,
}: TeacherProfilePageProps): JSX.Element => (
  <>
    <NextSeoWrapper
      title={getTeacherName(teacher, locale)}
      description={teacher.introduction?.[locale === 'ar' ? 'ar' : 'en']}
      url={getCanonicalUrl(locale, `/teachers/${teacher.slug}`)}
      noindex={teacher.isIllustrative === true}
    />
    <TeacherAccountPreview key={teacher.id} teacher={teacher} referenceDate={referenceDate} />
  </>
);

export const getServerSideProps: GetServerSideProps<TeacherProfilePageProps> = async ({
  params,
  locale,
  res,
}) => {
  res.setHeader('Cache-Control', 'no-store');
  const directory = await loadPublicTeachers();
  const teacher = directory.find((item) => item.slug === params?.slug);
  if (!teacher) return { notFound: true };
  return {
    props: {
      teacher,
      locale: locale ?? 'en',
      referenceDate: new Date().toISOString().slice(0, 10),
    },
  };
};

export default TeacherProfilePage;
