import { useState } from 'react';

import useTranslation from 'next-translate/useTranslation';

import { errorCode, studioRequest } from '../client';
import { BufferConnection } from '../multiPublishing';
import { PublisherChannel } from '../publishing';

import styles from './AdminVideo.module.scss';

const AdminBufferKeyForm = ({
  connections,
  disabled,
  onSave,
}: {
  connections: BufferConnection[];
  disabled: boolean;
  onSave: (result: { id: string; channels: PublisherChannel[] }) => Promise<void>;
}): JSX.Element => {
  const { t } = useTranslation('video-studio');
  const [name, setName] = useState('');
  const [token, setToken] = useState('');
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');
  const [saved, setSaved] = useState(false);
  const execute = async (action: () => Promise<void>): Promise<void> => {
    setBusy(true);
    setFailure('');
    setSaved(false);
    try {
      await action();
      setSaved(true);
    } catch (error) {
      setFailure(errorCode(error));
    } finally {
      setBusy(false);
    }
  };
  const connect = async (): Promise<void> => {
    try {
      const result = await studioRequest<{ id: string; channels: PublisherChannel[] }>(
        selected ? `admin/connections/${selected}` : 'admin/connections',
        { token, name },
        selected ? 'PUT' : 'POST',
      );
      await onSave(result);
      setName('');
    } finally {
      setToken('');
    }
  };
  return (
    <>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          execute(connect);
        }}
        className={styles.form}
      >
        <label htmlFor="buffer-existing">
          {t('admin.connection-action')}
          <select
            id="buffer-existing"
            value={selected}
            onChange={(event) => {
              setSelected(event.target.value);
              setToken('');
            }}
            disabled={disabled || busy}
          >
            <option value="">{t('admin.add-connection')}</option>
            {connections.map((c) => (
              <option key={c.id} value={c.id}>
                {t('admin.update-key')} · {c.name}
              </option>
            ))}
          </select>
        </label>
        {!selected && (
          <label htmlFor="buffer-name">
            {t('admin.connection-name')}
            <input
              id="buffer-name"
              required
              maxLength={100}
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={disabled || busy}
            />
          </label>
        )}
        <label htmlFor="buffer-token">
          {t('admin.api-key')}
          <input
            id="buffer-token"
            type="password"
            autoComplete="off"
            required
            minLength={16}
            maxLength={512}
            value={token}
            onChange={(event) => setToken(event.target.value)}
            disabled={disabled || busy}
          />
        </label>
        <button
          type="submit"
          disabled={
            disabled ||
            busy ||
            (!selected && connections.filter((c) => !c.disconnected).length >= 3)
          }
        >
          {t('admin.check-save')}
        </button>
      </form>
      {saved && <p role="status">{t('admin.saved')}</p>}
      {failure && (
        <p role="alert">
          {t(`errors.${failure}`, undefined, { fallback: t('errors.STUDIO_ERROR') })}
        </p>
      )}
    </>
  );
};
export default AdminBufferKeyForm;
