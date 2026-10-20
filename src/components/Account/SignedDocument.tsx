import { useState } from 'react';

import { useAccountUi } from './useAccountUi';

import { getBrowserSupabase, getSessionUserId } from '@/lib/supabase/browser';

const SignedDocument = ({ path, label }: { path: string; label: string }): JSX.Element => {
  const { t, userId } = useAccountUi();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const open = async (): Promise<void> => {
    setBusy(true);
    setError(false);
    try {
      const { data, error: failure } = await getBrowserSupabase()
        .storage.from('tilawa-teacher-documents')
        .createSignedUrl(path, 60);
      if (failure || !data) throw new Error('DOCUMENT_UNAVAILABLE');
      if (getSessionUserId() === userId) {
        window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
      }
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      <button type="button" disabled={busy} onClick={open}>
        {busy ? t('loading') : label}
      </button>
      {error && <p role="alert">{t('backend-ui.document-error')}</p>}
    </div>
  );
};
export default SignedDocument;
