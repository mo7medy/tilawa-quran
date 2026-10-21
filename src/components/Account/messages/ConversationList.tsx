import { useId, useState } from 'react';

import AcademyIcon from '../../Academy/AcademyIcon';
import AccountAvatar from '../AccountAvatar';
import { AccountLink } from '../AccountUi';
import { useAccountUi } from '../useAccountUi';

import styles from './Messages.module.scss';
import type { ConversationItem } from './types';

const ConversationList = ({
  conversations,
  selectedId,
  onSelect,
}: {
  conversations: ConversationItem[];
  selectedId: string;
  onSelect: (id: string) => void;
}): JSX.Element => {
  const { t, role } = useAccountUi();
  const [query, setQuery] = useState('');
  const searchId = useId();
  const filtered = conversations.filter((item) =>
    `${item.name} ${item.preview ?? ''}`
      .toLocaleLowerCase()
      .includes(query.trim().toLocaleLowerCase()),
  );
  return (
    <aside className={styles.directory} aria-label={t('conversations')}>
      <div className={styles.directoryHeading}>
        <h2>{t('conversations')}</h2>
        <p>{t('message-ui.directory-note')}</p>
        <label className={styles.search} htmlFor={searchId}>
          <AcademyIcon name="search" />
          <span className={styles.srOnly}>{t('message-ui.search')}</span>
          <input
            id={searchId}
            type="search"
            value={query}
            placeholder={t('message-ui.search-placeholder')}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>
      <div className={styles.conversations}>
        {filtered.map((item) => (
          <button
            type="button"
            key={item.id}
            aria-pressed={selectedId === item.id}
            className={styles.conversationItem}
            onClick={() => onSelect(item.id)}
          >
            <AccountAvatar name={item.name} photo={item.photo} />
            <span className={styles.conversationText}>
              <strong dir="auto">{item.name}</strong>
              <span className={styles.preview} dir="auto">
                {item.preview || t(item.role)}
              </span>
              {(item.blocked || item.status === 'pending') && (
                <span className={styles.requestLabel}>
                  {t(item.blocked ? 'message-ui.blocked-label' : 'message-request')}
                </span>
              )}
            </span>
          </button>
        ))}
        {!filtered.length && (
          <div className={styles.directoryEmpty} role="status">
            <AcademyIcon name="chat" />
            <p>{t(query ? 'message-ui.no-results' : 'message-ui.no-conversations')}</p>
            {query && (
              <button type="button" onClick={() => setQuery('')}>
                {t('message-ui.clear-search')}
              </button>
            )}
            {!query && role === 'student' && (
              <AccountLink to="/teachers">{t('browse-teachers')}</AccountLink>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};

export default ConversationList;
