import { Panel } from '../Account/AccountUi';
import { useAccountUi } from '../Account/useAccountUi';

import styles from './AdminConsole.module.scss';

import { rows, string } from '@/tilawa/backend/mappers';
import type { Row } from '@/tilawa/backend/mappers';

const AdminAudit = ({ data }: { data: Row }): JSX.Element => {
  const { t, lang } = useAccountUi();
  const headers = ['action', 'date', 'reference'];
  return (
    <Panel title={t('admin-console.audit-title')}>
      <p className={styles.subtle}>{t('admin-console.audit-hint')}</p>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              {headers.map((key) => (
                <th key={key} scope="col">
                  {t(`admin-console.columns.${key}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows(data.audit).map((event) => {
              const time = new Date(string(event.created_at));
              return (
                <tr key={string(event.id)}>
                  <td data-label={t('admin-console.columns.action')}>
                    {t(event.action === 'admin-settings' ? 'admin.settings' : 'admin.title')}
                  </td>
                  <td data-label={t('admin-console.columns.date')}>
                    <time dateTime={string(event.created_at)}>
                      {Number.isFinite(time.getTime())
                        ? time.toLocaleString(lang === 'ar' ? 'ar' : 'en')
                        : t('not-found')}
                    </time>
                  </td>
                  <td data-label={t('admin-console.columns.reference')}>
                    <code>{string(event.id).slice(0, 12)}</code>
                  </td>
                </tr>
              );
            })}
            {!rows(data.audit).length && (
              <tr>
                <td colSpan={headers.length}>
                  <div className={styles.empty}>{t('admin-console.no-audit')}</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
};
export default AdminAudit;
