import { useState } from 'react';

import useTranslation from 'next-translate/useTranslation';

import { errorCode, studioRequest } from '../client';
import { BufferConnection, PublishingDestination } from '../multiPublishing';
import { PublisherChannel } from '../publishing';

import AdminBufferKeyForm from './AdminBufferKeyForm';
import styles from './AdminVideo.module.scss';

const AdminBufferConnections = ({
  connections,
  destinations,
  refresh,
  disabled,
}: {
  connections: BufferConnection[];
  destinations: PublishingDestination[];
  refresh: () => Promise<unknown>;
  disabled: boolean;
}): JSX.Element => {
  const { t } = useTranslation('video-studio');
  const [channels, setChannels] = useState<PublisherChannel[]>([]);
  const [channelConnection, setChannelConnection] = useState('');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');
  const [saved, setSaved] = useState(false);
  const execute = async (action: () => Promise<unknown>): Promise<void> => {
    setBusy(true);
    setFailure('');
    setSaved(false);
    try {
      await action();
      await refresh();
      setSaved(true);
    } catch (error) {
      setFailure(errorCode(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className={styles.card} aria-labelledby="buffer-connections">
      <h2 id="buffer-connections">
        {t('admin.connections')} ({connections.filter((c) => !c.disconnected).length}/3)
      </h2>
      <p>{t('admin.key-help')}</p>
      <AdminBufferKeyForm
        connections={connections}
        disabled={disabled || busy}
        onSave={async (result) => {
          setChannels(result.channels);
          setChannelConnection(result.id);
          await refresh();
        }}
      />
      {connections.map((c) => (
        <div key={c.id} className={styles.connection}>
          <strong>{c.name}</strong>{' '}
          <span>
            {c.accountId} · {t(c.disconnected ? 'admin.disconnected' : 'admin.connected')} ·{' '}
            {t('admin.api-calls', { count: c.callsToday })}
          </span>
          <div className={styles.actions}>
            <button
              type="button"
              disabled={disabled || busy || c.disconnected}
              onClick={() =>
                execute(async () => {
                  const result = await studioRequest<{ channels: PublisherChannel[] }>(
                    `admin/connections/${c.id}/channels`,
                  );
                  setChannels(result.channels);
                  setChannelConnection(c.id);
                })
              }
            >
              {t('admin.inspect-channels')}
            </button>
            <button
              type="button"
              disabled={disabled || busy || c.disconnected}
              onClick={() =>
                execute(async () => {
                  await studioRequest(`admin/connections/${c.id}`, undefined, 'DELETE');
                  setChannels([]);
                })
              }
            >
              {t('admin.disconnect')}
            </button>
          </div>
        </div>
      ))}
      {channels.length > 0 && (
        <fieldset disabled={disabled || busy}>
          <legend>{t('admin.channels')}</legend>
          {channels.map((c) => (
            <div key={`${c.platform}:${c.id}`} className={styles.connection}>
              <span>
                {c.name} · {c.platform} · {t(c.eligible ? 'admin.eligible' : 'admin.ineligible')}
              </span>
              <button
                type="button"
                disabled={
                  destinations.filter((d) => !d.disconnected).length >= 9 ||
                  destinations.some(
                    (d) =>
                      d.id &&
                      d.connectionId === channelConnection &&
                      d.channelId === c.id &&
                      d.platform === c.platform &&
                      !d.disconnected,
                  )
                }
                onClick={() =>
                  execute(() =>
                    studioRequest('admin/destinations', {
                      connectionId: channelConnection,
                      channelId: c.id,
                    }),
                  )
                }
              >
                {t('admin.add-destination')}
              </button>
            </div>
          ))}
        </fieldset>
      )}
      {saved && <p role="status">{t('admin.saved')}</p>}
      {failure && (
        <p role="alert">
          {t(`errors.${failure}`, undefined, { fallback: t('errors.STUDIO_ERROR') })}
        </p>
      )}
    </section>
  );
};
export default AdminBufferConnections;
