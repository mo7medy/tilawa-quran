import { useId } from 'react';

import { Panel } from '../Account/AccountUi';
import { useAccountUi } from '../Account/useAccountUi';

import consoleStyles from './AdminConsole.module.scss';
import styles from './AdminReports.module.scss';
import type { useAdminReport } from './useAdminReport';

import type { AdminFinanceReport } from '@/tilawa/adminReportTypes';

type PaymentControls = Pick<
  ReturnType<typeof useAdminReport>,
  'page' | 'setPage' | 'status' | 'kind' | 'chooseStatus' | 'chooseKind'
>;
const AdminPaymentRecords = ({
  data,
  controls,
  onExport,
  exporting,
}: {
  data: AdminFinanceReport;
  controls: PaymentControls;
  onExport: () => void;
  exporting: boolean;
}): JSX.Element => {
  const { t, price, lang } = useAccountUi();
  const id = useId();
  const columns = ['reference', 'day', 'student', 'source', 'status', 'amount'];
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  return (
    <Panel title={t('admin-reports.payment-records')}>
      <p className={styles.readOnly}>{t('admin-reports.record-filter-hint')}</p>
      <div className={styles.recordControls}>
        <label htmlFor={`${id}-status`}>
          {t('admin-reports.status')}
          <select
            id={`${id}-status`}
            value={controls.status}
            onChange={(e) => controls.chooseStatus(e.target.value)}
          >
            {['all', 'paid', 'pending', 'failed', 'refunded'].map((v) => (
              <option key={v} value={v}>
                {t(`admin-reports.statuses.${v}`)}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor={`${id}-source`}>
          {t('admin-reports.source')}
          <select
            id={`${id}-source`}
            value={controls.kind}
            onChange={(e) => controls.chooseKind(e.target.value)}
          >
            {['all', 'academy', 'teacher', 'lesson'].map((v) => (
              <option key={v} value={v}>
                {t(`admin-reports.sources.${v}`)}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={onExport} disabled={exporting || !data.total}>
          {t(exporting ? 'loading' : 'admin-reports.export')}
        </button>
      </div>
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
            {data.payments.map((p) => (
              <tr key={p.id}>
                <td data-label={t('admin-reports.reference')}>
                  <code>{p.id.slice(0, 12)}</code>
                </td>
                <td data-label={t('admin-reports.day')}>
                  {new Date(p.created_at).toLocaleString(lang === 'ar' ? 'ar' : 'en', {
                    timeZone: 'UTC',
                  })}
                </td>
                <td data-label={t('admin-reports.student')}>{p.student || '—'}</td>
                <td data-label={t('admin-reports.source')}>
                  {t(`admin-reports.sources.${p.kind}`)}
                  <small>{t(`admin-reports.subjects.${p.subject}`)}</small>
                </td>
                <td data-label={t('admin-reports.status')}>
                  {t(`admin-reports.statuses.${p.status}`)}
                </td>
                <td data-label={t('admin-reports.amount')}>{price(p.amount_cents)}</td>
              </tr>
            ))}
            {!data.payments.length && (
              <tr>
                <td colSpan={columns.length}>
                  <div className={consoleStyles.empty}>{t('admin-reports.no-payments')}</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className={styles.paging}>
        <button
          type="button"
          disabled={controls.page <= 1}
          onClick={() => controls.setPage(controls.page - 1)}
        >
          {t('admin-reports.previous')}
        </button>
        <span>
          {t('admin-reports.page-count', { page: controls.page, pages, count: data.total })}
        </span>
        <button
          type="button"
          disabled={controls.page >= pages}
          onClick={() => controls.setPage(controls.page + 1)}
        >
          {t('admin-reports.next')}
        </button>
      </div>
    </Panel>
  );
};
export default AdminPaymentRecords;
