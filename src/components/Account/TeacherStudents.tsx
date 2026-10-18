import styles from './Account.module.scss';
import { AccountLink, Panel } from './AccountUi';
import { LessonCard } from './LessonList';
import { useAccountUi } from './useAccountUi';

import { rows, string } from '@/tilawa/backend/mappers';

const TeacherStudents = ({ studentId }: { studentId?: string }): JSX.Element => {
  const { t, state, router, backend, snapshot } = useAccountUi();
  const linkedIds = new Set([
    ...state.requests.map((item) => item.studentId),
    ...state.lessons.map((item) => item.studentId),
    ...rows(snapshot?.subscriptions)
      .filter((item) => item.kind === 'teacher')
      .map((item) => string(item.student_id)),
  ]);
  const students = backend
    ? (state.students ?? []).filter(
        (item) => linkedIds.has(item.id) && (!studentId || item.id === studentId),
      )
    : [state.student];
  const selectedStudent = students[0];
  if (
    router.query.view === 'empty' ||
    !selectedStudent ||
    (studentId && studentId !== selectedStudent.id)
  ) {
    return (
      <Panel>
        <p>{t(studentId ? 'not-found' : 'no-students')}</p>
      </Panel>
    );
  }
  return (
    <>
      <Panel title={studentId ? selectedStudent.name : t('students')}>
        {students.map((student) => (
          <div className={styles.listCard} key={student.id}>
            <div>
              <h3>{student.name}</h3>
              <p>{student.country}</p>
              <p>{student.goal}</p>
            </div>
            <div>
              <AccountLink
                to={backend ? `/profile/messages?peer=${student.id}` : '/profile/messages'}
              >
                {t('message-student')}
              </AccountLink>
              {!studentId && (
                <AccountLink to={`/dashboard/teacher/students/${student.id}`}>
                  {t('student-profile')}
                </AccountLink>
              )}
            </div>
          </div>
        ))}
        {studentId && (
          <dl className={styles.details}>
            <div>
              <dt>{t('preferred-schedule')}</dt>
              <dd>{selectedStudent.schedule}</dd>
            </div>
            <div>
              <dt>{t('timezone')}</dt>
              <dd>{selectedStudent.zone}</dd>
            </div>
          </dl>
        )}
      </Panel>
      {studentId && (
        <Panel title={t('lessons')}>
          {state.lessons
            .filter((lesson) => !studentId || lesson.studentId === studentId)
            .map((lesson) => (
              <LessonCard key={lesson.id} lesson={lesson} />
            ))}
        </Panel>
      )}
    </>
  );
};
export default TeacherStudents;
