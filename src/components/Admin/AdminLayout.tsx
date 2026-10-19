import type { ReactNode } from 'react';

import Link from 'next/link';

import AcademyIcon from '../Academy/AcademyIcon';
import AcademyLink from '../Academy/AcademyLink';
import { useAcademyTheme } from '../Academy/AcademyThemeProvider';
import account from '../Account/Account.module.scss';
import { useAccountUi } from '../Account/useAccountUi';
import NextSeoWrapper from '../NextSeoWrapper';

import styles from './AdminConsole.module.scss';
import AdminMobileNavigation from './AdminMobileNavigation';
import AdminNavigation from './AdminNavigation';

import { ADMIN_BASE_PATH } from '@/tilawa/adminSections';
import type { AdminSection } from '@/tilawa/adminSections';
import { stripLocalePrefix, withLocalePrefix } from '@/utils/tilawaRoutes';

interface AdminLayoutProps {
  section: AdminSection | null;
  children: ReactNode;
}

const AdminLayout = ({ section, children }: AdminLayoutProps): JSX.Element => {
  const { t, lang, snapshot, userId, router, logout, error } = useAccountUi();
  const { resolvedTheme, setPreference } = useAcademyTheme();
  const allowed = snapshot?.isAdmin === true && !!userId;
  const title = t(section ? `admin-console.sections.${section}` : 'not-found');
  const brand = (
    <>
      {/* A tiny local SVG has no raster optimisation or download cost. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/tilawa/logo.svg" width={34} height={34} alt="" />
      <span>
        {t('admin-console.brand')}
        <small>{t('admin-console.title')}</small>
      </span>
    </>
  );
  return (
    <div className={`${account.page} ${styles.console}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <NextSeoWrapper title={`${title} · ${t('admin-console.title')}`} noindex nofollow />
      {allowed && (
        <aside className={styles.sidebar}>
          <AcademyLink href={ADMIN_BASE_PATH} className={styles.brand}>
            {brand}
          </AcademyLink>
          <AdminNavigation section={section} />
          <div className={styles.sidebarFoot}>
            <span className={styles.roleMark}>
              <AcademyIcon name="globe" />
            </span>
            <div>
              {t('admin-console.administrator')}
              <small>{t('admin-console.website-only')}</small>
            </div>
          </div>
        </aside>
      )}
      <div className={allowed ? styles.workspace : styles.guestWorkspace}>
        <header className={styles.topbar}>
          <div className={styles.topbarStart}>
            {allowed && <AdminMobileNavigation section={section} />}
            <span className={styles.breadcrumb}>
              {t('admin-console.title')}
              <span>/</span>
              {title}
            </span>
          </div>
          <div className={styles.topbarActions}>
            <AcademyLink href="/" className={styles.siteLink}>
              {t('admin-console.visit-site')}
              <AcademyIcon name="arrow" />
            </AcademyLink>
            <Link
              className={styles.languageLink}
              href={stripLocalePrefix(router.asPath, router.locales ?? ['en', 'ar'])}
              locale={lang === 'ar' ? 'en' : 'ar'}
              aria-label={t('admin-console.switch-language')}
            >
              {t('admin-console.switch-language')}
            </Link>
            <button
              type="button"
              className={styles.plainButton}
              aria-label={t(
                resolvedTheme === 'dark' ? 'admin-console.light' : 'admin-console.dark',
              )}
              onClick={() => setPreference(resolvedTheme === 'dark' ? 'light' : 'dark')}
            >
              <AcademyIcon name={resolvedTheme === 'dark' ? 'sun' : 'moon'} />
            </button>
            {userId && (
              <button
                type="button"
                className={styles.plainButton}
                onClick={async () => {
                  await logout?.();
                  await router.push(withLocalePrefix('/sign-in', lang));
                }}
              >
                {t('logout')}
              </button>
            )}
          </div>
        </header>
        <main id="admin-content" className={styles.main}>
          <div className={styles.pageHeading}>
            <div>
              <p className={styles.eyebrow}>{t('admin-console.workspace')}</p>
              <h1>{title}</h1>
              <p>{t(section ? `admin-console.descriptions.${section}` : 'not-found')}</p>
            </div>
            <span className={styles.identityTag}>{t('admin-console.website-only')}</span>
          </div>
          {error && (
            <p role="alert" className={account.error}>
              {t('backend-error')}
            </p>
          )}
          {children}
        </main>
      </div>
    </div>
  );
};
export default AdminLayout;
