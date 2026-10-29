import { useState } from 'react';

import useTranslation from 'next-translate/useTranslation';
import useSWR from 'swr';

import { errorCode, studioRequest } from '../client';
import { DistributionMode, StudioAdminState } from '../multiPublishing';

import AdminBufferConnections from './AdminBufferConnections';
import styles from './AdminVideo.module.scss';
import AdminVideoDestination from './AdminVideoDestination';
import AdminVideoReports from './AdminVideoReports';

import { useAccountUi } from '@/components/Account/useAccountUi';

const AdminVideoStudio = (): JSX.Element => {
  const { t } = useTranslation('video-studio');
  const { userId } = useAccountUi();
  const { data, error, mutate } = useSWR<StudioAdminState>(
    userId ? ['studio-admin', userId] : null,
    () => studioRequest('admin'),
    { refreshInterval: 30000, revalidateOnFocus: true },
  );
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');
  const [saved, setSaved] = useState(false);
  const change = async (path: string, body: unknown): Promise<void> => {
    setBusy(true);
    setFailure('');
    setSaved(false);
    try {
      await studioRequest(`admin/${path}`, body, 'PUT');
      await mutate();
      setSaved(true);
    } catch (reason) {
      setFailure(errorCode(reason));
    } finally {
      setBusy(false);
    }
  };
  if (error) {
    return (
      <p role="alert">
        {t(`errors.${errorCode(error)}`, undefined, { fallback: t('errors.STUDIO_ERROR') })}
      </p>
    );
  }
  if (!data) return <p role="status">{t('loading')}</p>;
  const disabled = busy || !data.active || data.maintenance;
  return (
    <div className={styles.studio}>
      <section className={styles.card}>
        <h2>{t('admin.title')}</h2>
        <p>{t('admin.schedule')}</p>
        <p>{t('admin.rules')}</p>
        {!data.active && <p role="status">{t('admin.migrating')}</p>}
        <p>
          {t(data.enabled ? 'automation.active' : 'automation.paused')} · {data.day} ·{' '}
          {t('admin.current-mode')}: {t(`admin.${data.mode}`)}
        </p>
        <div className={styles.actions}>
          <label htmlFor="studio-mode">
            {t('admin.next-mode')}
            <select
              key={data.nextMode}
              id="studio-mode"
              defaultValue={data.nextMode}
              disabled={disabled}
              onChange={(event) =>
                change('policy', { mode: event.target.value as DistributionMode })
              }
            >
              <option value="independent">{t('admin.independent')}</option>
              <option value="shared">{t('admin.shared')}</option>
            </select>
          </label>
          <button
            type="button"
            disabled={disabled}
            onClick={() => change('enabled', { enabled: !data.enabled })}
          >
            {t(data.enabled ? 'admin.stop-all' : 'admin.enable-all')}
          </button>
        </div>
        <p>{t('admin.policy-day', { day: data.effectiveDay })}</p>
        <p>
          {t('admin.usage', { count: data.usage.renders, limit: data.usage.renderLimit })} ·{' '}
          {t('admin.storage', { used: (data.usage.storageBytes / 1073741824).toFixed(2) })} ·{' '}
          {t('admin.ai', { count: data.usage.aiCalls, limit: data.usage.aiLimit })}
        </p>
        {saved && <p role="status">{t('admin.saved')}</p>}
        {failure && (
          <p role="alert">
            {t(`errors.${failure}`, undefined, { fallback: t('errors.STUDIO_ERROR') })}
          </p>
        )}
      </section>
      <AdminBufferConnections
        connections={data.connections}
        destinations={data.destinations}
        refresh={mutate}
        disabled={disabled}
      />
      <h2>
        {t('admin.destinations')} ({data.destinations.filter((d) => !d.disconnected).length}/9)
      </h2>
      <div className={styles.grid}>
        {data.destinations.map((d) => (
          <AdminVideoDestination
            key={d.id}
            destination={d}
            disabled={disabled}
            connectionName={data.connections.find((c) => c.id === d.connectionId)?.name ?? ''}
            refresh={mutate}
          />
        ))}
      </div>
      <AdminVideoReports data={data} />
    </div>
  );
};
export default AdminVideoStudio;
