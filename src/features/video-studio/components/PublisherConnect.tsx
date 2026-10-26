import { useState } from 'react';

import useTranslation from 'next-translate/useTranslation';

import { errorCode, studioRequest } from '../client';
import { PublisherChannel, PublishingState } from '../publishing';

import styles from './Studio.module.scss';

interface PublisherConnectProps {
  onConnected: (state: PublishingState) => Promise<unknown>;
}
const PublisherConnect = ({ onConnected }: PublisherConnectProps): JSX.Element => {
  const { t } = useTranslation('video-studio');
  const [token, setToken] = useState('');
  const [channels, setChannels] = useState<PublisherChannel[] | null>(null);
  const [channelId, setChannelId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (): Promise<void> => {
    setBusy(true);
    setError('');
    try {
      if (!channels) {
        const result = await studioRequest<{ channels: PublisherChannel[] }>('publishing/probe', {
          token,
        });
        setChannels(result.channels);
        setChannelId(result.channels.find((channel) => channel.eligible)?.id ?? '');
      } else {
        const state = await studioRequest<PublishingState>('publishing/connect', {
          token,
          channelId,
        });
        setToken('');
        setChannels(null);
        await onConnected(state);
      }
    } catch (failure) {
      setError(errorCode(failure));
    } finally {
      setBusy(false);
    }
  };
  const submitLabel = channels ? 'publishing.connect' : 'publishing.check';
  return (
    <form
      className={styles.fields}
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <p>{t('publishing.setup')}</p>
      <p>
        <a href="https://publish.buffer.com" target="_blank" rel="noreferrer">
          {t('publishing.open-buffer')}
        </a>
        {' · '}
        <a
          href="https://developers.buffer.com/guides/authentication.html"
          target="_blank"
          rel="noreferrer"
        >
          {t('publishing.key-help')}
        </a>
      </p>
      <label htmlFor="buffer-api-key">
        {t('publishing.key')}
        <input
          id="buffer-api-key"
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={token}
          maxLength={2048}
          disabled={busy}
          onChange={(event) => {
            setToken(event.target.value);
            setChannels(null);
          }}
        />
      </label>
      <p>{t('publishing.key-security')}</p>
      {channels && (
        <label htmlFor="buffer-channel">
          {t('publishing.channel')}
          <select
            id="buffer-channel"
            aria-label={t('publishing.channel')}
            value={channelId}
            disabled={busy}
            onChange={(event) => setChannelId(event.target.value)}
          >
            <option value="">{t('publishing.choose')}</option>
            {channels.map((channel) => (
              <option key={channel.id} value={channel.id} disabled={!channel.eligible}>
                {channel.name}
                {!channel.eligible ? ` — ${t('publishing.unavailable')}` : ''}
              </option>
            ))}
          </select>
        </label>
      )}
      {channels && !channels.some((channel) => channel.eligible) && (
        <p role="status">{t('publishing.no-channel')}</p>
      )}
      {error && (
        <p role="alert" className={styles.error}>
          {t(`errors.${error}`, undefined, { fallback: t('errors.STUDIO_ERROR') })}
        </p>
      )}
      <button
        className={styles.secondary}
        type="submit"
        disabled={busy || !token || (!!channels && !channelId)}
      >
        {t(busy ? 'loading' : submitLabel)}
      </button>
    </form>
  );
};
export default PublisherConnect;
