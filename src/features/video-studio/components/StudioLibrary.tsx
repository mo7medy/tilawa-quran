import useTranslation from 'next-translate/useTranslation';

import useLibrary from '../useLibrary';
import useStudioSession from '../useStudioSession';

import ProjectCard from './ProjectCard';
import styles from './Studio.module.scss';

import AcademyLink from '@/components/Academy/AcademyLink';

const StudioLibrary = (): JSX.Element => {
  const { t } = useTranslation('video-studio');
  const { session, error: sessionError } = useStudioSession();
  const { projects, jobs, error, action } = useLibrary(session?.scope);
  return (
    <div className={styles.studio}>
      <header className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>{t('eyebrow')}</p>
          <h1>{t('library')}</h1>
          <p>{t(session?.registered ? 'member-retention' : 'guest-retention')}</p>
        </div>
        <AcademyLink className={styles.primary} href="/video-studio">
          {t('new-project')}
        </AcademyLink>
      </header>
      {session?.canAutomate && (
        <div className={styles.actions}>
          <AcademyLink className={styles.secondary} href="/video-studio/automation">
            {t('automation.title')}
          </AcademyLink>
        </div>
      )}
      {(error || sessionError) && (
        <p role="alert" className={styles.error}>
          {t(`errors.${error || sessionError}`, undefined, { fallback: t('errors.STUDIO_ERROR') })}
        </p>
      )}
      {!session && !sessionError && <p role="status">{t('loading')}</p>}
      {session && !projects.length && <div className={styles.notice}>{t('empty-library')}</div>}
      <div className={styles.library}>
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            jobs={jobs.filter((j) => j.projectId === project.id)}
            action={action}
          />
        ))}
      </div>
    </div>
  );
};
export default StudioLibrary;
