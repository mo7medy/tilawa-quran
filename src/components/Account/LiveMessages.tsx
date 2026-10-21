import { useEffect, useRef, useState } from 'react';

import ConversationNotice from './messages/ConversationNotice';
import conversationItems from './messages/messageModels';
import styles from './messages/Messages.module.scss';
import MessageThread from './messages/MessageThread';
import MessageWorkspace from './messages/MessageWorkspace';
import useOpenConversation from './messages/useOpenConversation';
import { useAccountUi } from './useAccountUi';
import useConversationMessages from './useConversationMessages';

import { string } from '@/tilawa/backend/rows';

const LiveMessages = (): JSX.Element => {
  const { t, snapshot, state, userId, router, command, busy } = useAccountUi();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [actionFailed, setActionFailed] = useState(false);
  const read = useRef('');
  const actionPending = useRef(false);
  const id = typeof router.query.conversation === 'string' ? router.query.conversation : '';
  const conversations = conversationItems(snapshot, state, userId, t('message-ui.unknown-person'));
  const conversation = conversations.find((item) => item.id === id);
  const hasConversation = !!conversation;
  const history = useConversationMessages(userId, conversation ? id : '');
  const opening = useOpenConversation();
  const latest = string(history.messages[history.messages.length - 1]?.id);
  useEffect(() => {
    if (!id || !hasConversation || !command || history.loading || history.error) return undefined;
    const markRead = (): void => {
      const key = `${id}:${latest}`;
      if (document.visibilityState !== 'visible' || read.current === key) return;
      read.current = key;
      command('conversation', { conversationId: id, operation: 'read' }).catch(() => {
        read.current = '';
      });
    };
    markRead();
    document.addEventListener('visibilitychange', markRead);
    return () => document.removeEventListener('visibilitychange', markRead);
  }, [id, hasConversation, latest, command, history.loading, history.error]);
  const select = (next: string): void => {
    const query = { ...router.query };
    delete query.peer;
    delete query.conversation;
    if (next) query.conversation = next;
    router
      .push({ pathname: router.pathname, query }, undefined, { shallow: true })
      .catch(() => setActionFailed(true));
  };
  const act = async (operation: string): Promise<void> => {
    if (!command || actionPending.current) return;
    actionPending.current = true;
    setActionFailed(false);
    try {
      await command('conversation', { conversationId: id, operation });
    } catch {
      setActionFailed(true);
    } finally {
      actionPending.current = false;
    }
  };
  const disabled =
    !conversation ||
    busy ||
    history.loading ||
    !!history.error ||
    conversation.blocked ||
    conversation.status === 'rejected' ||
    (conversation.status === 'pending' &&
      (!conversation.requestedByMe || history.messages.length > 0));
  return (
    <>
      {(actionFailed || opening.failed) && (
        <div role="alert" className={styles.error}>
          {t('backend-error')}
          {opening.failed && (
            <button type="button" onClick={() => opening.retry()}>
              {t('retry')}
            </button>
          )}
        </div>
      )}
      {opening.opening && <p role="status">{t('message-ui.opening')}</p>}
      <MessageWorkspace
        conversations={conversations}
        selectedId={id}
        onSelect={select}
        onBack={() => select('')}
      >
        {conversation && (
          <MessageThread
            key={id}
            header={{
              conversation,
              onBack: () => select(''),
              busy,
              onBlock: () => {
                act(conversation.ownBlocked ? 'unblock' : 'block');
              },
            }}
            notice={<ConversationNotice conversation={conversation} busy={busy} onRespond={act} />}
            history={{
              messages: history.messages.map((item) => ({
                id: string(item.id),
                body: string(item.body),
                createdAt: string(item.created_at),
                mine: item.sender_id === userId,
              })),
              loading: history.loading,
              error: !!history.error,
              hasMore: history.hasMore,
              loadingOlder: history.loadingOlder,
              olderError: history.olderError,
              onEarlier: history.loadEarlier,
              onRetry: () => {
                history.retry().catch(() => undefined);
              },
            }}
            composer={{
              value: drafts[id] ?? '',
              disabled: !!disabled,
              onChange: (text) => setDrafts((previous) => ({ ...previous, [id]: text })),
              onSend: async (text) => {
                if (!command || disabled) return false;
                await command('message', { conversationId: id, text });
                history.retry().catch(() => undefined);
                return true;
              },
            }}
          />
        )}
      </MessageWorkspace>
    </>
  );
};

export default LiveMessages;
