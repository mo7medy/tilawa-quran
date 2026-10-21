import { useEffect, useRef, useState } from 'react';

import { useAccountUi } from '../useAccountUi';

import styles from './Messages.module.scss';
import type { ThreadMessage } from './types';

const MessageHistory = ({
  messages,
  loading,
  error,
  hasMore,
  loadingOlder,
  olderError,
  onEarlier,
  onRetry,
}: {
  messages: ThreadMessage[];
  loading?: boolean;
  error?: boolean;
  hasMore?: boolean;
  loadingOlder?: boolean;
  olderError?: boolean;
  onEarlier?: () => void;
  onRetry?: () => void;
}): JSX.Element => {
  const { t, lang, state } = useAccountUi();
  const viewport = useRef<HTMLDivElement>(null);
  const previous = useRef({ first: '', last: '', height: 0 });
  const nearBottom = useRef(true);
  const [newMessages, setNewMessages] = useState(false);
  const first = messages[0]?.id ?? '';
  const last = messages[messages.length - 1]?.id ?? '';
  const mine = messages[messages.length - 1]?.mine;
  const zone = state.student.zone || 'UTC';
  const date = (value?: string, time = false): string => {
    if (!value || !Number.isFinite(Date.parse(value))) return '';
    return new Intl.DateTimeFormat(lang, {
      timeZone: zone,
      ...(time
        ? { hour: 'numeric', minute: '2-digit' }
        : { year: 'numeric', month: 'long', day: 'numeric' }),
    }).format(new Date(value));
  };
  const toBottom = (): void => {
    const element = viewport.current;
    if (element) element.scrollTop = element.scrollHeight;
    nearBottom.current = true;
    setNewMessages(false);
  };
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const old = previous.current;
    if (!last) {
      nearBottom.current = true;
      setNewMessages(false);
    } else if (old.last && old.last === last && old.first !== first) {
      element.scrollTop += element.scrollHeight - old.height;
    } else if (!old.last || nearBottom.current || mine) toBottom();
    else if (old.last !== last) setNewMessages(true);
    previous.current = { first, last, height: element.scrollHeight };
  }, [first, last, mine]);
  return (
    <div className={styles.historyFrame}>
      <div
        ref={viewport}
        className={styles.history}
        onScroll={() => {
          const element = viewport.current;
          if (!element) return;
          nearBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80;
          if (nearBottom.current) setNewMessages(false);
        }}
      >
        {hasMore && (
          <button
            type="button"
            className={styles.earlier}
            disabled={loadingOlder}
            onClick={onEarlier}
          >
            {t(loadingOlder ? 'loading' : 'load-earlier')}
          </button>
        )}
        {(error || olderError) && (
          <div className={styles.historyState} role="alert">
            <p>{t('backend-error')}</p>
            <button type="button" onClick={olderError ? onEarlier : onRetry}>
              {t('retry')}
            </button>
          </div>
        )}
        {loading && (
          <p className={styles.historyState} role="status">
            {t('loading')}
          </p>
        )}
        {!loading && !error && !messages.length && (
          <div className={styles.historyState}>
            <h3>{t('message-ui.start-title')}</h3>
            <p>{t('no-messages')}</p>
          </div>
        )}
        <div
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          aria-label={t('conversation')}
          className={styles.bubbles}
        >
          {messages.map((message, index) => {
            const day = date(message.createdAt);
            return (
              <div key={message.id}>
                {day && day !== date(messages[index - 1]?.createdAt) && (
                  <div className={styles.day}>
                    <span>{day}</span>
                  </div>
                )}
                <article
                  className={message.mine ? styles.sent : styles.received}
                  aria-label={message.mine ? t('you') : undefined}
                >
                  <p dir="auto">{message.body}</p>
                  {message.createdAt && (
                    <time dateTime={message.createdAt}>{date(message.createdAt, true)}</time>
                  )}
                </article>
              </div>
            );
          })}
        </div>
      </div>
      {newMessages && (
        <button type="button" className={styles.newMessages} onClick={toBottom}>
          {t('message-ui.new-messages')}
        </button>
      )}
    </div>
  );
};

export default MessageHistory;
