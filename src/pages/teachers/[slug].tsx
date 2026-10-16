import type { GetStaticPaths, GetStaticProps } from 'next';

import { getTeacherBySlug, getTeacherName, getTeachersDirectoryState } from '../../tilawa/teachers';
import type { AcademyTeacherProfile } from '../../tilawa/teachers';

import TeacherProfile from '@/components/Academy/TeacherProfile';
import NextSeoWrapper from '@/components/NextSeoWrapper';
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
    <TeacherProfile key={teacher.id} teacher={teacher} referenceDate={referenceDate} />
  </>
);

export const getStaticPaths: GetStaticPaths = () => ({
  paths: getTeachersDirectoryState().teachers.flatMap((teacher) =>
    ['en', 'ar'].map((locale) => ({ params: { slug: teacher.slug }, locale })),
  ),
  fallback: false,
});

export const getStaticProps: GetStaticProps<TeacherProfilePageProps> = ({ params, locale }) => {
  const teacher = typeof params?.slug === 'string' ? getTeacherBySlug(params.slug) : undefined;
  if (!teacher) return { notFound: true };
  return {
    props: {
      teacher,
      locale: locale ?? 'en',
      referenceDate: new Date().toISOString().slice(0, 10),
    },
    revalidate: 86400,
  };
};

export default TeacherProfilePage;
