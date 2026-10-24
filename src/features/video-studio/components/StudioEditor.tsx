import { studioRequest } from '../client';
import { StudioProject } from '../contracts';
import useEditor, { EditorProps } from '../useEditor';

import BackgroundControls from './BackgroundControls';
import ContentControls from './ContentControls';
import styles from './Studio.module.scss';
import StudioExport from './StudioExport';
import StudioPreview from './StudioPreview';
import StyleControls from './StyleControls';

import AcademyLink from '@/components/Academy/AcademyLink';

const StudioEditor = (props: EditorProps): JSX.Element => {
  const { session } = props;
  const state = useEditor(props);
  const {
    t,
    catalog,
    error,
    guestProject,
    run,
    setProject,
    setSpec,
    setResolved,
    setGuestProject,
    spec,
    change,
    challenge,
    consume,
    setError,
    busy,
  } = state;
  return (
    <div className={styles.studio}>
      <header className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>{t('eyebrow')}</p>
          <h1>{t('title')}</h1>
          <p>{t('subtitle')}</p>
        </div>
        <AcademyLink href="/video-studio/library" className={styles.secondary}>
          {t('library')}
        </AcademyLink>
      </header>
      {!catalog?.enabled && <p className={styles.notice}>{t('paused')}</p>}
      {error && (
        <p role="alert" className={styles.error}>
          {t(`errors.${error}`, undefined, { fallback: t('errors.STUDIO_ERROR') })}
        </p>
      )}
      {guestProject && (
        <div className={styles.notice}>
          <p>{t('claim-help')}</p>
          <button
            type="button"
            onClick={() =>
              run(async () => {
                const p = await studioRequest<StudioProject>(`projects/${guestProject}/claim`, {});
                setProject(p);
                setSpec(p.spec);
                setResolved(null);
                setGuestProject('');
                localStorage.removeItem('tilawa-studio-guest-project');
              })
            }
          >
            {t('claim')}
          </button>
        </div>
      )}
      <div className={styles.workspace}>
        <StudioPreview state={state} />
        <div className={styles.settings} aria-busy={busy}>
          <ContentControls spec={spec} change={change} catalog={catalog} />
          <StyleControls spec={spec} change={change} />
          <BackgroundControls
            spec={spec}
            change={change}
            catalog={catalog}
            challenge={challenge}
            onConsumed={consume}
            onError={setError}
          />
          <StudioExport state={state} session={session} />
        </div>
      </div>
    </div>
  );
};
export default StudioEditor;
