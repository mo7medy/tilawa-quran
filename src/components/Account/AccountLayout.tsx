/* eslint-disable no-nested-ternary -- Small enum/label selections keep existing UI and wire-state mappings adjacent. */
/* eslint-disable max-lines -- Keep this cohesive form or typed data contract together; reader services are split by feature. */
import type { ReactNode } from 'react';

import { stripLocalePrefix } from '../../utils/tilawaRoutes';
import AcademyLink from '../Academy/AcademyLink';
import NextSeoWrapper from '../NextSeoWrapper';

import styles from './Account.module.scss';
import AccountAvatar from './AccountAvatar';
import { useAccountUi } from './useAccountUi';

import { STUDENT_ACCOUNT_LINKS, TEACHER_ACCOUNT_LINKS } from '@/tilawa/account/navigation';
import { ADMIN_BASE_PATH, isAdminRoutePathname } from '@/tilawa/adminSections';

const ADMIN_LINKS = [
  [`${ADMIN_BASE_PATH}/teachers`, 'admin.title'],
  [`${ADMIN_BASE_PATH}/settings`, 'admin.settings'],
  ['/profile', 'profile'],
];

const AccountLayout = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}): JSX.Element => {
  const { t, role, href, router, dispatch, state, backend, busy, error, refresh } = useAccountUi();
  const current = stripLocalePrefix(router.asPath.split('?')[0], router.locales ?? ['en', 'ar']);
  const { view } = router.query;
  const links = isAdminRoutePathname(router.pathname)
    ? ADMIN_LINKS
    : role === 'teacher'
    ? TEACHER_ACCOUNT_LINKS
    : STUDENT_ACCOUNT_LINKS.map(({ href: to, key }) => [to, key]);
  const failure = view === 'error' || view === 'loading';
  return (
    <div className={styles.page}>
      <NextSeoWrapper title={title} noindex nofollow />
      {!backend && (
        <div className={styles.preview}>
          <div>
            <strong>{t('preview-title')}</strong>
            <p>{t('preview-note')}</p>
          </div>
          <div className={styles.actions}>
            <AcademyLink
              href="/profile?preview=student"
              ariaCurrent={role === 'student' ? 'page' : undefined}
            >
              {t('student-preview')}
            </AcademyLink>
            <AcademyLink
              href="/dashboard/teacher?preview=teacher"
              ariaCurrent={role === 'teacher' ? 'page' : undefined}
            >
              {t('teacher-preview')}
            </AcademyLink>
            <button
              type="button"
              onClick={() => dispatch({ type: 'reset', now: new Date().toISOString() })}
            >
              {t('reset')}
            </button>
          </div>
        </div>
      )}
      {backend && busy && <p role="status">{t('saving')}</p>}
      {backend && error && (
        <div className={styles.error} role="alert">
          {t(`backend-errors.${error}`, {}, { fallback: t('backend-error') })}
          <button
            type="button"
            onClick={() => {
              refresh?.();
            }}
          >
            {t('retry')}
          </button>
        </div>
      )}
      <div className={styles.layout}>
        <aside className={styles.navigation}>
          <div className={styles.identity}>
            <AccountAvatar
              name={
                role === 'teacher' ? state.teacher.publicProfile.displayName : state.student.name
              }
              photo={
                role === 'teacher' ? state.teacher.publicProfile.photoUrl : state.student.photo
              }
            />
            <div>
              <strong>
                {role === 'teacher' ? state.teacher.publicProfile.displayName : state.student.name}
              </strong>
            </div>
          </div>
          <nav className={styles.desktopNav} aria-label={t('account-sections')}>
            {links.map(([to, label]) => (
              <AcademyLink
                key={to}
                href={href(to)}
                ariaCurrent={current === to ? 'page' : undefined}
              >
                {t(label)}
              </AcademyLink>
            ))}
          </nav>
        </aside>
        <div className={styles.content}>
          <header className={styles.heading}>
            <h1>{title}</h1>
          </header>
          {failure && !backend ? (
            <section className={styles.panel} aria-live="polite" aria-busy={view === 'loading'}>
              <h2>{t(view === 'loading' ? 'loading' : 'load-error')}</h2>
              <p>{t('state-preview')}</p>
              <AcademyLink className={styles.link} href={href(current)}>
                {t('retry')}
              </AcademyLink>
            </section>
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  );
};
export default AccountLayout;
