import useTranslation from 'next-translate/useTranslation';

import styles from './AcademyHeader.module.scss';
import AcademyIcon from './AcademyIcon';
import AcademyLink from './AcademyLink';
import useAccountNavigation from './useAccountNavigation';

const AcademyAccountShortcuts = (): JSX.Element | null => {
  const { t } = useTranslation('account');
  const { signedIn, unreadMessages, unreadNotifications } = useAccountNavigation();
  if (!signedIn) return null;
  return (
    <div className={styles.shortcuts}>
      <AcademyLink
        href="/profile/messages"
        className={styles.messageShortcut}
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
