/* eslint-disable no-nested-ternary -- Small enum/label selections keep existing UI and wire-state mappings adjacent. */
import { useState } from 'react';

import { ACCOUNT_ZONES } from '../../tilawa/account/time';

import styles from './Account.module.scss';
import { Field, Panel, PreviewDialog, Status } from './AccountUi';
import { useAccountUi } from './useAccountUi';

import { getBrowserSupabase } from '@/lib/supabase/browser';

const AccountSettings = (): JSX.Element => {
  const { t, state, dispatch, role, backend } = useAccountUi();
  const [security, setSecurity] = useState<'email' | 'password' | null>(null);
  const [notice, setNotice] = useState(false);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <Panel title={t('settings')}>
      <div className={styles.twoColumns}>
        <div>
          <strong>{t('email')}</strong>
          <p dir="ltr">{role === 'teacher' ? state.teacher.email : state.student.email}</p>
          <button type="button" onClick={() => setSecurity('email')}>
            {t('change-email')}
          </button>
        </div>
        <label htmlFor="account-accountsettings-778" className={styles.field}>
          {t('timezone')}
          <select
            id="account-accountsettings-778"
            value={role === 'teacher' ? state.availabilityZone : state.student.zone}
            onChange={(event) =>
              dispatch(
                role === 'teacher'
                  ? { type: 'availability', value: state.availability, zone: event.target.value }
                  : { type: 'student', value: { ...state.student, zone: event.target.value } },
              )
            }
          >
            {ACCOUNT_ZONES.map((zone) => (
              <option key={zone}>{zone}</option>
            ))}
          </select>
        </label>
      </div>
      <button type="button" onClick={() => setSecurity('password')}>
        {t('change-password')}
      </button>
      {security && (
        <PreviewDialog
          title={t('security')}
          onClose={() => {
            setSecurity(null);
            setNotice(false);
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
                const { error: failure } = await getBrowserSupabase().auth.updateUser(
                  security === 'email'
                    ? { email: String(values.get('email')) }
                    : { password: String(values.get('password')) },
                );
                setBusy(false);
                form.reset();
                if (failure) {
                  setError(true);
                  return;
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
