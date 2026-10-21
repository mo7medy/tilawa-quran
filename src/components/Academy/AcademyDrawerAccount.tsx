import { useState } from 'react';

import { useRouter } from 'next/router';
import useTranslation from 'next-translate/useTranslation';

import AcademyLink from './AcademyLink';
import styles from './AcademyMobileMenu.module.scss';
import useAccountNavigation from './useAccountNavigation';

import { ADMIN_BASE_PATH } from '@/tilawa/adminSections';

const AcademyDrawerAccount = ({ onNavigate }: { onNavigate: () => void }): JSX.Element => {
  const { t } = useTranslation('account');
  const { account } = useAccountNavigation();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <>
      {account?.snapshot?.isAdmin === true && (
        <AcademyLink href={ADMIN_BASE_PATH} onClick={onNavigate}>
          {t('admin.title')}
        </AcademyLink>
      )}
      <button
        type="button"
        className={styles.login}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setFailed(false);
          try {
            await account?.logout?.();
            onNavigate();
            await router.push('/sign-in', undefined, { locale: router.locale });
          } catch {
            setFailed(true);
          } finally {
            setBusy(false);
          }
        }}
      >
        {t(busy ? 'saving' : 'logout')}
      </button>
      {failed && <p role="alert">{t('backend-error')}</p>}
    </>
  );
};

export default AcademyDrawerAccount;
