import { useState } from 'react';

import styles from './Account.module.scss';
import { useAccountUi } from './useAccountUi';

import { getBrowserSupabase } from '@/lib/supabase/browser';
import { rows, string } from '@/tilawa/backend/mappers';

const TeacherDocuments = (): JSX.Element => {
  const { t, command, userId, snapshot } = useAccountUi();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  return (
    <div className={styles.field}>
      <label htmlFor="teacher-document">
        {t('teacher-wizard.optional-field', { field: t('supporting-documents') })}
      </label>
      <input
        id="teacher-document"
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        disabled={busy || !snapshot?.teacher}
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          if (
            file.size > 10 * 1024 * 1024 ||
            !['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type)
          ) {
            setError(true);
            return;
          }
          setBusy(true);
          setError(false);
          try {
            const path = `${userId}/${crypto.randomUUID()}.${
              file.type === 'application/pdf' ? 'pdf' : file.type.split('/')[1]
            }`;
            const { error: uploadError } = await getBrowserSupabase()
              .storage.from('tilawa-teacher-documents')
              .upload(path, file, { contentType: file.type });
            if (uploadError) throw uploadError;
            await command?.('document', { path, label: file.name });
          } catch {
            setError(true);
          } finally {
            setBusy(false);
          }
        }}
      />
      <small>{t('documents-hint')}</small>
      {error && <p role="alert">{t('document-upload-error')}</p>}
      {rows(snapshot?.documents).map((doc) => (
        <button
          type="button"
          key={string(doc.id)}
          onClick={async () => {
            const { data } = await getBrowserSupabase()
              .storage.from('tilawa-teacher-documents')
              .createSignedUrl(string(doc.path), 60);
            if (data) window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
          }}
        >
          {string(doc.label)}
        </button>
      ))}
    </div>
  );
};
export default TeacherDocuments;
