/* eslint-disable react-func/max-lines-per-function -- Form serialization and submission validation stay in one transaction. */
import { useState } from 'react';

import { localDateTime, wallTimeToUtc } from '../../tilawa/account/time';
import type { Lesson } from '../../tilawa/account/types';

import styles from './Account.module.scss';
import { Field, PreviewDialog, Status, TextField } from './AccountUi';
import { useAccountUi } from './useAccountUi';

const LessonEditDialog = ({
  lesson,
  mode,
  onClose,
}: {
  lesson: Lesson;
  mode: 'reschedule' | 'cancel' | 'review';
  onClose: () => void;
}): JSX.Element => {
  const { t, state, role, dispatch } = useAccountUi();
  const [error, setError] = useState(false);
  const zone = role === 'teacher' ? state.availabilityZone : state.student.zone;
  return (
    <PreviewDialog title={t(mode)} onClose={onClose}>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const now = new Date().toISOString();
          let success: boolean | void;
          if (mode === 'reschedule') {
            const at = wallTimeToUtc(String(form.get('at')), zone);
            if (
              !at ||
              Date.parse(at) <= Date.now() ||
              state.lessons.some(
                (other) =>
                  other.id !== lesson.id &&
                  other.status === 'upcoming' &&
                  Date.parse(at) < Date.parse(other.scheduledAt) + other.duration * 60000 &&
                  Date.parse(at) + lesson.duration * 60000 > Date.parse(other.scheduledAt),
              )
            ) {
              setError(true);
              return;
            }
            success = await dispatch({
              type: 'lesson',
              id: lesson.id,
              role,
              operation: 'reschedule',
              at,
              now,
            });
          } else if (mode === 'cancel') {
            success = await dispatch({
              type: 'lesson',
              id: lesson.id,
              role,
              operation: 'cancel',
              now,
            });
          } else {
            success = await dispatch({
              type: 'review',
              id: lesson.id,
              rating: Number(form.get('rating')),
              text: String(form.get('review')),
            });
          }
          if (success !== false) onClose();
        }}
      >
        {mode === 'reschedule' && (
          <>
            <p>{zone}</p>
            <Field
              label={t('new-time')}
              name="at"
              type="datetime-local"
              required
              defaultValue={localDateTime(lesson.scheduledAt, zone)}
            />
            <small>{t('dst-note')}</small>
          </>
        )}
        {mode === 'cancel' && (
          <p>{t(lesson.paid ? 'cancellation-description' : 'cancel-description')}</p>
        )}
        {mode === 'review' && (
          <>
            <label className={styles.field} htmlFor="lesson-rating">
              {t('rating')}
              <select id="lesson-rating" name="rating">
                {[5, 4, 3, 2, 1].map((value) => (
                  <option value={value} key={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <TextField label={t('your-review')} name="review" required />
          </>
        )}
        {error && <Status error>{t('invalid-schedule')}</Status>}
        <button type="submit">{t('confirm-preview')}</button>
      </form>
    </PreviewDialog>
  );
};
export default LessonEditDialog;
