import { useId, useRef, useState } from 'react';

import AcademyIcon from '../../Academy/AcademyIcon';
import { useAccountUi } from '../useAccountUi';

import styles from './Messages.module.scss';

const MessageComposer = ({
  value,
  onChange,
  onSend,
  disabled = false,
  disabledReason,
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: (text: string) => Promise<boolean>;
  disabled?: boolean;
  disabledReason?: string;
}): JSX.Element => {
  const { t } = useAccountUi();
  const id = useId();
  const pending = useRef(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);
  const submit = async (): Promise<void> => {
    if (pending.current || disabled || !value.trim()) return;
    pending.current = true;
    setSending(true);
    setFailed(false);
    try {
      const sent = await onSend(value.trim());
      if (sent) onChange('');
      else setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      pending.current = false;
      setSending(false);
      input.current?.focus();
    }
  };
  return (
    <form
      className={styles.composer}
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      {failed && (
        <p className={styles.error} role="alert">
          {t('message-ui.send-failed')}
        </p>
      )}
      {disabledReason && <p className={styles.composerHint}>{disabledReason}</p>}
      <label htmlFor={id} className={styles.srOnly}>
        {t('your-message')}
      </label>
      <div className={styles.composerInput}>
        <textarea
          id={id}
          ref={input}
          rows={2}
          maxLength={2000}
          required
          value={value}
          dir="auto"
          disabled={disabled || sending}
          aria-describedby={`${id}-hint`}
          placeholder={t('message-ui.placeholder')}
          onChange={(event) => {
            onChange(event.target.value);
            setFailed(false);
          }}
          onKeyDown={(event) => {
            if (
              event.key === 'Enter' &&
              (event.ctrlKey || event.metaKey) &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              submit();
            }
          }}
        />
        <button
          type="submit"
          className={styles.send}
          disabled={disabled || sending || !value.trim()}
        >
          <span>{t(sending ? 'message-ui.sending' : 'send-preview')}</span>
          <AcademyIcon name="send" />
        </button>
      </div>
      <div className={styles.composerFooter}>
        <small id={`${id}-hint`}>{t('message-ui.keyboard-hint')}</small>
        <small className={styles.characterCount} dir="ltr">
          {t('message-ui.character-count', { count: value.length, max: 2000 })}
        </small>
      </div>
    </form>
  );
};

export default MessageComposer;
