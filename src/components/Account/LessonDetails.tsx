/* eslint-disable no-nested-ternary -- Small enum/label selections keep existing UI and wire-state mappings adjacent. */
import { formatAccountDate } from '../../tilawa/account/time';

import styles from './Account.module.scss';
import { AccountLink, Panel } from './AccountUi';
import LessonActions from './LessonActions';
import { useAccountUi } from './useAccountUi';

const LessonDetails = ({ lessonId }: { lessonId: string }): JSX.Element => {
  const { t, state, lang, role, router, backend, teacherFor, studentFor } = useAccountUi();
  const lesson =
    router.query.view === 'empty' ? undefined : state.lessons.find((item) => item.id === lessonId);
  if (!lesson) {
    return (
      <Panel>
        <p>{t('not-found')}</p>
        <AccountLink to={role === 'student' ? '/profile/lessons' : '/dashboard/teacher/lessons'}>
          {t('back-lessons')}
        </AccountLink>
      </Panel>
    );
  }
  const zone = role === 'teacher' ? state.availabilityZone : state.student.zone;
  return (
    <>
      <Panel title={t(`subject.${lesson.subject}`)}>
        <span className={styles.badge}>{t(`status.${lesson.status}`)}</span>
        <dl className={styles.details}>
          <div>
            <dt>{t('teacher')}</dt>
            <dd>{teacherFor(lesson.teacherId).publicProfile.displayName}</dd>
          </div>
          <div>
            <dt>{t('student')}</dt>
            <dd>{studentFor(lesson.studentId).name}</dd>
          </div>
          <div>
            <dt>{t('appointment')}</dt>
            <dd>{formatAccountDate(lesson.scheduledAt, zone, lang)}</dd>
          </div>
          <div>
            <dt>{t('timezone')}</dt>
            <dd>{zone}</dd>
          </div>
          <div>
            <dt>{t('lesson-duration')}</dt>
            <dd>{t('duration', { minutes: lesson.duration })}</dd>
          </div>
          <div>
            <dt>{t('payment-state')}</dt>
            <dd>
              {t(
                backend
                  ? `funding.${lesson.paymentState}`
                  : lesson.paid
                  ? 'payment-preview-paid'
                  : 'payment-preview-unpaid',
              )}
            </dd>
          </div>
        </dl>
        <AccountLink
          to={
            backend
              ? `/profile/messages?peer=${role === 'student' ? lesson.teacherId : lesson.studentId}`
              : '/profile/messages'
          }
        >
          {t(role === 'student' ? 'message-teacher' : 'message-student')}
        </AccountLink>
      </Panel>
      <Panel title={t('meeting')}>
        {lesson.meetingUrl ? (
          <a href={lesson.meetingUrl} target="_blank" rel="noopener noreferrer">
            {t('join-lesson')}
          </a>
        ) : (
          <p>{t('meeting-unavailable')}</p>
        )}
      </Panel>
      <Panel title={t('lesson-actions')}>
        <LessonActions lesson={lesson} />
      </Panel>
      <Panel title={t('history')}>
        {lesson.history.length ? (
          <ul className={styles.history}>
            {lesson.history.map((item, index) => (
              <li key={`${lesson.id}-${lesson.history.slice(0, index + 1).join('-')}`}>
                {t(`history-actions.${item}`)}
              </li>
            ))}
          </ul>
        ) : (
          <p>{t('no-history')}</p>
        )}
        {lesson.status === 'cancelled' && <p>{t('refund-deferred')}</p>}
        {lesson.review && (
          <blockquote>
            <strong>{t('rating-value', { rating: lesson.review.rating })}</strong>
            <p>{lesson.review.text}</p>
          </blockquote>
        )}
      </Panel>
    </>
  );
};
export default LessonDetails;
