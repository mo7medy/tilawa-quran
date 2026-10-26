import useTranslation from 'next-translate/useTranslation';

import { AUTOMATION_HOURS, AutomationRun } from '../automation';

import styles from './Studio.module.scss';

import AcademyLink from '@/components/Academy/AcademyLink';

const AutomationRunCard = ({ run }: { run: AutomationRun }): JSX.Element => {
  const { t, lang } = useTranslation('video-studio');
  return (
    <article className={styles.project}>
      <h3>{run.plan?.spec.title ?? `${run.day} · ${AUTOMATION_HOURS[run.slot]}:00`}</h3>
      <p>{t(`automation.states.${run.status}`)}</p>
      <p>
        {new Date(run.createdAt).toLocaleString(lang, { timeZone: 'Africa/Cairo' })} ·{' '}
        {t('automation.cairo')}
      </p>
      {run.plan && (
        <>
          <p>{run.plan.caption}</p>
          <p>{run.plan.hashtags.join(' ')}</p>
          <p>
            {t('automation.duration', {
              seconds: (run.plan.durationMs / 1000).toFixed(1),
              reciter: run.plan.spec.reciterId,
            })}
          </p>
        </>
      )}
      {run.error && (
        <p>{t(`errors.${run.error}`, undefined, { fallback: t('errors.STUDIO_ERROR') })}</p>
      )}
      {run.projectId && (
        <AcademyLink className={styles.secondary} href={`/video-studio?project=${run.projectId}`}>
          {t('open-project')}
        </AcademyLink>
      )}
    </article>
  );
};
export default AutomationRunCard;
