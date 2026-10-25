import { studioRequest } from '../client';
import type { EditorState, EditorProps } from '../useEditor';

import styles from './Studio.module.scss';

import AcademyLink from '@/components/Academy/AcademyLink';

const StudioExport = ({
  state,
  session,
}: {
  state: EditorState;
  session: EditorProps['session'];
}): JSX.Element => {
  const { t, job, busy, ready, resolved, run, generate, setJob } = state;
  const date = (ms: number): string =>
    new Date(ms).toLocaleString(state.lang, { timeZone: 'Africa/Cairo' });
  const active = job && !['completed', 'failed', 'cancelled', 'expired'].includes(job.status);
  const download = async (): Promise<void> => {
    const result = await studioRequest<{ url: string }>(`jobs/${job.id}/download`);
    window.location.assign(result.url);
  };
  return (
    <section className={styles.section}>
      <h2>{t('export')}</h2>
      <div className={styles.fields}>
        <p>{t('quota', { remaining: session.quota.remaining, limit: session.quota.limit })}</p>
        <small>{t('reset-at', { date: date(session.quota.resetAt) })}</small>
        <p>{t('max-duration', { seconds: session.quota.maxDurationMs / 1000 })}</p>
        <small>
          {t('storage', {
            used: (session.quota.storageBytes / 1048576).toFixed(1),
            limit: Math.round(session.quota.storageLimit / 1048576),
          })}
        </small>
        <p>{t('output-format')}</p>
        <button
          type="button"
          className={styles.primary}
          disabled={
            busy ||
            active ||
            !ready ||
            !resolved ||
            !session.quota.available ||
            !session.quota.remaining
          }
          onClick={() => run(generate)}
        >
          {t('generate')}
        </button>
        {!session.registered && (
          <p>
            {t('guest-retention')} <AcademyLink href="/sign-in">{t('sign-in')}</AcademyLink>
          </p>
        )}
        {job && (
          <div role="status">
            <p>{t(`statuses.${job.status}`)}</p>
            <progress max={100} value={job.progress} aria-label={t('progress')} />
            <p>{job.progress}%</p>
            {job.error && (
              <p>{t(`errors.${job.error}`, undefined, { fallback: t('errors.RENDER_FAILED') })}</p>
            )}
            {active && (
              <button
                type="button"
                onClick={() =>
                  run(async () => {
                    await studioRequest(`jobs/${job.id}/cancel`, {});
                    setJob({ ...job, status: 'cancel_requested' });
                  })
                }
              >
                {t('cancel')}
              </button>
            )}
            {job.status === 'completed' && (
              <button type="button" onClick={() => run(download)}>
                {t('download')}
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
export default StudioExport;
