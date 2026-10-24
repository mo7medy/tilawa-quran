import { Player } from '@remotion/player';

import { studioRequest } from '../client';
import VideoScene from '../scene/VideoScene';
import type { EditorState } from '../useEditor';

import styles from './Studio.module.scss';

import AcademyIcon from '@/components/Academy/AcademyIcon';

const StudioPreview = ({ state }: { state: EditorState }): JSX.Element => {
  const {
    t,
    lang,
    resolved,
    onReady,
    busy,
    catalog,
    run,
    setReady,
    setResolved,
    spec,
    save,
    saved,
    project,
  } = state;
  const date = (ms: number): string =>
    new Date(ms).toLocaleString(lang, { timeZone: 'Africa/Cairo' });
  return (
    <section className={styles.preview} aria-label={t('preview')}>
      <div className={styles.previewHead}>
        <h2>{t('preview')}</h2>
        <span>{t('ayah-sync')}</span>
      </div>
      <div className={styles.canvas}>
        {resolved ? (
          <Player
            key={resolved.hash}
            component={VideoScene}
            inputProps={{ manifest: resolved.manifest, onReady }}
            durationInFrames={Math.ceil((resolved.manifest.durationMs * 30) / 1000)}
            fps={30}
            compositionWidth={resolved.manifest.width}
            compositionHeight={resolved.manifest.height}
            controls
            style={{
              width: '100%',
              maxHeight: '65vh',
              aspectRatio: `${resolved.manifest.width}/${resolved.manifest.height}`,
            }}
          />
        ) : (
          <div className={styles.placeholder}>
            <span aria-hidden>
              <AcademyIcon name="play" size={24} />
            </span>
            <p>{t('preview-help')}</p>
          </div>
        )}
      </div>
      <div className={styles.actions}>
        <button
          className={styles.primary}
          type="button"
          disabled={busy || !catalog}
          onClick={() =>
            run(async () => {
              setReady(false);
              setResolved(await studioRequest('resolve', { spec }));
            })
          }
        >
          {t('prepare-preview')}
        </button>
        <button
          className={styles.secondary}
          type="button"
          disabled={busy}
          onClick={() =>
            run(async () => {
              await save();
            })
          }
        >
          {t(saved ? 'saved' : 'save')}
        </button>
      </div>
      <p>
        {resolved
          ? t('duration', { seconds: (resolved.manifest.durationMs / 1000).toFixed(2) })
          : t('source-note')}
      </p>
      {project && <small>{t('project-expires', { date: date(project.expiresAt) })}</small>}
    </section>
  );
};
export default StudioPreview;
