import * as Dropdown from '@radix-ui/react-dropdown-menu';

import AcademyIcon from '../../Academy/AcademyIcon';
import AcademyLink from '../../Academy/AcademyLink';
import AccountAvatar from '../AccountAvatar';
import { useAccountUi } from '../useAccountUi';

import styles from './Messages.module.scss';
import type { ConversationItem } from './types';

const ConversationHeader = ({
  conversation,
  onBack,
  onBlock,
  busy,
}: {
  conversation: ConversationItem;
  onBack: () => void;
  onBlock?: () => void;
  busy?: boolean;
}): JSX.Element => {
  const { t, lang } = useAccountUi();
  return (
    <header className={styles.threadHeader}>
      <button
        type="button"
        className={`${styles.iconButton} ${styles.back}`}
        onClick={onBack}
        aria-label={t('message-ui.back')}
      >
        <AcademyIcon name="arrow" />
      </button>
      <AccountAvatar name={conversation.name} photo={conversation.photo} />
      <div className={styles.threadIdentity}>
        <h2 dir="auto">
          {conversation.profileHref ? (
            <AcademyLink
              href={conversation.profileHref}
              ariaLabel={`${t('message-ui.view-profile')}: ${conversation.name}`}
            >
              {conversation.name}
            </AcademyLink>
          ) : (
            conversation.name
          )}
        </h2>
        <small>{t(conversation.role)}</small>
      </div>
      {onBlock && (
        <Dropdown.Root dir={lang === 'ar' ? 'rtl' : 'ltr'}>
          <Dropdown.Trigger asChild>
            <button
              type="button"
              className={styles.iconButton}
              aria-label={t('message-ui.options')}
            >
              <AcademyIcon name="more" />
            </button>
          </Dropdown.Trigger>
          <Dropdown.Portal>
            <Dropdown.Content
              className={styles.options}
              align="end"
              sideOffset={8}
              collisionPadding={16}
            >
              <Dropdown.Item disabled={busy} onSelect={onBlock}>
                {t(conversation.ownBlocked ? 'unblock' : 'block')}
              </Dropdown.Item>
            </Dropdown.Content>
          </Dropdown.Portal>
        </Dropdown.Root>
      )}
    </header>
  );
};

export default ConversationHeader;
