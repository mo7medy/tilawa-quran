/* eslint-disable no-nested-ternary -- Small enum/label selections keep existing UI and wire-state mappings adjacent. */
/* eslint-disable max-lines -- Keep this cohesive form or typed data contract together; reader services are split by feature. */
import { useId, useState } from 'react';

import useTranslation from 'next-translate/useTranslation';
import useSWR from 'swr';

import AcademyLink from './AcademyLink';
import styles from './TeacherProfile.module.scss';

import { useAccountPreview } from '@/components/Account/AccountPreviewProvider';
import { tilawaFetch } from '@/tilawa/backend/http';
import { rows, string } from '@/tilawa/backend/mappers';
import type { AcademyTeacherProfile } from '@/tilawa/teachers';

const LiveTeacherBooking = ({ teacher }: { teacher: AcademyTeacherProfile }): JSX.Element => {
  const { t, lang } = useTranslation('account');
  const { userId, loading, state, snapshot, command, busy } = useAccountPreview();
  const id = useId();
  const [subject, setSubject] = useState(
    teacher.specialties.includes('arabic_for_non_arabic_speakers') ? 'arabic' : 'quran',
  );
  const [date, setDate] = useState(() => {
    const day = new Date();
    day.setUTCDate(day.getUTCDate() + 1);
    return day.toISOString().slice(0, 10);
  });
  const [source, setSource] = useState('intro');
  const [slot, setSlot] = useState('');
  const [note, setNote] = useState('');
  const [result, setResult] = useState('');
  const [failed, setFailed] = useState(false);
  const subscriptions = rows(snapshot?.subscriptions).filter(
    (s) =>
      s.student_id === userId &&
      s.status === 'active' &&
      Date.parse(string(s.access_ends_at)) > Date.now() &&
      (s.kind === 'academy' ? teacher.academyEnabled : s.teacher_id === teacher.id),
  );
  const [subscriptionId, bucket = 'regular'] = source.split(':');
  const subscription = subscriptions.find((s) => s.id === subscriptionId);
  const duration = subscription
    ? Number(subscription.duration_minutes)
    : teacher.sessionDurationMinutes > 35
    ? teacher.sessionDurationMinutes - 15
    : teacher.sessionDurationMinutes;
  const zone = state.student.zone || 'UTC';
  const usedIntro =
    state.lessons.some(
      (l) => l.teacherId === teacher.id && l.type === 'intro' && l.status !== 'cancelled',
    ) ||
    state.requests.some(
      (b) =>
        b.teacherId === teacher.id &&
        b.type === 'intro' &&
        ['pending', 'accepted'].includes(b.status),
    );
  const {
    data: slots,
    error,
    isValidating,
  } = useSWR<string[]>(
    userId && date ? ['tilawa-slots', userId, teacher.id, date, duration, zone] : null,
    () =>
      tilawaFetch(
        `slots?teacher=${teacher.id}&date=${date}&duration=${duration}&zone=${encodeURIComponent(
          zone,
        )}`,
      ),
  );
  if (loading) return <p role="status">{t('loading')}</p>;
  if (!userId) {
    return (
      <div className={styles.booking}>
        <p>{t('sign-in-required')}</p>
        <AcademyLink
          href={`/sign-in?redirectTo=${encodeURIComponent(
            `/teachers/${teacher.slug}?action=booking`,
          )}`}
        >
          {t('login')}
        </AcademyLink>
      </div>
    );
  }
  if (!state.student.birthDate || !state.student.goal) {
    return (
      <div className={styles.booking}>
        <p>{t('complete-student-first')}</p>
        <AcademyLink href="/profile">{t('profile')}</AcademyLink>
      </div>
    );
  }
  return (
    <div className={styles.booking}>
      <h2>{t('choose-lesson')}</h2>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (!slot || !command) return;
          setResult('');
          setFailed(false);
          try {
            await command('book', {
              teacherId: teacher.id,
              subject,
              lessonType: subscription ? 'follow_up' : 'intro',
              scheduledAt: slot,
              note,
              ...(subscription ? { subscriptionId, bucket } : {}),
            });
            setSlot('');
            setResult('booking-created');
          } catch {
            setFailed(true);
            setResult('backend-error');
          }
        }}
      >
        <label htmlFor={`${id}-subject`}>{t('subject-label')}</label>
        <select
          id={`${id}-subject`}
          value={subject}
          onChange={(event) => {
            setSubject(event.target.value);
            setSource('intro');
            setSlot('');
          }}
        >
          {teacher.specialties.includes('arabic_for_non_arabic_speakers') && (
            <option value="arabic">{t('subject.arabic')}</option>
          )}
          {teacher.specialties.some((s) => ['tajweed', 'memorization'].includes(s)) && (
            <option value="quran">{t('subject.quran')}</option>
          )}
        </select>
        <label htmlFor={`${id}-source`}>{t('lesson-funding')}</label>
        <select
          id={`${id}-source`}
          value={source}
          onChange={(event) => {
            setSource(event.target.value);
            setSlot('');
          }}
        >
          <option value="intro" disabled={usedIntro}>
            {t('free-intro')}
            {usedIntro ? ` · ${t('already-used')}` : ''}
          </option>
          {subscriptions.flatMap((s) => {
            const credits = rows(snapshot?.credits).filter((c) => c.subscription_id === s.id);
            const balance = (kind: string): number =>
              credits.filter((c) => c.bucket === kind).reduce((sum, c) => sum + Number(c.delta), 0);
            return [
              ...(s.subject === subject && balance('regular') > 0
                ? [
                    <option key={`${s.id}:regular`} value={`${s.id}:regular`}>
                      {t(s.kind === 'academy' ? 'academy-package' : 'teacher-subscription')} ·{' '}
                      {balance('regular')} {t('lessons-remaining')}
                    </option>,
                  ]
                : []),
              ...(s.kind === 'academy' && subject === 'quran' && s.gift_type && balance('gift') > 0
                ? [
                    <option key={`${s.id}:gift`} value={`${s.id}:gift`}>
                      {t('gift-lesson')} ·{' '}
                      {t(s.gift_type === 'memorization' ? 'memorization' : 'recitation')}
                    </option>,
                  ]
                : []),
            ];
          })}
          <option disabled>{t('payments-later')}</option>
        </select>
        <p>
          {t('duration', { minutes: duration })} · {zone}
        </p>
        <label htmlFor={`${id}-date`}>{t('appointment')}</label>
        <input
          id={`${id}-date`}
          type="date"
          min={new Date().toISOString().slice(0, 10)}
          value={date}
          onChange={(event) => {
            setDate(event.target.value);
            setSlot('');
          }}
          required
        />
        <label htmlFor={`${id}-slot`}>{t('available-times')}</label>
        <select
          id={`${id}-slot`}
          value={slot}
          onChange={(event) => setSlot(event.target.value)}
          required
          disabled={isValidating}
        >
          <option value="">{t(isValidating ? 'loading' : 'select-time')}</option>
          {(slots ?? []).map((time) => (
            <option value={time} key={time}>
              {new Intl.DateTimeFormat(lang, {
                timeZone: zone,
                hour: 'numeric',
                minute: '2-digit',
              }).format(new Date(time))}
            </option>
          ))}
        </select>
        {!isValidating && !slots?.length && <p>{t('no-availability')}</p>}
        {error && <p role="alert">{t('backend-error')}</p>}
        <label htmlFor={`${id}-note`}>{t('learning-goal')}</label>
        <textarea
          id={`${id}-note`}
          rows={3}
          maxLength={500}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        <button
          className={styles.primaryButton}
          type="submit"
          disabled={busy || !slot || (!subscription && usedIntro)}
        >
          {t('send-booking')}
        </button>
        {result && <p role={failed ? 'alert' : 'status'}>{t(result)}</p>}
        <AcademyLink href="/profile/lessons">{t('back-lessons')}</AcademyLink>
      </form>
    </div>
  );
};
export default LiveTeacherBooking;
