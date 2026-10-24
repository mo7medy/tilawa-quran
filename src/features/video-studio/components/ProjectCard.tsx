import { useState } from 'react';

import useTranslation from 'next-translate/useTranslation';

import { studioRequest } from '../client';
import { StudioProject, VideoRenderJob } from '../contracts';

import styles from './Studio.module.scss';

import AcademyIcon from '@/components/Academy/AcademyIcon';
import AcademyLink from '@/components/Academy/AcademyLink';

const ProjectCard = ({
  project: p,
  jobs,
  action,
}: {
  project: StudioProject;
  jobs: VideoRenderJob[];
  action: (fn: () => Promise<void>) => Promise<void>;
}): JSX.Element => {
  const { t, lang } = useTranslation('video-studio');
  const [confirm, setConfirm] = useState(false);
  const date = (ms: number): string =>
    new Date(ms).toLocaleString(lang, { timeZone: 'Africa/Cairo' });
  return (
    <article className={styles.project}>
      <span className={styles.projectMark} aria-hidden>
        <AcademyIcon name="book" size={24} />
      </span>
      <h2>{p.spec.title || t('untitled')}</h2>
      <p>
        {p.spec.chapterId}:{p.spec.from}–{p.spec.to}
      </p>
      <small>{t('project-expires', { date: date(p.expiresAt) })}</small>
      <div className={styles.actions}>
        <AcademyLink href={`/video-studio?project=${p.id}`}>{t('edit-regenerate')}</AcademyLink>
        <button
          type="button"
          onClick={() =>
            action(async () => {
              await studioRequest('projects', { spec: p.spec });
            })
          }
        >
          {t('duplicate')}
        </button>
        <button type="button" onClick={() => setConfirm(true)}>
          {t('delete')}
        </button>
      </div>
      {confirm && (
        <div className={styles.notice}>
          <p>{t('delete-confirm')}</p>
          <button
            type="button"
            onClick={() =>
              action(async () => {
                await studioRequest(`projects/${p.id}`, undefined, 'DELETE');
              })
            }
          >
            {t('confirm-delete')}
          </button>
          <button type="button" onClick={() => setConfirm(false)}>
            {t('keep-project')}
          </button>
        </div>
      )}
      {jobs.map((j) => (
        <div className={styles.job} key={j.id}>
          <p role="status">
            {t(`statuses.${j.status}`)} — {j.progress}%
          </p>
          <small>{t('file-expires', { date: date(j.expiresAt) })}</small>
          {j.error && (
            <p>{t(`errors.${j.error}`, undefined, { fallback: t('errors.RENDER_FAILED') })}</p>
          )}
          {j.status === 'completed' && (
            <>
              <button
                type="button"
                onClick={() =>
                  action(async () => {
                    const d = await studioRequest<{ url: string }>(`jobs/${j.id}/download`);
                    window.location.assign(d.url);
                  })
                }
              >
                {t('download')}
              </button>
              <button
                type="button"
                onClick={() =>
                  action(async () => {
                    await studioRequest(`jobs/${j.id}`, undefined, 'DELETE');
                  })
                }
              >
                {t('delete-video')}
              </button>
            </>
          )}
          {['queued', 'preparing', 'rendering', 'uploading', 'cancel_requested'].includes(
            j.status,
          ) && (
            <button
              type="button"
              onClick={() =>
                action(async () => {
                  await studioRequest(`jobs/${j.id}/cancel`, {});
                })
              }
            >
              {t('cancel')}
            </button>
          )}
        </div>
      ))}
    </article>
  );
};
export default ProjectCard;
