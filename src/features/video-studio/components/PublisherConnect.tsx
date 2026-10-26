import { useState } from 'react';

import useTranslation from 'next-translate/useTranslation';

import { errorCode, studioRequest } from '../client';
import { PublisherChannel, PublishingPlatform, PublishingState } from '../publishing';

import PublisherCredentials from './PublisherCredentials';
import styles from './Studio.module.scss';

interface PublisherConnectProps {
  platform: PublishingPlatform;
  canReuseToken: boolean;
  onConnected: (state: PublishingState) => Promise<unknown>;
}
const PublisherConnect = ({
  onConnected,
  platform,
  canReuseToken,
}: PublisherConnectProps): JSX.Element => {
  const { t } = useTranslation('video-studio');
  const [token, setToken] = useState('');
  const [useNewKey, setUseNewKey] = useState(false);
  const reuse = canReuseToken && !useNewKey;
  const [channels, setChannels] = useState<PublisherChannel[] | null>(null);
  const [channelId, setChannelId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (): Promise<void> => {
    setBusy(true);
    setError('');
    try {
      if (!channels) {
        const result = await studioRequest<{ channels: PublisherChannel[] }>(
          `publishing/probe?platform=${platform}`,
          {
            ...(reuse ? {} : { token }),
          },
        );
        setChannels(result.channels);
        setChannelId(result.channels.find((channel) => channel.eligible)?.id ?? '');
      } else {
        const state = await studioRequest<PublishingState>(
          `publishing/connect?platform=${platform}`,
          {
            ...(reuse ? {} : { token }),
            channelId,
          },
        );
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
      <p>{t(`publishing.platforms.${platform}.setup`)}</p>
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
      <PublisherCredentials
        platform={platform}
        canReuseToken={canReuseToken}
        useNewKey={useNewKey}
        token={token}
        busy={busy}
        onKeyChange={(value) => {
          setToken(value);
          setChannels(null);
        }}
        onReuseChange={(value) => {
          setUseNewKey(value);
          setToken('');
          setChannels(null);
        }}
      />
      {channels && (
        <label htmlFor={`buffer-channel-${platform}`}>
          {t(`publishing.platforms.${platform}.channel`)}
          <select
            id={`buffer-channel-${platform}`}
            aria-label={t(`publishing.platforms.${platform}.channel`)}
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
        <p role="status">{t(`publishing.platforms.${platform}.no-channel`)}</p>
      )}
      {error && (
        <p role="alert" className={styles.error}>
          {t(`errors.${error}`, undefined, { fallback: t('errors.STUDIO_ERROR') })}
        </p>
      )}
      <button
        className={styles.secondary}
        type="submit"
        disabled={busy || (!reuse && !token) || (!!channels && !channelId)}
      >
        {t(busy ? 'loading' : submitLabel)}
      </button>
    </form>
  );
};
export default PublisherConnect;
