import styles from './Account.module.scss';
import { AccountLink, EmptyState, Panel } from './AccountUi';
import { useAccountUi } from './useAccountUi';

import { rows, string } from '@/tilawa/backend/mappers';

const AccountNotifications = (): JSX.Element => {
  const { t, snapshot, command, busy } = useAccountUi();
  const notifications = rows(snapshot?.notifications);
  return (
    <Panel icon="bell" title={t('notifications')}>
      <p>{t('backend-ui.unread', { count: snapshot?.unreadNotifications ?? 0 })}</p>
      {!notifications.length && <EmptyState icon="bell" description={t('no-notifications')} />}
      {notifications.map((item) => (
        <article className={styles.listCard} key={string(item.id)}>
          <div>
            <h3>{t(`notification-kinds.${item.kind}`)}</h3>
            <time dateTime={string(item.created_at)}>
              {string(item.created_at).slice(0, 16).replace('T', ' ')}
            </time>
          </div>
          <div>
            <AccountLink to={string(item.path)}>{t('open-section')}</AccountLink>
            {!item.read_at && (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  command?.('notification-read', { id: item.id }).catch(() => undefined);
                }}
              >
                {t('mark-read')}
              </button>
            )}
          </div>
        </article>
      ))}
    </Panel>
  );
};
export default AccountNotifications;
