/* eslint-disable react/no-multi-comp -- A small mode wrapper selects the colocated live or isolated design-preview component. */
import { useEffect, useRef, useState } from 'react';

import styles from './Account.module.scss';
import { Panel } from './AccountUi';
import LiveMessages from './LiveMessages';
import { useAccountUi } from './useAccountUi';

const DemoMessages = (): JSX.Element => {
  const { t, role, state, dispatch, router } = useAccountUi();
  const [text, setText] = useState('');
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView?.({ block: 'nearest' });
  }, [state.messages.length]);
  const counterpart =
    role === 'student' ? state.teacher.publicProfile.displayName : state.student.name;
  return (
    <Panel title={t('messages')}>
      <div className={styles.messaging}>
        <aside>
          <strong>{t('conversations')}</strong>
          <p>{counterpart}</p>
          <small>{t('demo-conversation')}</small>
        </aside>
        <div>
          <div
            className={styles.messages}
            role="log"
            aria-label={t('conversation')}
            aria-live="polite"
          >
            {router.query.view === 'empty' ? (
              <p>{t('no-messages')}</p>
            ) : (
              state.messages.map((message) => (
                <article
                  key={message.id}
                  className={message.role === role ? styles.sent : styles.received}
                >
                  <small>{message.role === role ? t('you') : counterpart}</small>
                  <p>{message.text}</p>
                </article>
              ))
            )}
            <div ref={end} />
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!text.trim()) return;
              dispatch({ type: 'message', role, text });
              setText('');
            }}
          >
            <label htmlFor="account-accountmessages-1813" className={styles.field}>
              {t('your-message')}
              <textarea
                id="account-accountmessages-1813"
                value={text}
                maxLength={2000}
                required
                rows={3}
                onChange={(event) => setText(event.target.value)}
              />
            </label>
            <button type="submit" disabled={!text.trim()}>
              {t('send-preview')}
            </button>
            <small>{t('message-local')}</small>
          </form>
        </div>
      </div>
    </Panel>
  );
};
const AccountMessages = (): JSX.Element => {
  const { backend } = useAccountUi();
  return backend ? <LiveMessages /> : <DemoMessages />;
};
export default AccountMessages;
