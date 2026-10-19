import { useState } from 'react';

import * as Dialog from '@radix-ui/react-dialog';

import AcademyIcon from '../Academy/AcademyIcon';
import account from '../Account/Account.module.scss';
import { useAccountUi } from '../Account/useAccountUi';

import styles from './AdminConsole.module.scss';
import AdminNavigation from './AdminNavigation';

import type { AdminSection } from '@/tilawa/adminSections';

const AdminMobileNavigation = ({ section }: { section: AdminSection | null }): JSX.Element => {
  const { t, lang } = useAccountUi();
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className={styles.menuButton}
          aria-label={t('admin-console.open-navigation')}
        >
          <AcademyIcon name="menu" />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content
          className={`${account.page} ${styles.drawer}`}
          dir={lang === 'ar' ? 'rtl' : 'ltr'}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              setOpen(false);
            }
          }}
        >
          <div className={styles.drawerHeading}>
            <Dialog.Title>{t('admin-console.title')}</Dialog.Title>
            <Dialog.Close className={styles.plainButton} aria-label={t('close')}>
              <AcademyIcon name="close" />
            </Dialog.Close>
          </div>
          <Dialog.Description>{t('admin-console.website-only')}</Dialog.Description>
          <AdminNavigation section={section} onNavigate={() => setOpen(false)} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
export default AdminMobileNavigation;
