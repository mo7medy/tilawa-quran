import useTranslation from 'next-translate/useTranslation';

import { StudioCatalog } from '../contracts';
import useBackgroundUpload from '../useBackgroundUpload';

import { ControlProps } from './ContentControls';
import styles from './Studio.module.scss';

const BackgroundControls = ({
  spec,
  change,
  catalog,
  challenge,
  onConsumed,
  onError,
}: ControlProps & {
  catalog: StudioCatalog | null;
  challenge: string;
  onConsumed: () => void;
  onError: (code: string) => void;
}): JSX.Element => {
  const { t } = useTranslation('video-studio');
  const { busy, upload } = useBackgroundUpload({ spec, change, challenge, onConsumed, onError });
  let uploadLabel = spec.background.value ? 'file-ready' : 'upload-help';
  if (busy) uploadLabel = 'checking-file';
  return (
    <details className={styles.section}>
      <summary>{t('background')}</summary>
      <div className={styles.fields}>
        <label htmlFor="studio-backgroundcontrols-1">
          {t('background-type')}
          <select
            id="studio-backgroundcontrols-1"
            value={spec.background.type}
            onChange={(e) =>
              change({
                background: {
                  ...spec.background,
                  type: e.target.value as 'color' | 'library' | 'upload',
                  value: { color: '#102b30', library: 'sea', upload: '' }[e.target.value],
                },
              })
            }
          >
            <option value="color">{t('solid')}</option>
            <option value="library">{t('site-backgrounds')}</option>
            <option value="upload">{t('upload')}</option>
          </select>
        </label>
        {spec.background.type === 'color' && (
          <label htmlFor="studio-backgroundcontrols-2">
            {t('background-color')}
            <input
              id="studio-backgroundcontrols-2"
              type="color"
              value={spec.background.value}
              onChange={(e) =>
                change({ background: { ...spec.background, value: e.target.value } })
              }
            />
          </label>
        )}
        {spec.background.type === 'library' && (
          <label htmlFor="studio-backgroundcontrols-3">
            {t('site-backgrounds')}
            <select
              id="studio-backgroundcontrols-3"
              value={spec.background.value}
              onChange={(e) =>
                change({ background: { ...spec.background, value: e.target.value } })
              }
            >
              {catalog?.backgrounds.map((b) => (
                <option key={b.id} value={b.id}>
                  {t(`backgrounds.${b.id}`)}
                </option>
              ))}
            </select>
          </label>
        )}
        {spec.background.type === 'upload' && (
          <label htmlFor="studio-backgroundcontrols-4">
            {t('upload-file')}
            <input
              id="studio-backgroundcontrols-4"
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4"
              disabled={busy || !catalog?.enabled}
              onChange={(e) => {
                if (e.target.files?.[0]) upload(e.target.files[0]);
              }}
            />
            <small>{t(uploadLabel)}</small>
          </label>
        )}
        <label htmlFor="studio-backgroundcontrols-5">
          {t('darken')}
          <input
            id="studio-backgroundcontrols-5"
            type="range"
            min={0}
            max={0.85}
            step={0.05}
            value={spec.background.opacity}
            onChange={(e) =>
              change({ background: { ...spec.background, opacity: Number(e.target.value) } })
            }
          />
        </label>
        <label htmlFor="studio-backgroundcontrols-6">
          {t('crop')}
          <input
            id="studio-backgroundcontrols-6"
            type="range"
            min={0}
            max={100}
            value={spec.background.position}
            onChange={(e) =>
              change({ background: { ...spec.background, position: Number(e.target.value) } })
            }
          />
        </label>
        <p>{t('muted-background')}</p>
      </div>
    </details>
  );
};
export default BackgroundControls;
