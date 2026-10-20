/* eslint-disable max-lines -- Keep this cohesive form or typed data contract together; reader services are split by feature. */
import { useEffect, useRef, useState } from 'react';

import styles from './Account.module.scss';
import { Panel } from './AccountUi';
import { useAccountUi } from './useAccountUi';
import useConversationMessages from './useConversationMessages';

import { object, rows, string } from '@/tilawa/backend/mappers';
import type { Row } from '@/tilawa/backend/mappers';

const LiveMessages = (): JSX.Element => {
  const { t, snapshot, userId, router, command, busy, teacherFor, studentFor } = useAccountUi();
  const [text, setText] = useState('');
  const opened = useRef('');
  const bottom = useRef<HTMLDivElement>(null);
  const conversations = rows(snapshot?.conversations);
  const id =
    typeof router.query.conversation === 'string'
      ? router.query.conversation
      : string(conversations[0]?.id);
  const conversation = conversations.find((c) => c.id === id);
  const { messages, hasMore, loadingOlder, olderError, loadEarlier, error, loading } =
    useConversationMessages(userId, id);
  const latest = string(messages[messages.length - 1]?.id);
  const peerName = (c: Row): string =>
    c.teacher_id === userId
      ? studentFor(string(c.student_id)).name
      : teacherFor(string(c.teacher_id)).publicProfile.displayName;
  useEffect(() => {
    const peer = typeof router.query.peer === 'string' ? router.query.peer : '';
    if (!peer || opened.current === peer || !command) return;
    opened.current = peer;
    command<{ id: string }>('conversation', { peerId: peer })
      .then((result) =>
        router.replace(`/profile/messages?conversation=${result.id}`, undefined, { shallow: true }),
      )
      .catch(() => {
        opened.current = '';
      });
  }, [router, command]);
  useEffect(() => {
    bottom.current?.scrollIntoView?.({ block: 'nearest' });
    if (id && command) {
      command('conversation', { conversationId: id, operation: 'read' }).catch(() => undefined);
    }
  }, [id, latest, command]);
  return (
    <Panel title={t('messages')}>
      <div className={styles.messaging}>
        <aside>
          <strong>{t('conversations')}</strong>
          {!conversations.length && <p>{t('no-messages')}</p>}
          {conversations.map((c) => (
            <button
              type="button"
              className={styles.secondary}
              key={string(c.id)}
              aria-pressed={c.id === id}
              onClick={() => {
                router.push(`/profile/messages?conversation=${c.id}`, undefined, {
                  shallow: true,
                });
              }}
            >
              {peerName(c)} {c.request_status === 'pending' ? `· ${t('message-request')}` : ''}
            </button>
          ))}
        </aside>
        <div>
          {conversation && (
            <>
              <h3>{peerName(conversation)}</h3>
              {conversation.request_status === 'pending' && (
                <div className={styles.notice}>
                  <p>{t('message-request-pending')}</p>
                  {conversation.requested_by !== userId && (
                    <div className={styles.actions}>
                      {['accept', 'reject'].map((operation) => (
                        <button
                          type="button"
                          key={operation}
                          disabled={busy}
                          onClick={() => {
                            command?.('conversation', { conversationId: id, operation }).catch(
                              () => undefined,
                            );
                          }}
                        >
                          {t(operation === 'accept' ? 'accept-request' : 'reject-request')}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <button
                type="button"
                className={styles.secondary}
                disabled={busy}
                onClick={() => {
                  command?.('conversation', {
                    conversationId: id,
                    operation: object(conversation.own_state).blocked ? 'unblock' : 'block',
                  }).catch(() => undefined);
                }}
              >
                {t(object(conversation.own_state).blocked ? 'unblock' : 'block')}
              </button>
              {(loading || error) && (
                <p role={error ? 'alert' : 'status'}>{t(error ? 'backend-error' : 'loading')}</p>
              )}
              {hasMore && (
                <button
                  type="button"
                  className={styles.secondary}
                  disabled={loadingOlder}
                  onClick={loadEarlier}
                >
                  {t('load-earlier')}
                </button>
              )}
              {olderError && <p role="alert">{t('backend-error')}</p>}
              <div
                className={styles.messages}
                role="log"
                aria-label={t('conversation')}
                aria-live="polite"
              >
                {messages.map((m) => (
                  <article
                    key={string(m.id)}
                    className={m.sender_id === userId ? styles.sent : styles.received}
                  >
                    <small>{m.sender_id === userId ? t('you') : peerName(conversation)}</small>
                    <p>{string(m.body)}</p>
                    <time dateTime={string(m.created_at)}>
                      {new Date(string(m.created_at)).toLocaleString(router.locale)}
                    </time>
                  </article>
                ))}
                <div ref={bottom} />
              </div>
              <form
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (!text.trim() || !command) return;
                  try {
                    await command('message', { conversationId: id, text });
                    setText('');
                  } catch {
                    /* Shared error panel keeps the draft available. */
                  }
                }}
              >
                <label className={styles.field} htmlFor="live-message">
                  {t('your-message')}
                  <textarea
                    id="live-message"
                    rows={3}
                    maxLength={2000}
                    required
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                  />
                </label>
                <button
                  type="submit"
                  disabled={
                    busy ||
                    !text.trim() ||
                    !!conversation.blocked ||
                    conversation.request_status === 'rejected' ||
                    (conversation.request_status === 'pending' &&
                      (conversation.requested_by !== userId || messages.length > 0))
                  }
                >
                  {t('send')}
                </button>
              </form>
            </>
          )}
          {!conversation && <p>{t('choose-conversation')}</p>}
        </div>
      </div>
    </Panel>
  );
};
export default LiveMessages;
