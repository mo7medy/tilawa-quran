import { useEffect, useState } from 'react';

import { TEACHER_ACCOUNT_GROUPS } from '../../tilawa/account/navigation';
import { localDateTime } from '../../tilawa/account/time';
import type { ApprovalStatus } from '../../tilawa/account/types';
import AcademyIcon from '../Academy/AcademyIcon';

import styles from './Account.module.scss';
import { AccountLink, Panel } from './AccountUi';
import { LessonCard } from './LessonList';
import { useAccountUi } from './useAccountUi';

const TOOLS = [
  'requests',
  'lessons',
  'availability',
  'students',
  'reviews',
  'coupons',
  'earnings',
  'withdrawals',
];
const TeacherDashboard = (): JSX.Element => {
  const { t, state, dispatch, router, backend } = useAccountUi();
  const [today, setToday] = useState('');
  useEffect(
    () => setToday(localDateTime(new Date().toISOString(), state.availabilityZone).slice(0, 10)),
    [state.availabilityZone],
  );
  const approved = state.teacher.approval === 'approved';
  const lessons =
    router.query.view === 'empty'
      ? []
      : state.lessons.filter(
          (lesson) =>
            lesson.status === 'upcoming' &&
            localDateTime(lesson.scheduledAt, state.availabilityZone).slice(0, 10) === today,
        );
  return (
    <>
      <Panel>
        <div className={styles.row}>
          <div>
            <span className={styles.badge}>{t(`approval.${state.teacher.approval}`)}</span>
            <h2 className={styles.panelTitle}>
              <AcademyIcon name="graduation" size={24} />
              {state.teacher.publicProfile.displayName}
            </h2>
            <p>{t('teacher-welcome')}</p>
          </div>
          <AccountLink to="/profile/teacher">{t('edit-profile')}</AccountLink>
        </div>
        {!backend && (
          <>
            <label htmlFor="account-teacherdashboard-1506" className={styles.field}>
              {t('approval-scenario')}
              <select
                id="account-teacherdashboard-1506"
                value={state.teacher.approval}
                onChange={(event) =>
                  dispatch({ type: 'scenario', approval: event.target.value as ApprovalStatus })
                }
              >
                {['incomplete', 'pending', 'approved', 'rejected'].map((status) => (
                  <option key={status} value={status}>
                    {t(`approval.${status}`)}
                  </option>
                ))}
              </select>
            </label>
            <small>{t('scenario-note')}</small>
          </>
        )}
      </Panel>
      {approved ? (
        <>
          <Panel icon="calendar" title={t('today-lessons')}>
            {lessons.length ? (
              lessons.map((lesson) => <LessonCard key={lesson.id} lesson={lesson} />)
            ) : (
              <p>{t('no-today-lessons')}</p>
            )}
          </Panel>
          <div className={styles.twoColumns}>
            {TOOLS.map((tool) => (
              <Panel
                key={tool}
                title={t(tool)}
                icon={
                  TEACHER_ACCOUNT_GROUPS.flatMap(({ links }) => links).find(
                    ({ key }) => key === tool,
                  )?.icon
                }
              >
                <AccountLink to={`/dashboard/teacher/${tool}`}>{t('open-section')}</AccountLink>
              </Panel>
            ))}
          </div>
        </>
      ) : (
        <Panel>
          <p>{t(`approval-message.${state.teacher.approval}`)}</p>
          <AccountLink to="/profile/teacher">{t('complete-profile')}</AccountLink>
        </Panel>
      )}
    </>
  );
};
export default TeacherDashboard;
