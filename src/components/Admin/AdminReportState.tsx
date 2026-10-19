import { Panel } from '../Account/AccountUi';
import { useAccountUi } from '../Account/useAccountUi';

const AdminReportState = ({
  error,
  retry,
}: {
  error?: unknown;
  retry: () => void;
}): JSX.Element => {
  const { t } = useAccountUi();
  return (
    <Panel>
      {error ? (
        <>
          <p role="alert">{t('admin-reports.load-error')}</p>
          <button type="button" onClick={retry}>
            {t('admin-console.retry')}
          </button>
        </>
      ) : (
        <p role="status">{t('loading')}</p>
      )}
    </Panel>
  );
};
export default AdminReportState;
