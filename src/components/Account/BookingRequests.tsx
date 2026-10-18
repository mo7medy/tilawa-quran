import { canReviewRequest } from '../../tilawa/account/rules';
import { formatAccountDate } from '../../tilawa/account/time';

import styles from './Account.module.scss';
import { AccountLink, Panel } from './AccountUi';
import { useAccountUi } from './useAccountUi';

const BookingRequests = ({ requestId }: { requestId?: string }): JSX.Element => {
  const { t, lang, state, dispatch, router, studentFor, teacherFor, backend, role, busy } =
    useAccountUi();
  const items =
    router.query.view === 'empty'
      ? []
      : state.requests.filter(
          (item) =>
            (!requestId || item.id === requestId) &&
            (item.status !== 'pending' || item.amountCents === 0),
        );
  return (
    <Panel title={t(requestId ? 'request-details' : 'requests')}>
      {!items.length && <p>{t(requestId ? 'not-found' : 'no-requests')}</p>}
      {items.map((request) => (
        <article className={styles.listCard} key={request.id}>
          <div>
            <span className={styles.badge}>{t(`request-status.${request.status}`)}</span>
            <h3>
              {role === 'teacher'
                ? studentFor(request.studentId).name
                : teacherFor(request.teacherId).publicProfile.displayName}{' '}
              · {t(`subject.${request.subject}`)}
            </h3>
            <p>{formatAccountDate(request.scheduledAt, state.availabilityZone, lang)}</p>
            <p>
              {t(`lesson-type.${request.type}`)} · {t('duration', { minutes: request.duration })}
            </p>
            {request.note && <p>{request.note}</p>}
            {role === 'teacher' && (
              <AccountLink to={`/dashboard/teacher/students/${request.studentId}`}>
                {t('student-profile')}
              </AccountLink>
            )}
          </div>
          <div className={styles.stack}>
            {backend && request.studentId === state.student.id && request.status === 'pending' && (
              <button
                type="button"
                onClick={() => {
                  dispatch({ type: 'cancel-booking', id: request.id });
                }}
              >
                {t('cancel-lesson')}
              </button>
            )}
            {!requestId && role === 'teacher' && (
              <AccountLink to={`/dashboard/teacher/requests/${request.id}`}>
                {t('request-details')}
              </AccountLink>
            )}
            {canReviewRequest(request) && role === 'teacher' && (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => dispatch({ type: 'request', id: request.id, accept: true })}
                >
                  {t('accept-request')}
                </button>
                <button
                  type="button"
                  className={styles.secondary}
                  onClick={() => dispatch({ type: 'request', id: request.id, accept: false })}
                >
                  {t('reject-request')}
                </button>
              </>
            )}
            {request.lessonId && (
              <AccountLink to={`/lessons/${request.lessonId}`}>{t('lesson-details')}</AccountLink>
            )}
          </div>
        </article>
      ))}
    </Panel>
  );
};
export default BookingRequests;
