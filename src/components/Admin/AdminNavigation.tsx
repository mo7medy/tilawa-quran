import AcademyLink from '../Academy/AcademyLink';
import { useAccountUi } from '../Account/useAccountUi';

import styles from './AdminConsole.module.scss';
import AdminIcon from './AdminIcon';

import { ADMIN_BASE_PATH, ADMIN_SECTIONS } from '@/tilawa/adminSections';
import type { AdminSection } from '@/tilawa/adminSections';

interface AdminNavigationProps {
  section: AdminSection | null;
  onNavigate?: () => void;
}

const AdminNavigation = ({ section, onNavigate }: AdminNavigationProps): JSX.Element => {
  const { t } = useAccountUi();
  return (
    <nav className={styles.navigation} aria-label={t('admin-console.navigation')}>
      <p className={styles.navLabel}>{t('admin-console.workspace')}</p>
      {ADMIN_SECTIONS.map((item) => (
        <AcademyLink
          key={item}
          href={item === 'overview' ? ADMIN_BASE_PATH : `${ADMIN_BASE_PATH}/${item}`}
          ariaCurrent={section === item ? 'page' : undefined}
          onClick={onNavigate}
        >
          <AdminIcon name={item} />
          <span>{t(`admin-console.sections.${item}`)}</span>
        </AcademyLink>
      ))}
    </nav>
  );
};
export default AdminNavigation;
