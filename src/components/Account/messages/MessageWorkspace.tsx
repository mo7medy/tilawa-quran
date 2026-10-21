import type { ReactNode } from 'react';

import AcademyIcon from '../../Academy/AcademyIcon';
import { useAccountUi } from '../useAccountUi';

import ConversationList from './ConversationList';
import styles from './Messages.module.scss';
import type { ConversationItem } from './types';

const MessageWorkspace = ({
  conversations,
  selectedId,
  onSelect,
  onBack,
  children,
}: {
  conversations: ConversationItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  onBack: () => void;
  children?: ReactNode;
}): JSX.Element => {
  const { t } = useAccountUi();
  return (
    <section className={styles.workspace} data-open={!!selectedId} aria-label={t('messages')}>
      <ConversationList conversations={conversations} selectedId={selectedId} onSelect={onSelect} />
      <div className={styles.threadPane}>
        {children || (
          <div className={styles.welcome}>
            <button
              type="button"
              className={`${styles.iconButton} ${styles.back}`}
              onClick={onBack}
              aria-label={t('message-ui.back')}
            >
              <AcademyIcon name="arrow" />
            </button>
            <span className={styles.welcomeIcon}>
              <AcademyIcon name="chat" />
            </span>
            <h2>{t('message-ui.welcome-title')}</h2>
            <p>{t('choose-conversation')}</p>
            <small>{t('message-ui.learning-note')}</small>
          </div>
        )}
      </div>
    </section>
  );
};

export default MessageWorkspace;
