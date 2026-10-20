/* eslint-disable no-nested-ternary -- Map three wire lesson statuses to the existing UI tabs. */
/* eslint-disable react/no-multi-comp -- Small related account view primitives share one module. */
import { useState } from 'react';

import { formatAccountDate } from '../../tilawa/account/time';
import type { Lesson } from '../../tilawa/account/types';

import styles from './Account.module.scss';
import { AccountLink, Panel } from './AccountUi';
import { useAccountUi } from './useAccountUi';

export const LessonCard = ({ lesson }: { lesson: Lesson }): JSX.Element => {
  const { t, lang, state, role, teacherFor, studentFor } = useAccountUi();
  const zone = role === 'teacher' ? state.availabilityZone : state.student.zone;
  return (
    <article className={styles.listCard}>
      <div>
        <span className={styles.badge}>{t(`status.${lesson.status}`)}</span>
        <h3>{t(`subject.${lesson.subject}`)}</h3>
        <p>
          {role === 'student'
            ? teacherFor(lesson.teacherId).publicProfile.displayName
            : studentFor(lesson.studentId).name}
        </p>
        <p>{formatAccountDate(lesson.scheduledAt, zone, lang)}</p>
        <small>
          {t('duration', { minutes: lesson.duration })} · {zone}
        </small>
      </div>
      <AccountLink to={`/lessons/${lesson.id}`}>{t('lesson-details')}</AccountLink>
    </article>
  );
};
const LessonList = (): JSX.Element => {
  const { t, state, router, backend } = useAccountUi();
  const [localFilter, setFilter] = useState<Lesson['status']>('upcoming');
  const filter = backend
    ? router.query.lessonStatus === 'completed'
      ? 'completed'
      : router.query.lessonStatus === 'cancelled'
      ? 'cancelled'
      : 'upcoming'
    : localFilter;
  const lessons =
    router.query.view === 'empty'
      ? []
      : state.lessons
          .filter((lesson) => lesson.status === filter)
          .sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt));
  return (
    <Panel>
      <div className={styles.tabs} role="group" aria-label={t('lesson-filter')}>
        {(['upcoming', 'completed', 'cancelled'] as const).map((status) => (
          <button
            key={status}
            type="button"
            aria-pressed={filter === status}
            onClick={() => {
              if (backend) {
                router.push(
                  {
                    pathname: router.pathname,
                    query: {
                      ...router.query,
                      lessonStatus: status === 'upcoming' ? 'scheduled' : status,
                      accountPage: 1,
                    },
                  },
                  undefined,
                  { shallow: true },
                );
              } else setFilter(status);
            }}
          >
            {t(`status.${status}`)}
          </button>
        ))}
      </div>
      {lessons.length ? (
        lessons.map((lesson) => <LessonCard key={lesson.id} lesson={lesson} />)
      ) : (
        <p className={styles.empty}>{t('no-lessons')}</p>
      )}
    </Panel>
  );
};
export default LessonList;
