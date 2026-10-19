import { Panel } from '../Account/AccountUi';
import { useAccountUi } from '../Account/useAccountUi';

import consoleStyles from './AdminConsole.module.scss';
import AdminMetric from './AdminMetric';
import styles from './AdminReports.module.scss';

import type { AdminFinanceReport } from '@/tilawa/adminReportTypes';

const AdminFinanceBalances = ({ data }: { data: AdminFinanceReport }): JSX.Element => {
  const { t, price } = useAccountUi();
  const columns = ['teacher', 'amount', 'status', 'day'];
  return (
    <>
      <h2>{t('admin-reports.teacher-balances')}</h2>
      <p className={styles.readOnly}>{t('admin-reports.balance-hint')}</p>
      <div className={styles.metrics}>
        {(
          [
            'pendingEarningsCents',
            'availableEarningsCents',
            'pendingWithdrawalsCents',
            'approvedWithdrawalsCents',
            'paidWithdrawalsCents',
          ] as const
        ).map((key) => (
          <AdminMetric
            key={key}
            label={t(`admin-reports.finance.${key}`)}
            value={price(data[key])}
          />
        ))}
      </div>
      <Panel title={t('admin-reports.withdrawals')}>
        <p className={styles.readOnly}>{t('admin-reports.withdrawals-hint')}</p>
        <div className={consoleStyles.tableWrap}>
          <table className={consoleStyles.table}>
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c} scope="col">
                    {t(`admin-reports.${c}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.withdrawals.map((w) => (
                <tr key={w.id}>
                  <td data-label={t('admin-reports.teacher')}>{w.teacher || '—'}</td>
                  <td data-label={t('admin-reports.amount')}>{price(w.amount_cents)}</td>
                  <td data-label={t('admin-reports.status')}>
                    {t(`admin-reports.withdrawal-statuses.${w.status}`)}
                  </td>
                  <td data-label={t('admin-reports.day')}>{w.created_at.slice(0, 10)}</td>
                </tr>
              ))}
              {!data.withdrawals.length && (
                <tr>
                  <td colSpan={columns.length}>
                    <div className={consoleStyles.empty}>{t('admin-reports.no-withdrawals')}</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
};
export default AdminFinanceBalances;
