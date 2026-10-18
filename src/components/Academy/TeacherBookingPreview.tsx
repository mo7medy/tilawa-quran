/* eslint-disable react/no-multi-comp -- A small mode wrapper selects the colocated live or isolated design-preview component. */
import { useId, useState } from 'react';

import useTranslation from 'next-translate/useTranslation';

import {
  formatPreviewSlot,
  getPreviewLessonOptions,
  getPreviewSlots,
} from '../../tilawa/teacherBookingPreview';
import type { PreviewLessonType } from '../../tilawa/teacherBookingPreview';
import { getTeacherName } from '../../tilawa/teachers';
import type { AcademyTeacherProfile } from '../../tilawa/teachers';

import LessonOptions from './LessonOptions';
import LiveTeacherBooking from './LiveTeacherBooking';
import TeacherAvailability from './TeacherAvailability';
import styles from './TeacherProfile.module.scss';

interface TeacherBookingPreviewProps {
  teacher: AcademyTeacherProfile;
  referenceDate: string;
}

const DemoTeacherBooking = ({
  teacher,
  referenceDate,
}: TeacherBookingPreviewProps): JSX.Element => {
  const { t, lang } = useTranslation('academy');
  const goalId = useId();
  const [type, setType] = useState<PreviewLessonType>('intro');
  const [date, setDate] = useState(referenceDate);
  const [zone, setZone] = useState('UTC');
  const [slot, setSlot] = useState('');
  const [goal, setGoal] = useState('');
  const [reviewed, setReviewed] = useState(false);
  const options = getPreviewLessonOptions(
    teacher.sessionDurationMinutes,
    teacher.sessionPriceCents,
  );
  const option = options.find((candidate) => candidate.id === type);
  const validSlot = date >= referenceDate && getPreviewSlots(date).includes(slot);
  return (
    <aside className={styles.booking} id="availability" aria-labelledby="booking-title">
      <h2 id="booking-title">{t('profile.booking-title')}</h2>
      <p className={styles.previewNotice}>{t('profile.booking-demo')}</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (validSlot) setReviewed(true);
        }}
      >
        <LessonOptions
          options={options}
          value={type}
          onChange={(value) => {
            setType(value);
            setReviewed(false);
          }}
        />
        <TeacherAvailability
          date={date}
          minimumDate={referenceDate}
          zone={zone}
          selectedSlot={slot}
          onDateChange={(value) => {
            setDate(value);
            setSlot('');
            setReviewed(false);
          }}
          onZoneChange={(value) => {
            setZone(value);
            setReviewed(false);
          }}
          onSlotChange={(value) => {
            setSlot(value);
            setReviewed(false);
          }}
        />
        <label className={styles.goalLabel} htmlFor={goalId}>
          {t('profile.learning-goal')}
          <textarea
            id={goalId}
            value={goal}
            maxLength={500}
            rows={3}
            onChange={(event) => {
              setGoal(event.target.value);
              setReviewed(false);
            }}
            placeholder={t('profile.goal-placeholder')}
          />
        </label>
        <button className={styles.primaryButton} type="submit" disabled={!validSlot}>
          {t('profile.review-request')}
        </button>
        {reviewed && (
          <div className={styles.requestSummary} role="status">
            <h3>{t('profile.request-summary')}</h3>
            <p>{getTeacherName(teacher, lang)}</p>
            <p>
              {t(`profile.lesson-types.${type}`)} ·{' '}
              {t('profile.minutes', { count: option.durationMinutes })}
            </p>
            <p>
              {formatPreviewSlot(slot, lang, zone)} · {zone}
            </p>
            {goal && <p>{goal}</p>}
            <strong>{t('profile.not-submitted')}</strong>
          </div>
        )}
      </form>
    </aside>
  );
};
const TeacherBookingPreview = ({
  teacher,
  referenceDate,
}: TeacherBookingPreviewProps): JSX.Element =>
  process.env.NODE_ENV === 'test' || teacher.isIllustrative ? (
    <DemoTeacherBooking teacher={teacher} referenceDate={referenceDate} />
  ) : (
    <LiveTeacherBooking teacher={teacher} />
  );

export default TeacherBookingPreview;
