/* eslint-disable no-nested-ternary -- Enrollment, challenge and loading states. */
/* eslint-disable @next/next/no-img-element -- Supabase provides a session-only inline TOTP QR, never an image asset. */

import { Field, Panel, PreviewDialog } from '../Account/AccountUi';
import { useAccountUi } from '../Account/useAccountUi';

import useAdminMfa from './useAdminMfa';

const AdminMfa = ({ manage = false }: { manage?: boolean }): JSX.Element => {
  const { t } = useAccountUi();
  const {
    factors,
    pending,
    code,
    setCode,
    busy,
    error,
    loaded,
    removing,
    setRemoving,
    start,
    verify,
    remove,
    retry,
  } = useAdminMfa();
  return (
    <Panel title={t('backend-ui.mfa.title')}>
      <p>{t('backend-ui.mfa.description')}</p>
      {!loaded ? (
        <p role="status">{t('loading')}</p>
      ) : !error && !pending && (!factors.length || manage) ? (
        <button type="button" disabled={busy} onClick={start}>
          {t(manage ? 'backend-ui.mfa.add' : 'backend-ui.mfa.setup')}
        </button>
      ) : null}
      {pending && (
        <>
          <img
            src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(pending.qr)}`}
            alt={t('backend-ui.mfa.qr')}
            width={220}
            height={220}
          />
          <details>
            <summary>{t('backend-ui.mfa.manual')}</summary>
            <code dir="ltr">{pending.secret}</code>
          </details>
        </>
      )}
      {(pending || (!manage && factors.length > 0)) && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            verify();
          }}
        >
          <Field
            label={t('backend-ui.mfa.code')}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            required
          />
          <button type="submit" disabled={busy || code.length !== 6}>
            {t('backend-ui.mfa.verify')}
          </button>
          {pending && (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (pending) remove(pending.id);
              }}
            >
              {t('cancel')}
            </button>
          )}
        </form>
      )}
      {manage &&
        factors.map((factor) => (
          <div key={factor.id}>
            <span>{factor.friendlyName || 'Tilawa TOTP'}</span>{' '}
            <button type="button" disabled={busy} onClick={() => setRemoving(factor.id)}>
              {t('backend-ui.mfa.remove')}
            </button>
          </div>
        ))}
      {removing && (
        <PreviewDialog title={t('backend-ui.mfa.remove')} onClose={() => setRemoving(null)}>
          <p>{t('backend-ui.mfa.remove-note')}</p>
          <button type="button" disabled={busy} onClick={() => remove(removing)}>
            {t('confirm')}
          </button>
        </PreviewDialog>
      )}
      {error && (
        <p role="alert">
          {t('backend-ui.mfa.error')}
          {!pending && !factors.length && (
            <button type="button" disabled={busy} onClick={retry}>
              {t('admin-console.retry')}
            </button>
          )}
        </p>
      )}
    </Panel>
  );
};
export default AdminMfa;
