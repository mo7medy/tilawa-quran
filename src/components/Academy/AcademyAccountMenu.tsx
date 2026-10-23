import { useState } from 'react';

import * as Dropdown from '@radix-ui/react-dropdown-menu';
import { useRouter } from 'next/router';
import useTranslation from 'next-translate/useTranslation';

import styles from './AcademyAccountMenu.module.scss';
import AcademyIcon from './AcademyIcon';
import AcademyLink from './AcademyLink';
import useAccountNavigation from './useAccountNavigation';

import AccountAvatar from '@/components/Account/AccountAvatar';
import { ADMIN_BASE_PATH } from '@/tilawa/adminSections';

const AcademyAccountMenu = (): JSX.Element => {
  const { t, lang } = useTranslation('account');
  const router = useRouter();
  const { account, name, photo, profileHref, teacher } = useAccountNavigation();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <Dropdown.Root dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <Dropdown.Trigger className={styles.trigger} aria-label={t('profile-ui.account-menu')}>
        <AccountAvatar name={name} photo={photo} />
        <AcademyIcon name="chevron" />
      </Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content className={styles.menu} align="end" sideOffset={10}>
          <Dropdown.Label className={styles.label}>
            <AccountAvatar name={name} photo={photo} />
            <span>
              {name || t('profile-ui.account-menu')}
              <small>{t(teacher ? 'teacher' : 'student')}</small>
            </span>
          </Dropdown.Label>
          <Dropdown.Separator className={styles.separator} />
          <Dropdown.Item asChild>
            <AcademyLink href={teacher ? '/dashboard/teacher' : '/profile/learning'}>
              <AcademyIcon name="dashboard" />
              {t(teacher ? 'dashboard' : 'learning')}
            </AcademyLink>
          </Dropdown.Item>
          <Dropdown.Item asChild>
            <AcademyLink href={profileHref}>
              <AcademyIcon name="user" />
              {t('profile')}
            </AcademyLink>
          </Dropdown.Item>
          <Dropdown.Item asChild>
            <AcademyLink href="/profile/settings">
              <AcademyIcon name="settings" />
              {t('settings')}
            </AcademyLink>
          </Dropdown.Item>
          {account?.snapshot?.isAdmin === true && (
            <Dropdown.Item asChild>
              <AcademyLink href={ADMIN_BASE_PATH}>
                <AcademyIcon name="shield" />
                {t('admin.title')}
              </AcademyLink>
            </Dropdown.Item>
          )}
          <Dropdown.Separator className={styles.separator} />
          <Dropdown.Item
            disabled={busy}
            onSelect={async (event) => {
              event.preventDefault();
              setBusy(true);
              setFailed(false);
              try {
                await account?.logout?.();
                await router.push('/sign-in', undefined, { locale: router.locale });
              } catch {
                setFailed(true);
              } finally {
                setBusy(false);
              }
            }}
          >
            <AcademyIcon name="logout" />
            {t(busy ? 'saving' : 'logout')}
          </Dropdown.Item>
          {failed && <p role="alert">{t('backend-error')}</p>}
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  );
};

export default AcademyAccountMenu;
