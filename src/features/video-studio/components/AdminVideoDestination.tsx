/* eslint-disable no-nested-ternary -- Map the ordered destination availability states to their labels. */
import { useEffect, useState } from 'react';

import useTranslation from 'next-translate/useTranslation';

import { errorCode, studioRequest } from '../client';
import { PublishingDestination } from '../multiPublishing';

import styles from './AdminVideo.module.scss';

const AdminVideoDestination = ({
  destination,
  connectionName,
  refresh,
  disabled,
}: {
  destination: PublishingDestination;
  connectionName: string;
  refresh: () => Promise<unknown>;
  disabled: boolean;
}): JSX.Element => {
  const { t, lang } = useTranslation('video-studio');
  const [count, setCount] = useState(destination.nextCount);
  const [busy, setBusy] = useState(false);
  useEffect(() => setCount(destination.nextCount), [destination.nextCount]);
  const [message, setMessage] = useState('');
  const [failure, setFailure] = useState('');
  const change = async (value: number, disconnect = false): Promise<void> => {
    setBusy(true);
    setMessage('');
    setFailure('');
    try {
      await studioRequest(
        `admin/destinations/${destination.id}`,
        disconnect ? undefined : { dailyCount: value },
        disconnect ? 'DELETE' : 'PUT',
      );
      setCount(value);
      setMessage(value === 0 ? 'admin.saved-pause' : 'admin.saved-tomorrow');
      await refresh();
    } catch (error) {
      setFailure(errorCode(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <article className={styles.card}>
      <h3>
        {destination.name} · {destination.platform === 'tiktok' ? 'TikTok' : 'Instagram'}
      </h3>
      <p>
        {connectionName} ·{' '}
        {t(
          destination.disconnected
            ? 'admin.disconnected'
            : destination.paused
            ? 'admin.paused'
            : destination.eligible
            ? 'admin.eligible'
            : 'admin.ineligible',
        )}
      </p>
      <p>
        {t('admin.applied', { count: destination.dailyCount })} ·{' '}
        {t('admin.upcoming', { count: destination.nextCount, day: destination.effectiveDay })}
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          change(count);
        }}
        className={styles.actions}
      >
        <label htmlFor={`count-${destination.id}`}>
          {t('admin.daily-count')}
          <select
            id={`count-${destination.id}`}
            value={count}
            onChange={(event) => setCount(Number(event.target.value))}
            disabled={busy || disabled || destination.disconnected}
          >
            {[0, 1, 2, 3].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={busy || disabled || destination.disconnected}>
          {t('admin.save')}
        </button>
        <button
          type="button"
          disabled={
            busy ||
            disabled ||
            destination.disconnected ||
            (destination.paused && destination.nextCount === 0)
          }
          onClick={() => change(0)}
        >
          {t('admin.stop')}
        </button>
        <button
          type="button"
          disabled={busy || disabled || destination.disconnected}
          onClick={() => change(0, true)}
        >
          {t('admin.disconnect')}
        </button>
      </form>
      <p>
        {t('admin.next-time')}:{' '}
        {destination.nextAt
          ? new Intl.DateTimeFormat(lang, {
              dateStyle: 'medium',
              timeStyle: 'short',
              timeZone: 'Africa/Cairo',
            }).format(destination.nextAt)
          : '—'}
      </p>
      <dl className={styles.stats}>
        {(['required', 'generated', 'pending', 'published', 'failed'] as const).map((key) => (
          <div key={key}>
            <dt>{t(`admin.${key}`)}</dt>
            <dd>{destination[key]}</dd>
          </div>
        ))}
      </dl>
      {message && <p role="status">{t(message)}</p>}
      {failure && (
        <p role="alert">
          {t(`errors.${failure}`, undefined, { fallback: t('errors.STUDIO_ERROR') })}
        </p>
      )}
    </article>
  );
};
export default AdminVideoDestination;
