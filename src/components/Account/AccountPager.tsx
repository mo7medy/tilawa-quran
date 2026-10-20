import styles from './Account.module.scss';
import { useAccountUi } from './useAccountUi';

import { object } from '@/tilawa/backend/mappers';

const AccountPager = (): JSX.Element | null => {
  const { backend, snapshot, router, t, loading } = useAccountUi();
  const info = object(snapshot?.pagination);
  const page = Number(info.page ?? 1);
  const pages = Math.max(1, Math.ceil(Number(info.total ?? 0) / Number(info.pageSize ?? 25)));
  if (!backend || pages < 2) return null;
  const change = (next: number): void => {
    router.push(
      { pathname: router.pathname, query: { ...router.query, accountPage: next } },
      undefined,
      { shallow: true },
    );
  };
  return (
    <nav className={styles.actions} aria-label={t('backend-ui.pagination')}>
      <button type="button" disabled={loading || page <= 1} onClick={() => change(page - 1)}>
        {t('backend-ui.previous')}
      </button>
      <span>{t('backend-ui.page', { page, pages })}</span>
      <button type="button" disabled={loading || page >= pages} onClick={() => change(page + 1)}>
        {t('backend-ui.next')}
      </button>
    </nav>
  );
};
export default AccountPager;
