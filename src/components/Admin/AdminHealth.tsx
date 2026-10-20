/* eslint-disable no-nested-ternary -- Exclusive error/loading/ready states. */
import useSWR from 'swr';

import { Panel } from '../Account/AccountUi';
import { useAccountUi } from '../Account/useAccountUi';

import { tilawaFetch } from '@/tilawa/backend/http';
import { object, string } from '@/tilawa/backend/mappers';
import type { Row } from '@/tilawa/backend/mappers';

const AdminHealth = (): JSX.Element => {
  const { t, userId } = useAccountUi();
  const { data, error, mutate } = useSWR<Row>(userId ? ['tilawa-admin-health', userId] : null, () =>
    tilawaFetch('admin/health', undefined, userId),
  );
  const job = object(data?.maintenance);
  return (
    <Panel title={t('backend-ui.health.title')}>
      {error ? (
        <p role="alert">
          {t('backend-error')}{' '}
          <button type="button" onClick={() => mutate()}>
            {t('admin-console.retry')}
          </button>
        </p>
      ) : !data ? (
        <p>{t('loading')}</p>
      ) : (
        <>
          <p>{t(data.readsReady ? 'backend-ui.health.ready' : 'backend-ui.health.unavailable')}</p>
          <p>
            {t(job.active && job.fresh ? 'backend-ui.health.healthy' : 'backend-ui.health.unknown')}
          </p>
          {job.lastRun && <time dateTime={string(job.lastRun)}>{string(job.lastRun)} UTC</time>}
        </>
      )}
    </Panel>
  );
};
export default AdminHealth;
