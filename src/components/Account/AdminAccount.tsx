/* eslint-disable no-nested-ternary -- Small enum/label selections keep existing UI and wire-state mappings adjacent. */
/* eslint-disable max-lines -- Keep this cohesive form or typed data contract together; reader services are split by feature. */
import { useEffect, useState } from 'react';

import AdminHealth from '../Admin/AdminHealth';
import AdminMfa from '../Admin/AdminMfa';
import useAdminConsoleData from '../Admin/useAdminConsoleData';

import styles from './Account.module.scss';
import { AccountLink, Field, Panel } from './AccountUi';
import SignedDocument from './SignedDocument';
import { useAccountUi } from './useAccountUi';

import consoleStyles from '@/components/Admin/AdminConsole.module.scss';
import AdminLayout from '@/components/Admin/AdminLayout';
import AdminSectionContent from '@/components/Admin/AdminSectionContent';
import { ADMIN_BASE_PATH, getAdminSection } from '@/tilawa/adminSections';
import { object, rows, string } from '@/tilawa/backend/mappers';

const AdminAccount = (): JSX.Element => {
  const { t, snapshot, router, userId, command, busy, loading } = useAccountUi();
  const [filter, setFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [reason, setReason] = useState('');
  const [academy, setAcademy] = useState(false);
  const segments = Array.isArray(router.query.section) ? router.query.section : [];
  const section = getAdminSection(segments[0]);
  const id = segments[1];
  const [page, setPage] = useState(1);
  const { data, error, mutate } = useAdminConsoleData(section, id, filter, search, page);
  const settings = section === 'settings';
  const visibleTeachers = rows(data?.teachers);
  const teacher = rows(data?.teachers).find((item) => item.user_id === id);
  useEffect(() => {
    setAcademy(!!teacher?.academy_enabled);
    setReason('');
  }, [id, teacher?.academy_enabled]);
  const decide = async (approval: 'approved' | 'rejected'): Promise<void> => {
    if (!command || !teacher) return;
    try {
      await command('admin-teacher', {
        id: teacher.user_id,
        approval,
        reason,
        academyEnabled: academy,
      });
      await mutate();
      setReason('');
    } catch {
      /* The shared account panel reports the server error. */
    }
  };
  return (
    <AdminLayout section={section}>
      {loading ? (
        <Panel>
          <p>{t('loading')}</p>
        </Panel>
      ) : !userId ? (
        <Panel>
          <AccountLink to="/sign-in">{t('login')}</AccountLink>
        </Panel>
      ) : snapshot?.isAdmin !== true ? (
        <Panel>
          <p>{t('admin.denied')}</p>
        </Panel>
      ) : !snapshot?.adminVerified ? (
        <AdminMfa key={userId} />
      ) : error ? (
        <Panel>
          <p role="alert">{t('backend-error')}</p>
          <button
            type="button"
            onClick={() => {
              mutate();
            }}
          >
            {t('admin-console.retry')}
          </button>
        </Panel>
      ) : !data ? (
        <Panel>
          <p>{t('loading')}</p>
        </Panel>
      ) : settings ? (
        <>
          <Panel title={t('admin.settings')}>
            <label className={styles.check} htmlFor="teacher-registration">
              <input
                id="teacher-registration"
                type="checkbox"
                checked={!!object(data.settings).teacher_registration_enabled}
                disabled={busy}
                onChange={async (event) => {
                  try {
                    await command?.('admin-settings', {
                      teacherRegistrationEnabled: event.target.checked,
                    });
                    await mutate();
                  } catch {
                    /* Shared feedback. */
                  }
                }}
              />
              {t('admin.registration-open')}
            </label>
            <p>{t('admin.deferred-integrations')}</p>
          </Panel>
          <AdminHealth />
          <AdminMfa key={userId} manage />
          <Panel title={t('admin-console.security-title')}>
            <p>{t('admin-console.security-hint')}</p>
            <p className={consoleStyles.stageNote}>{t('backend-ui.mfa.enforced')}</p>
          </Panel>
        </>
      ) : section !== 'teachers' ? (
        <AdminSectionContent section={section} data={data} />
      ) : id ? (
        teacher ? (
          <>
            <Panel title={string(teacher.display_name)}>
              <span className={styles.badge}>{t(`approval.${teacher.approval}`)}</span>
              <dl className={styles.details}>
                <div>
                  <dt>{t('email')}</dt>
                  <dd dir="ltr">{string(teacher.email)}</dd>
                </div>
                <div>
                  <dt>{t('country')}</dt>
                  <dd>{string(teacher.country)}</dd>
                </div>
                <div>
                  <dt>{t('phone')}</dt>
                  <dd dir="ltr">{string(teacher.phone)}</dd>
                </div>
                <div>
                  <dt>{t('experience')}</dt>
                  <dd>{Number(teacher.experience)}</dd>
                </div>
              </dl>
              <h3>{t('bio')}</h3>
              <p>
                {string(object(teacher.biography)[router.locale === 'ar' ? 'ar' : 'en']) ||
                  string(object(teacher.biography).en)}
              </p>
              <h3>{t('teaching-style')}</h3>
              <p>
                {string(object(teacher.approach)[router.locale === 'ar' ? 'ar' : 'en']) ||
                  string(object(teacher.approach).en)}
              </p>
              <h3>{t('supporting-documents')}</h3>
              {rows(teacher.documents).map((document) => (
                <SignedDocument
                  key={string(document.id)}
                  path={string(document.path)}
                  label={string(document.label)}
                />
              ))}
              <label className={styles.check} htmlFor="academy-enabled">
                <input
                  id="academy-enabled"
                  type="checkbox"
                  checked={academy}
                  onChange={(event) => setAcademy(event.target.checked)}
                />
                {t('admin.academy-enabled')}
              </label>
              <Field
                label={t('admin.reason')}
                value={reason}
                maxLength={1500}
                onChange={(event) => setReason(event.target.value)}
              />
              <div className={styles.actions}>
                <button
                  type="button"
                  disabled={busy || teacher.approval === 'incomplete'}
                  onClick={() => {
                    decide('approved');
                  }}
                >
                  {t('admin.approve')}
                </button>
                <button
                  type="button"
                  className={styles.secondary}
                  disabled={busy || !reason.trim()}
                  onClick={() => {
                    decide('rejected');
                  }}
                >
                  {t('admin.reject')}
                </button>
              </div>
              <AccountLink to={`${ADMIN_BASE_PATH}/teachers`}>{t('back')}</AccountLink>
            </Panel>
            <Panel title={t('admin-console.approval-history')}>
              {rows(teacher.events).map((event) => (
                <p key={string(event.id)}>
                  {t(`approval.${event.status}`)} · {string(event.reason)} ·{' '}
                  {string(event.created_at)}
                </p>
              ))}
            </Panel>
          </>
        ) : (
          <Panel>
            <p>{t('not-found')}</p>
          </Panel>
        )
      ) : (
        <>
          <Panel title={t('admin.title')}>
            <div className={consoleStyles.filters}>
              <Field
                label={t('admin-console.search-teachers')}
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
              <label className={styles.field} htmlFor="approval-filter">
                {t('application-status')}
                <select
                  id="approval-filter"
                  value={filter}
                  onChange={(event) => {
                    setFilter(event.target.value);
                    setPage(1);
                  }}
                >
                  {['all', 'pending', 'approved', 'rejected', 'incomplete'].map((status) => (
                    <option key={status} value={status}>
                      {t(status === 'all' ? 'all' : `approval.${status}`)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {visibleTeachers.map((item) => (
              <article className={styles.listCard} key={string(item.user_id)}>
                <div>
                  <h3>{string(item.display_name)}</h3>
                  <p>{t(`approval.${item.approval}`)}</p>
                </div>
                <AccountLink to={`${ADMIN_BASE_PATH}/teachers/${item.user_id}`}>
                  {t('open-section')}
                </AccountLink>
              </article>
            ))}
            {!visibleTeachers.length && <p>{t('admin.no-requests')}</p>}
            <nav className={styles.actions} aria-label={t('backend-ui.pagination')}>
              <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                {t('backend-ui.previous')}
              </button>
              <span>
                {t('backend-ui.page', {
                  page,
                  pages: Math.max(1, Math.ceil(Number(data.total) / 25)),
                })}
              </span>
              <button
                type="button"
                disabled={page * 25 >= Number(data.total)}
                onClick={() => setPage(page + 1)}
              >
                {t('backend-ui.next')}
              </button>
            </nav>
          </Panel>
        </>
      )}
    </AdminLayout>
  );
};
export default AdminAccount;
