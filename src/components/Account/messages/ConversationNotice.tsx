import { useAccountUi } from '../useAccountUi';

import styles from './Messages.module.scss';
import type { ConversationItem } from './types';

const ConversationNotice = ({
  conversation,
  busy,
  onRespond,
}: {
  conversation: ConversationItem;
  busy?: boolean;
  onRespond: (operation: 'accept' | 'reject') => void;
}): JSX.Element | null => {
  const { t } = useAccountUi();
  if (!conversation.blocked && !['pending', 'rejected'].includes(conversation.status ?? '')) {
    return null;
  }
  let note = 'message-request-pending';
  if (conversation.status === 'rejected') note = 'message-ui.rejected-note';
  if (conversation.blocked) note = 'message-ui.blocked-note';
  return (
    <div className={styles.notice} role="status">
      <p>{t(note)}</p>
      {!conversation.blocked &&
        conversation.status === 'pending' &&
        !conversation.requestedByMe && (
          <div className={styles.noticeActions}>
            <button type="button" disabled={busy} onClick={() => onRespond('accept')}>
              {t('accept-request')}
            </button>
            <button
              type="button"
              className={styles.subtle}
              disabled={busy}
              onClick={() => onRespond('reject')}
            >
              {t('reject-request')}
            </button>
          </div>
        )}
    </div>
  );
};

export default ConversationNotice;
