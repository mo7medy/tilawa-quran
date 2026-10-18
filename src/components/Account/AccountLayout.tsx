/* eslint-disable no-nested-ternary -- Small enum/label selections keep existing UI and wire-state mappings adjacent. */
/* eslint-disable max-lines -- Keep this cohesive form or typed data contract together; reader services are split by feature. */
import type { ReactNode } from 'react';

import { stripLocalePrefix } from '../../utils/tilawaRoutes';
import AcademyLink from '../Academy/AcademyLink';
import NextSeoWrapper from '../NextSeoWrapper';

import styles from './Account.module.scss';
import { useAccountUi } from './useAccountUi';

const STUDENT_LINKS = [
  ['/profile', 'profile'],
  ['/profile/learning', 'learning'],
  ['/profile/lessons', 'lessons'],
  ['/profile/teachers', 'teachers'],
  ['/profile/packages', 'packages'],
  ['/profile/messages', 'messages'],
  ['/profile/notifications', 'notifications'],
];
const TEACHER_LINKS = [
  ['/dashboard/teacher', 'dashboard'],
  ['/profile/teacher', 'teacher-profile'],
  ['/profile/student', 'student-profile'],
  ['/dashboard/teacher/requests', 'requests'],
  ['/dashboard/teacher/lessons', 'lessons'],
  ['/dashboard/teacher/availability', 'availability'],
  ['/dashboard/teacher/students', 'students'],
  ['/dashboard/teacher/reviews', 'reviews'],
  ['/dashboard/teacher/coupons', 'coupons'],
  ['/dashboard/teacher/earnings', 'earnings'],
  ['/dashboard/teacher/withdrawals', 'withdrawals'],
  ['/profile/messages', 'messages'],
  ['/profile/notifications', 'notifications'],
];
const ADMIN_LINKS = [
  ['/admin/teachers', 'admin.title'],
  ['/admin/settings', 'admin.settings'],
  ['/profile', 'profile'],
];

const AccountLayout = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}): JSX.Element => {
  const {
    t,
    role,
    href,
    router,
    dispatch,
    state,
    backend,
    busy,
    error,
    snapshot,
    logout,
    refresh,
    userId,
  } = useAccountUi();
  const current = stripLocalePrefix(router.asPath.split('?')[0], router.locales ?? ['en', 'ar']);
  const { view } = router.query;
  const links = router.pathname.startsWith('/admin')
    ? ADMIN_LINKS
    : role === 'teacher'
    ? TEACHER_LINKS
    : STUDENT_LINKS;
  const failure = view === 'error' || view === 'loading';
  return (
    <div className={styles.page}>
      <NextSeoWrapper title={title} noindex nofollow />
      {backend ? (
        <div className={styles.preview}>
          <strong>{t('live-account')}</strong>
          <div className={styles.actions}>
            {snapshot?.isAdmin === true && (
              <AcademyLink href="/admin/teachers">{t('admin.title')}</AcademyLink>
            )}
            {userId && (
              <button
                type="button"
                onClick={async () => {
                  await logout?.();
                  await router.push('/sign-in');
                }}
              >
                {t('logout')}
              </button>
            )}
          </div>
        </div>
      ) : (
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
            <span className={styles.avatar}>{role === 'teacher' ? 'T' : 'A'}</span>
            <div>
              <strong>
                {role === 'teacher' ? state.teacher.publicProfile.displayName : state.student.name}
              </strong>
              <small>{t(role)}</small>
            </div>
          </div>
          <details className={styles.mobileNav} key={current}>
            <summary>{t('account-sections')}</summary>
            <nav aria-label={t('account-sections')}>
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
          </details>
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
            <p>{t(role)}</p>
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
