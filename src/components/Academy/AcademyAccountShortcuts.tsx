import { useRouter } from 'next/router';
import useTranslation from 'next-translate/useTranslation';

import styles from './AcademyHeader.module.scss';
import AcademyIcon from './AcademyIcon';
import AcademyLink from './AcademyLink';
import useAccountNavigation from './useAccountNavigation';

import { stripLocalePrefix } from '@/utils/tilawaRoutes';

const AcademyAccountShortcuts = (): JSX.Element | null => {
  const { t } = useTranslation('account');
  const { signedIn, unreadMessages, unreadNotifications } = useAccountNavigation();
  const router = useRouter();
  const current = stripLocalePrefix(
    (router.asPath || '').split(/[?#]/)[0],
    router.locales ?? ['en', 'ar'],
  );
  if (!signedIn) return null;
  return (
    <div className={styles.shortcuts}>
      <AcademyLink
        href="/profile/messages"
        className={styles.messageShortcut}
        ariaCurrent={current === '/profile/messages' ? 'page' : undefined}
        ariaLabel={`${t('messages')}${
          unreadMessages ? `: ${t('profile-ui.unread-messages', { count: unreadMessages })}` : ''
        }`}
      >
        <AcademyIcon name="chat" />
        {unreadMessages > 0 && (
          <span
            className={styles.badge}
            aria-label={t('profile-ui.unread-messages', { count: unreadMessages })}
          >
            {unreadMessages > 99 ? '99+' : unreadMessages}
          </span>
        )}
      </AcademyLink>
      <AcademyLink
        href="/profile/notifications"
        className={styles.iconShortcut}
        ariaCurrent={current === '/profile/notifications' ? 'page' : undefined}
        ariaLabel={`${t('notifications')}${
          unreadNotifications ? `: ${t('backend-ui.unread', { count: unreadNotifications })}` : ''
        }`}
      >
        <AcademyIcon name="bell" />
        {unreadNotifications > 0 && (
          <span
            className={styles.badge}
            aria-label={t('backend-ui.unread', { count: unreadNotifications })}
          >
            {unreadNotifications > 99 ? '99+' : unreadNotifications}
          </span>
        )}
      </AcademyLink>
    </div>
  );
};

export default AcademyAccountShortcuts;
