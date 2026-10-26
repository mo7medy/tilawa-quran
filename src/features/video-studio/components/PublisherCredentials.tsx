import useTranslation from 'next-translate/useTranslation';

import { PublishingPlatform } from '../publishing';

interface PublisherCredentialsProps {
  platform: PublishingPlatform;
  canReuseToken: boolean;
  useNewKey: boolean;
  token: string;
  busy: boolean;
  onKeyChange: (value: string) => void;
  onReuseChange: (value: boolean) => void;
}
const PublisherCredentials = ({
  platform,
  canReuseToken,
  useNewKey,
  token,
  busy,
  onKeyChange,
  onReuseChange,
}: PublisherCredentialsProps): JSX.Element => {
  const { t } = useTranslation('video-studio');
  const reuse = canReuseToken && !useNewKey;
  return (
    <>
      {canReuseToken && (
        <label htmlFor={`buffer-new-key-${platform}`}>
          <input
            id={`buffer-new-key-${platform}`}
            type="checkbox"
            checked={useNewKey}
            disabled={busy}
            onChange={(event) => onReuseChange(event.target.checked)}
          />
          {t('publishing.use-new-key')}
        </label>
      )}
      {reuse ? (
        <p>{t('publishing.reuse-key')}</p>
      ) : (
        <>
          <label htmlFor={`buffer-api-key-${platform}`}>
            {t('publishing.key')}
            <input
              id={`buffer-api-key-${platform}`}
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={token}
              maxLength={2048}
              disabled={busy}
              onChange={(event) => onKeyChange(event.target.value)}
            />
          </label>
          <p>{t('publishing.key-security')}</p>
        </>
      )}
    </>
  );
};
export default PublisherCredentials;
