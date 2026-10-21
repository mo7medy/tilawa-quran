/* eslint-disable no-nested-ternary -- Small enum/label selections keep existing UI and wire-state mappings adjacent. */
import TeacherProfile from '../Academy/TeacherProfile';

import AccountLayout from './AccountLayout';
import AccountMessages from './AccountMessages';
import AccountNotifications from './AccountNotifications';
import AccountPager from './AccountPager';
import AccountReviews from './AccountReviews';
import AccountSettings from './AccountSettings';
import { AccountLink, Panel } from './AccountUi';
import AvailabilityEditor from './AvailabilityEditor';
import BookingRequests from './BookingRequests';
import Coupons from './Coupons';
import LessonDetails from './LessonDetails';
import LessonList from './LessonList';
import StudentLearning, { StudentTeachers } from './StudentLearning';
import StudentPackages from './StudentPackages';
import StudentProfile from './StudentProfile';
import TeacherDashboard from './TeacherDashboard';
import TeacherEditor from './TeacherEditor';
import TeacherFinance from './TeacherFinance';
import TeacherStudents from './TeacherStudents';
import { useAccountUi } from './useAccountUi';

interface AccountPageProps {
  area: 'profile' | 'teacher' | 'lesson';
}

const AccountPage = ({ area }: AccountPageProps): JSX.Element => {
  const { t, router, state, role, backend, loading, userId, error, snapshot, refresh, readFailed } =
    useAccountUi();
  if (backend && (loading || !userId)) {
    return (
      <AccountLayout title={t(loading ? 'loading' : 'sign-in-required')}>
        <Panel>
          <p>
            {t(
              loading
                ? 'loading'
                : error === 'BACKEND_NOT_CONFIGURED'
                ? 'backend-not-configured'
                : 'sign-in-required',
            )}
          </p>
          {!loading && (
            <AccountLink to={`/sign-in?redirectTo=${encodeURIComponent(router.asPath)}`}>
              {t('login')}
            </AccountLink>
          )}
        </Panel>
      </AccountLayout>
    );
  }
  if (backend && error && (!snapshot || readFailed)) {
    return (
      <AccountLayout title={t('profile')}>
        <Panel>
          <p role="alert">{t('backend-error')}</p>
          <button type="button" onClick={() => refresh?.()}>
            {t('admin-console.retry')}
          </button>
        </Panel>
      </AccountLayout>
    );
  }
  const segments = Array.isArray(router.query.section) ? router.query.section : [];
  const [section = area === 'teacher' ? 'dashboard' : 'profile', id] = segments;
  let title = section;
  let content: JSX.Element;
  if (area === 'lesson') {
    title = 'lesson-details';
    content = <LessonDetails lessonId={String(router.query.lessonId ?? '')} />;
  } else if (area === 'teacher') {
    const pages: Record<string, JSX.Element> = {
      dashboard: <TeacherDashboard />,
      requests: <BookingRequests requestId={id} />,
      lessons: <LessonList />,
      availability: <AvailabilityEditor />,
      students: <TeacherStudents studentId={id} />,
      reviews: <AccountReviews />,
      coupons: <Coupons />,
      earnings: <TeacherFinance />,
      withdrawals: <TeacherFinance withdrawal />,
    };
    content = pages[section];
    if (
      state.teacher.approval !== 'approved' &&
      !(
        backend
          ? ['dashboard', 'earnings', 'withdrawals', 'lessons', 'requests', 'students', 'reviews']
          : ['dashboard', 'earnings', 'withdrawals']
      ).includes(section)
    ) {
      content = (
        <Panel>
          <p>{t('teacher-not-approved')}</p>
          <AccountLink to="/profile/teacher">{t('complete-profile')}</AccountLink>
        </Panel>
      );
    }
  } else {
    const pages: Record<string, JSX.Element> = {
      profile: role === 'teacher' ? <TeacherEditor /> : <StudentProfile />,
      student: <StudentProfile />,
      teacher:
        id === 'preview' ? (
          <TeacherProfile
            teacher={state.teacher.publicProfile}
            referenceDate={new Date().toISOString().slice(0, 10)}
          />
        ) : (
          <TeacherEditor />
        ),
      learning: <StudentLearning />,
      settings: <AccountSettings />,
      lessons: (
        <>
          <LessonList />
          {backend && <AccountLink to="/profile/requests">{t('requests')}</AccountLink>}
        </>
      ),
      teachers: <StudentTeachers />,
      packages: <StudentPackages />,
      requests: <BookingRequests requestId={id} />,
      messages: <AccountMessages />,
      notifications: <AccountNotifications />,
    };
    content = pages[section];
    if (section === 'teacher') title = 'teacher-profile';
  }
  if (
    !content ||
    segments.length > 2 ||
    (id &&
      !['requests', 'students'].includes(section) &&
      !(section === 'teacher' && id === 'preview'))
  ) {
    title = 'not-found';
    content = (
      <Panel>
        <p>{t('not-found')}</p>
        <AccountLink to="/profile">{t('profile')}</AccountLink>
      </Panel>
    );
  }
  const pathKey = section === 'messages' ? router.asPath.split('?')[0] : router.asPath;
  return (
    <AccountLayout title={t(title)}>
      <div key={backend ? `${userId}:${pathKey}` : state.revision}>{content}</div>
      <AccountPager />
    </AccountLayout>
  );
};
export default AccountPage;
