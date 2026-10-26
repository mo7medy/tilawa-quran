import useTranslation from 'next-translate/useTranslation';

import { StudioCatalog } from '../contracts';
import useBackgroundUpload from '../useBackgroundUpload';

import BackgroundAnimationControls from './BackgroundAnimationControls';
import { ControlProps } from './ContentControls';
import LibraryBackgroundPicker from './LibraryBackgroundPicker';
import styles from './Studio.module.scss';

const BackgroundControls = ({
  spec,
  change,
  catalog,
  onError,
}: ControlProps & {
  catalog: StudioCatalog | null;
  onError: (code: string) => void;
}): JSX.Element => {
  const { t } = useTranslation('video-studio');
  const { busy, upload } = useBackgroundUpload({ spec, change, onError });
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
                  slides: [],
                  animate: false,
                  type: e.target.value as 'color' | 'library' | 'upload',
                  value: {
                    color: '#102b30',
                    library:
                      catalog?.backgrounds.find((b) => b.orientation === spec.ratio)?.id ?? 'sea',
                    upload: '',
                  }[e.target.value],
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
          <LibraryBackgroundPicker spec={spec} change={change} catalog={catalog} />
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
                const input = e.target;
                const file = input.files?.[0];
                input.value = '';
                if (file) upload(file);
              }}
            />
            <small>{t(uploadLabel)}</small>
          </label>
        )}
        <BackgroundAnimationControls spec={spec} change={change} catalog={catalog} />
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
