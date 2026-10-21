/* eslint-disable react/no-multi-comp -- Small related account view primitives share one module. */
import { getTeacherName } from '../../tilawa/teachers';

import styles from './Account.module.scss';
import { AccountLink, Panel } from './AccountUi';
import { LessonCard } from './LessonList';
import StudentOverviewPanels from './StudentOverviewPanels';
import { useAccountUi } from './useAccountUi';

const StudentLearning = (): JSX.Element => {
  const { t, state, router } = useAccountUi();
  const next =
    router.query.view === 'empty'
      ? undefined
      : state.lessons
          .filter(
            (lesson) =>
              lesson.status === 'upcoming' &&
              Date.parse(lesson.scheduledAt) + lesson.duration * 60000 > Date.now(),
          )
          .sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt))[0];
  return (
    <>
      <Panel title={t('next-lesson')}>
        {next ? (
          <LessonCard lesson={next} />
        ) : (
          <>
            <p>{t('profile-ui.no-next-lesson')}</p>
            <div className={styles.actions}>
              <AccountLink to="/teachers">{t('find-teacher')}</AccountLink>
              <AccountLink to="/pricing">{t('profile-ui.explore-packages')}</AccountLink>
            </div>
          </>
        )}
        <small>
          {t('timezone')}: {state.student.zone}
        </small>
      </Panel>
      <StudentOverviewPanels />
    </>
  );
};
export const StudentTeachers = (): JSX.Element => {
  const { t, state, lang, router, backend } = useAccountUi();
  const teachers = backend ? state.teachers ?? [] : [state.teacher];
  if (router.query.view === 'empty' || teachers.length === 0) {
    return (
      <Panel>
        <p>{t('no-teachers')}</p>
        <AccountLink to="/teachers">{t('find-teacher')}</AccountLink>
      </Panel>
    );
  }
  return (
    <Panel>
      {teachers.map(({ publicProfile: teacher }) => (
        <article className={styles.listCard} key={teacher.id}>
          <div className={styles.identity}>
            {teacher.photoUrl && (
              <img
                className={styles.portrait}
                src={teacher.photoUrl}
                width={72}
                height={72}
                alt=""
              />
            )}
            <div>
              <h2>{getTeacherName(teacher, lang)}</h2>
              <p>{t('arabic-quran')}</p>
              {!backend && <small>{t('demo-teacher')}</small>}
            </div>
          </div>
          <div>
            <AccountLink to={`/teachers/${teacher.slug}`}>{t('public-profile')}</AccountLink>
            <AccountLink
              to={backend ? `/profile/messages?peer=${teacher.id}` : '/profile/messages'}
            >
              {t('message-teacher')}
            </AccountLink>
          </div>
        </article>
      ))}
    </Panel>
  );
};
export default StudentLearning;
