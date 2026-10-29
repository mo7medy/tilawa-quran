/* eslint-disable max-lines -- Owner controls and scoped automation history share one page. */
import { useState } from 'react';

import useTranslation from 'next-translate/useTranslation';
import useSWR from 'swr';

import { AutomationState } from '../automation';
import { errorCode, studioRequest } from '../client';
import useStudioSession from '../useStudioSession';

import AutomationRunCard from './AutomationRunCard';
import PublishingControls from './PublishingControls';
import styles from './Studio.module.scss';

import AcademyLink from '@/components/Academy/AcademyLink';

const StudioAutomation = (): JSX.Element => {
  const { t } = useTranslation('video-studio');
  const { session, error: sessionError } = useStudioSession();
  const { data, error, mutate } = useSWR<AutomationState>(
    session?.canAutomate ? ['studio-automation', session.scope] : null,
    () => studioRequest('automation'),
    { refreshInterval: 15000 },
  );
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const current = session?.canAutomate ? data : undefined;
  const update = async (enabled: boolean, optionalThird: boolean): Promise<void> => {
    setBusy(true);
    setActionError('');
    try {
      const next = await studioRequest<AutomationState>(
        'automation',
        { enabled, optionalThird },
        'PUT',
      );
      await mutate(next, false);
    } catch (failure) {
      setActionError(errorCode(failure));
    } finally {
      setBusy(false);
    }
  };
  const runNow = async (): Promise<void> => {
    setBusy(true);
    setActionError('');
    try {
      await studioRequest('automation/run', {});
      await mutate();
    } catch (failure) {
      setActionError(errorCode(failure));
    } finally {
      setBusy(false);
    }
  };
  const toggleLabel = current?.settings?.enabled ? 'automation.pause' : 'automation.enable';
  const failure = actionError || sessionError || (error ? errorCode(error) : '');
  return (
    <div className={styles.studio}>
      <header className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>{t('eyebrow')}</p>
          <h1>{t('automation.title')}</h1>
          <p>{t('automation.subtitle')}</p>
        </div>
        <AcademyLink href="/video-studio/library" className={styles.secondary}>
          {t('library')}
        </AcademyLink>
      </header>
      {failure && (
        <p className={styles.error} role="alert">
          {t(`errors.${failure}`, undefined, { fallback: t('errors.STUDIO_ERROR') })}
        </p>
      )}
      {!session && !sessionError && <p role="status">{t('loading')}</p>}
      {session && !session.canAutomate && (
        <p className={styles.notice}>{t('automation.private')}</p>
      )}
      {session?.canAutomate && !current && !error && <p role="status">{t('loading')}</p>}
      {current && (
        <>
          <section className={styles.section} aria-labelledby="automation-settings">
            <h2 id="automation-settings">
              {t(current.settings?.enabled ? 'automation.active' : 'automation.paused')}
            </h2>
            <p>{t(current.managed ? 'admin.schedule' : 'automation.schedule')}</p>
            {current.managed && (
              <>
                <AcademyLink href="/1x2003/admin/video-studio">{t('admin.open-admin')}</AcademyLink>
                <ul>
                  {current.managed.destinations.map((d) => (
                    <li key={d.id}>
                      {d.name} · {t('admin.applied', { count: d.dailyCount })} ·{' '}
                      {t(d.paused ? 'admin.paused' : 'admin.eligible')}
                    </li>
                  ))}
                </ul>
              </>
            )}
            <p>{t('automation.decisions')}</p>
            <p>
              {t(current.managed ? 'admin.ai' : 'automation.budget', {
                count: current.aiCallsToday,
                limit: 60,
              })}
            </p>
            {!current.configured && <p role="alert">{t('errors.AUTOMATION_UNAVAILABLE')}</p>}
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.primary}
                disabled={
                  busy ||
                  (!!current.managed && !current.settings?.enabled) ||
                  (!current.configured && !current.settings?.enabled)
                }
                onClick={() =>
                  update(!current.settings?.enabled, current.settings?.optionalThird ?? true)
                }
              >
                {t(busy ? 'loading' : toggleLabel)}
              </button>
              {!current.managed && (
                <>
                  <button
                    type="button"
                    disabled={busy || !current.settings?.enabled}
                    onClick={runNow}
                  >
                    {t('automation.run')}
                  </button>
                  <label htmlFor="automation-optional-third">
                    <input
                      id="automation-optional-third"
                      type="checkbox"
                      checked={current.settings?.optionalThird ?? true}
                      disabled={busy}
                      onChange={(event) =>
                        update(current.settings?.enabled ?? false, event.target.checked)
                      }
                    />{' '}
                    {t('automation.optional')}
                  </label>
                </>
              )}
            </div>
            <p>{t('automation.pause-help')}</p>
            {!current.managed && <p>{t('automation.run-help')}</p>}
          </section>
          {!current.managed && <PublishingControls key={session.scope} scope={session.scope} />}
          <h2 className={styles.automationHistory}>{t('automation.history')}</h2>
          {!current.runs.length && <p className={styles.notice}>{t('automation.empty')}</p>}
          <div className={styles.library} aria-live="polite">
            {current.runs.map((run) => (
              <AutomationRunCard key={run.id} run={run} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
export default StudioAutomation;
