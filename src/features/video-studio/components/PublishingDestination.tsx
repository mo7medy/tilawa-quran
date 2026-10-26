import { useState } from 'react';

import useTranslation from 'next-translate/useTranslation';
import useSWR from 'swr';

import { errorCode, studioRequest } from '../client';
import { PublishingPlatform, PublishingState } from '../publishing';

import PublisherConnect from './PublisherConnect';
import styles from './Studio.module.scss';

interface PublishingDestinationProps {
  scope: string;
  platform: PublishingPlatform;
}
const PublishingDestination = ({ scope, platform }: PublishingDestinationProps): JSX.Element => {
  const { t } = useTranslation('video-studio');
  const { data, error, mutate } = useSWR<PublishingState>(
    ['studio-publishing', scope, platform],
    () => studioRequest(`publishing?platform=${platform}`),
    { refreshInterval: 30000 },
  );
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');
  const update = async (disconnect = false): Promise<void> => {
    setBusy(true);
    setFailure('');
    try {
      await mutate(
        await studioRequest<PublishingState>(
          `publishing?platform=${platform}`,
          disconnect ? undefined : { enabled: !data.connection.enabled },
          disconnect ? 'DELETE' : 'PUT',
        ),
        false,
      );
    } catch (cause) {
      setFailure(errorCode(cause));
    } finally {
      setBusy(false);
    }
  };
  const code = failure || (error ? errorCode(error) : '');
  const toggleLabel = data?.connection?.enabled
    ? 'publishing.pause'
    : `publishing.platforms.${platform}.enable`;
  return (
    <section className={styles.section} aria-labelledby={`publishing-title-${platform}`}>
      <h2 id={`publishing-title-${platform}`}>{t(`publishing.platforms.${platform}.title`)}</h2>
      <p>
        {t('publishing.description', {
          platform: platform === 'instagram' ? 'Instagram' : 'TikTok',
        })}
      </p>
      {code && (
        <p role="alert" className={styles.error}>
          {t(`errors.${code}`, undefined, { fallback: t('errors.STUDIO_ERROR') })}
        </p>
      )}
      {!data && !error && <p role="status">{t('loading')}</p>}
      {data && !data.connection && (
        <PublisherConnect
          platform={platform}
          canReuseToken={data.canReuseToken}
          onConnected={(next) => mutate(next, false)}
        />
      )}
      {data?.connection && (
        <>
          <p>
            {t(data.connection.enabled ? 'publishing.active' : 'publishing.paused', {
              name: data.connection.channelName,
            })}
          </p>
          <p>{t('publishing.consent')}</p>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primary}
              disabled={busy}
              onClick={() => update()}
            >
              {t(busy ? 'loading' : toggleLabel)}
            </button>
            <button
              type="button"
              className={styles.secondary}
              disabled={busy}
              onClick={() => update(true)}
            >
              {t('publishing.disconnect')}
            </button>
          </div>
          <p>{t('publishing.pause-help')}</p>
        </>
      )}
      {!!data?.publications.length && (
        <ul aria-live="polite">
          {data.publications.map((post) => (
            <li key={post.id}>
              <strong>{post.caption}</strong> · {t(`publishing.status.${post.status}`)}
              {post.error &&
                ` — ${t(`errors.${post.error}`, undefined, {
                  fallback: t('errors.STUDIO_ERROR'),
                })}`}
              {post.externalUrl && (
                <>
                  {' '}
                  ·{' '}
                  <a href={post.externalUrl} target="_blank" rel="noreferrer">
                    {t(`publishing.platforms.${platform}.view`)}
                  </a>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
export default PublishingDestination;
