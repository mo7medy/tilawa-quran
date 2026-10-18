import { useState } from 'react';

import { canCompleteLesson } from '../../tilawa/account/rules';
import type { Lesson, PreviewAction } from '../../tilawa/account/types';

import styles from './Account.module.scss';
import { Status } from './AccountUi';
import LessonEditDialog from './LessonEditDialog';
import { useAccountUi } from './useAccountUi';

type LessonOperation = Extract<PreviewAction, { type: 'lesson' }>['operation'];
const LessonActions = ({ lesson }: { lesson: Lesson }): JSX.Element => {
  const { t, state, dispatch, role, backend, busy } = useAccountUi();
  const [dialog, setDialog] = useState<'reschedule' | 'cancel' | 'review' | null>(null);
  const send = (operation: LessonOperation, at?: string): void => {
    dispatch({
      type: 'lesson',
      id: lesson.id,
      role,
      operation,
      at,
      now: new Date().toISOString(),
    });
  };
  const pending = lesson.completion === 'pending' || lesson.cancellation === 'pending';
  if (!backend && role === 'teacher' && state.teacher.approval !== 'approved') {
    return <Status>{t('teacher-not-approved')}</Status>;
  }
  return (
    <>
      <fieldset disabled={busy} className={styles.actions}>
        {lesson.status === 'upcoming' && (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setDialog('reschedule');
              }}
            >
              {t('reschedule')}
            </button>
            <button
              type="button"
              className={styles.secondary}
              disabled={pending}
              onClick={() => setDialog('cancel')}
            >
              {t(lesson.paid ? 'request-cancellation' : 'cancel-lesson')}
            </button>
            {role === 'teacher' &&
              !pending &&
              canCompleteLesson(lesson, new Date().toISOString()) && (
                <button type="button" onClick={() => send('request-completion')}>
                  {t('request-completion')}
                </button>
              )}
          </>
        )}
        {lesson.status === 'completed' && lesson.type !== 'intro' && role === 'student' && (
          <button
            type="button"
            disabled={Boolean(lesson.review)}
            onClick={() => setDialog('review')}
          >
            {t(lesson.review ? 'already-rated' : 'rate-lesson')}
          </button>
        )}
      </fieldset>
      {lesson.completion === 'pending' && lesson.status === 'upcoming' && (
        <Status>
          {t('completion-pending')}
          {role === 'student' && (
            <div className={styles.actions}>
              <button type="button" onClick={() => send('confirm-completion')}>
                {t('confirm-completion')}
              </button>
              <button
                type="button"
                className={styles.secondary}
                onClick={() => send('reject-completion')}
              >
                {t('reject-completion')}
              </button>
            </div>
          )}
        </Status>
      )}
      {lesson.cancellation === 'pending' && lesson.status === 'upcoming' && (
        <Status>
          {t('cancellation-pending')}
          {lesson.requestedBy !== role && (
            <div className={styles.actions}>
              <button type="button" onClick={() => send('confirm-cancellation')}>
                {t('confirm-cancellation')}
              </button>
              <button
                type="button"
                className={styles.secondary}
                onClick={() => send('reject-cancellation')}
              >
                {t('reject-cancellation')}
              </button>
            </div>
          )}
        </Status>
      )}
      {dialog && <LessonEditDialog lesson={lesson} mode={dialog} onClose={() => setDialog(null)} />}
    </>
  );
};
export default LessonActions;
