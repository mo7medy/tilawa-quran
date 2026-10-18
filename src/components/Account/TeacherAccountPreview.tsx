import { useRouter } from 'next/router';

import type { AcademyTeacherProfile } from '../../tilawa/teachers';
import TeacherProfile from '../Academy/TeacherProfile';

import { useOptionalAccountPreview } from './AccountPreviewProvider';

const TeacherAccountPreview = ({
  teacher,
  referenceDate,
}: {
  teacher: AcademyTeacherProfile;
  referenceDate: string;
}): JSX.Element => {
  const { query } = useRouter();
  const context = useOptionalAccountPreview();
  const accountTeacher = context?.state.teacher.publicProfile;
  const profile =
    query.accountPreview === '1' && accountTeacher?.slug === teacher.slug
      ? accountTeacher
      : teacher;
  return <TeacherProfile teacher={profile} referenceDate={referenceDate} />;
};
export default TeacherAccountPreview;
