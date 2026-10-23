/* eslint-disable no-nested-ternary -- Small enum/label selections keep existing UI and wire-state mappings adjacent. */
import { useState } from 'react';

import { ACCOUNT_ZONES } from '../../tilawa/account/time';

import styles from './Account.module.scss';
import { Field, Panel, PreviewDialog, Status } from './AccountUi';
import { useAccountUi } from './useAccountUi';

import updateAccountSecurity from '@/tilawa/backend/accountSecurity';

const AccountSettings = (): JSX.Element => {
  const { t, state, dispatch, role, backend, command, lang } = useAccountUi();
  const [security, setSecurity] = useState<'email' | 'password' | null>(null);
  const [notice, setNotice] = useState(false);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <Panel icon="settings" title={t('settings')}>
      <p>{t('profile-ui.security-note')}</p>
      <div className={styles.twoColumns}>
        <div className={styles.settingCard}>
          <h3>{t('email')}</h3>
          <p dir="ltr">{role === 'teacher' ? state.teacher.email : state.student.email}</p>
          <button type="button" className={styles.secondary} onClick={() => setSecurity('email')}>
            {t('change-email')}
          </button>
        </div>
        <div className={styles.settingCard}>
          <h3>{t('profile-ui.password')}</h3>
          <p>{t('profile-ui.password-note')}</p>
          <button
            type="button"
            className={styles.secondary}
            onClick={() => setSecurity('password')}
          >
            {t('change-password')}
          </button>
        </div>
      </div>
      {role === 'teacher' && (
        <label htmlFor="teacher-account-zone" className={styles.field}>
          {t('timezone')}
          <select
            id="teacher-account-zone"
            value={state.availabilityZone}
            onChange={(event) => {
              if (backend) {
                command?.('time-zone', { zone: event.target.value }).catch(() => undefined);
              } else {
                dispatch({
                  type: 'availability',
                  value: state.availability,
                  zone: event.target.value,
                });
              }
            }}
          >
            {Array.from(new Set([...ACCOUNT_ZONES, state.availabilityZone])).map((zone) => (
              <option key={zone}>{zone}</option>
            ))}
          </select>
        </label>
      )}
      {security && (
        <PreviewDialog
          title={t('security')}
          onClose={() => {
            setSecurity(null);
            setNotice(false);
            setError(false);
          }}
        >
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const values = new FormData(form);
              if (backend) {
                setBusy(true);
                setError(false);
                try {
                  const { error: failure } = await updateAccountSecurity(security, values, lang);
                  setBusy(false);
                  form.reset();
                  if (failure) {
                    setError(true);
                    return;
                  }
                } catch {
                  setError(true);
                  return;
                } finally {
                  setBusy(false);
                }
              } else form.reset();
              setNotice(true);
            }}
          >
            <p>{t('security-description')}</p>
            {security === 'email' && (
              <Field label={t('new-email')} name="email" type="email" required autoComplete="off" />
            )}
            {backend && security === 'password' && (
              <Field
                label={t('new-password')}
                name="password"
                type="password"
                minLength={8}
                maxLength={128}
                required
                autoComplete="new-password"
              />
            )}
            <button type="submit" disabled={busy}>
              {t('preview-steps')}
            </button>
          </form>
          {error && <Status error>{t('auth-failed')}</Status>}
          {notice && (
            <Status>
              {t(
                backend
                  ? security === 'email'
                    ? 'check-email'
                    : 'password-saved'
                  : 'security-next',
              )}
            </Status>
          )}
        </PreviewDialog>
      )}
    </Panel>
  );
};
export default AccountSettings;
