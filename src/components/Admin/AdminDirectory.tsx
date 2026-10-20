/* eslint-disable no-nested-ternary -- Mutually exclusive request states. */
import { useState } from 'react';

import useSWR from 'swr';

import { AccountLink, Panel } from '../Account/AccountUi';
import { useAccountUi } from '../Account/useAccountUi';

import styles from './AdminConsole.module.scss';
import { COLUMNS } from './adminDirectoryColumns';
import AdminDirectoryFilters from './AdminDirectoryFilters';

import { ADMIN_BASE_PATH } from '@/tilawa/adminSections';
import { tilawaFetch } from '@/tilawa/backend/http';
import { object, rows, string } from '@/tilawa/backend/mappers';
import type { Row } from '@/tilawa/backend/mappers';

const AdminDirectory = ({ section }: { section: string }): JSX.Element => {
  const { t, userId, lang } = useAccountUi();
  const [query, setQuery] = useState({
    search: '',
    status: 'all',
    subject: 'all',
    from: '',
    until: '',
  });
  const [applied, setApplied] = useState(query);
  const [page, setPage] = useState(1);
  const search = new URLSearchParams({ ...applied, page: String(page) });
  const { data, error, mutate } = useSWR<Row>(
    userId ? ['tilawa-admin-list', userId, section, search.toString()] : null,
    () => tilawaFetch(`admin/lists/${section}?${search}`, undefined, userId),
  );
  const columns = COLUMNS[section];
  const pages = Math.max(1, Math.ceil(Number(data?.total ?? 0) / 25));
  const cell = (row: Row, key: string): string => {
    if (key === 'credits') {
      const credit = object(row.credits);
      return t('backend-ui.credit-summary', {
        remaining: credit.remaining ?? 0,
        reserved: credit.reserved ?? 0,
        used: credit.used ?? 0,
      });
    }
    if (key === 'created_at' || key === 'ends_at') {
      return row[key]
        ? new Date(string(row[key])).toLocaleString(lang === 'ar' ? 'ar' : 'en', {
            timeZone: 'UTC',
          })
        : '—';
    }
    if (['status', 'subject', 'kind', 'type', 'action', 'package'].includes(key)) {
      return row[key] ? t(`backend-ui.values.${row[key]}`) : '—';
    }
    return string(row[key]) || (typeof row[key] === 'number' ? String(row[key]) : '—');
  };
  return (
    <Panel title={t(`admin-console.sections.${section}`)}>
      <p>{t('backend-ui.utc-readonly')}</p>
      <AdminDirectoryFilters
        section={section}
        query={query}
        onChange={setQuery}
        onApply={() => {
          setPage(1);
          setApplied(query);
        }}
      />
      <p aria-live="polite">
        {t('backend-ui.results', { count: data?.total ?? 0 })} · {applied.from || '—'} /{' '}
        {applied.until || '—'} UTC
      </p>
      {error ? (
        <p role="alert">
          {t('backend-error')}{' '}
          <button type="button" onClick={() => mutate()}>
            {t('admin-console.retry')}
          </button>
        </p>
      ) : !data ? (
        <p role="status">{t('loading')}</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                {columns.map((key) => (
                  <th key={key} scope="col">
                    {t(`backend-ui.columns.${key}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows(data.items).map((row) => (
                <tr key={string(row.id)}>
                  {columns.map((key) => (
                    <td key={key} data-label={t(`backend-ui.columns.${key}`)}>
                      {cell(row, key)}
                    </td>
                  ))}
                </tr>
              ))}
              {!rows(data.items).length && (
                <tr>
                  <td colSpan={columns.length}>{t('backend-ui.empty')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <nav className={styles.filters} aria-label={t('backend-ui.pagination')}>
        <button type="button" disabled={!data || page <= 1} onClick={() => setPage(page - 1)}>
          {t('backend-ui.previous')}
        </button>
        <span>{t('backend-ui.page', { page, pages })}</span>
        <button type="button" disabled={!data || page >= pages} onClick={() => setPage(page + 1)}>
          {t('backend-ui.next')}
        </button>
      </nav>
      {section === 'lessons' && <p>{t('admin-console.no-lesson-approval')}</p>}
      <AccountLink to={ADMIN_BASE_PATH}>{t('back')}</AccountLink>
    </Panel>
  );
};
export default AdminDirectory;
