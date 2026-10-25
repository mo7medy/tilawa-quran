import { useRouter } from 'next/router';
import useTranslation from 'next-translate/useTranslation';

import useStudioSession from '../useStudioSession';

import styles from './Studio.module.scss';
import StudioEditor from './StudioEditor';

const StudioEntry = (): JSX.Element => {
  const { session, error, refresh } = useStudioSession();
  const { t } = useTranslation('video-studio');
  const router = useRouter();
  if (!session) {
    return (
      <div className={styles.studio} role={error ? 'alert' : 'status'}>
        <h1>{t('title')}</h1>
        <p>
          {t(error ? `errors.${error}` : 'loading', undefined, {
            fallback: t('errors.STUDIO_ERROR'),
          })}
        </p>
      </div>
    );
  }
  return (
    <>
      {error && (
        <p role="alert" className={styles.error}>
          {t(`errors.${error}`, undefined, { fallback: t('errors.STUDIO_ERROR') })}
        </p>
      )}
      <StudioEditor
        key={session.scope}
        session={session}
        refresh={refresh}
        projectId={typeof router.query.project === 'string' ? router.query.project : undefined}
      />
    </>
  );
};
export default StudioEntry;
