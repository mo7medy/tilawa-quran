import { useState } from 'react';

import { Panel } from '../Account/AccountUi';
import { useAccountUi } from '../Account/useAccountUi';

import consoleStyles from './AdminConsole.module.scss';
import AdminFinanceBalances from './AdminFinanceBalances';
import AdminMetric from './AdminMetric';
import AdminPaymentRecords from './AdminPaymentRecords';
import AdminPeriodFilter from './AdminPeriodFilter';
import styles from './AdminReports.module.scss';
import AdminReportState from './AdminReportState';
import { useAdminReport } from './useAdminReport';

import type { AdminFinanceReport } from '@/tilawa/adminReportTypes';
import { downloadFinance } from '@/tilawa/downloadFinance';

const AdminFinance = (): JSX.Element => {
  const { t, price, lang, userId } = useAccountUi();
  const report = useAdminReport<AdminFinanceReport>('finance');
  const { data, error } = report;
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(false);
  const exportPayments = async (): Promise<void> => {
    if (!userId) return;
    setExporting(true);
    setExportError(false);
    try {
      await downloadFinance(report.path, userId);
    } catch {
      setExportError(true);
    } finally {
      setExporting(false);
    }
  };
  return (
    <>
      <AdminPeriodFilter controls={report} />
      {error || !data ? (
        <AdminReportState
          error={error}
          retry={() => {
            report.mutate();
          }}
        />
      ) : (
        <>
          {!data.paymentsEnabled && (
            <p className={consoleStyles.stageNote}>{t('admin-reports.gateway-disabled')}</p>
          )}
          <h2>{t('admin-reports.period-finance')}</h2>
          <p className={styles.readOnly}>{t('admin-reports.finance-date-hint')}</p>
          <div className={styles.metrics}>
            {(
              [
                'paidCents',
                'pendingCents',
                'failedCents',
                'refundedCents',
                'pendingOrdersCents',
              ] as const
            ).map((key) => (
              <AdminMetric
                key={key}
                label={t(`admin-reports.finance.${key}`)}
                value={price(data[key])}
              />
            ))}
            <AdminMetric
              label={t('admin-reports.platform-share')}
              value={t('admin-reports.not-defined')}
              hint={t('admin-reports.platform-share-hint')}
            />
          </div>
          <Panel title={t('admin-reports.income-sources')}>
            <div className={styles.metrics}>
              {data.sources.map((source) => (
                <AdminMetric
                  key={source.kind}
                  label={t(`admin-reports.sources.${source.kind}`)}
                  value={price(source.paidCents)}
                />
              ))}
            </div>
          </Panel>
          {exportError && <p role="alert">{t('admin-reports.export-error')}</p>}
          <AdminPaymentRecords
            data={data}
            controls={report}
            onExport={() => {
              exportPayments();
            }}
            exporting={exporting}
          />
          <AdminFinanceBalances data={data} />
          <p className={styles.timestamp}>
            {t('admin-reports.updated')}:{' '}
            {new Date(data.asOf).toLocaleString(lang === 'ar' ? 'ar' : 'en', { timeZone: 'UTC' })}{' '}
            UTC
          </p>
        </>
      )}
    </>
  );
};
export default AdminFinance;
