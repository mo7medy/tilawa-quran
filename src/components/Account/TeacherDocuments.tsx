/* eslint-disable react-func/max-lines-per-function -- Validate, upload and compensate one document in a single change handler. */
import { useState } from 'react';

import styles from './Account.module.scss';
import SignedDocument from './SignedDocument';
import { useAccountUi } from './useAccountUi';

import { getBrowserSupabase } from '@/lib/supabase/browser';
import { compensateUpload } from '@/tilawa/backend/compensateUpload';
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
          let uploadedPath = '';
          try {
            const path = `${userId}/${crypto.randomUUID()}.${
              file.type === 'application/pdf' ? 'pdf' : file.type.split('/')[1]
            }`;
            const { error: uploadError } = await getBrowserSupabase()
              .storage.from('tilawa-teacher-documents')
              .upload(path, file, { contentType: file.type });
            if (uploadError) throw uploadError;
            uploadedPath = path;
            await command?.('document', { path, label: file.name });
          } catch (failure) {
            if (uploadedPath && userId) {
              await compensateUpload(
                'tilawa-teacher-documents',
                uploadedPath,
                userId,
                failure,
              ).catch(() => undefined);
            }
            setError(true);
          } finally {
            setBusy(false);
          }
        }}
      />
      <small>{t('documents-hint')}</small>
      {error && <p role="alert">{t('document-upload-error')}</p>}
      {rows(snapshot?.documents).map((doc) => (
        <SignedDocument key={string(doc.id)} path={string(doc.path)} label={string(doc.label)} />
      ))}
    </div>
  );
};
export default TeacherDocuments;
