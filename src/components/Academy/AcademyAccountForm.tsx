/* eslint-disable no-nested-ternary -- Small enum/label selections keep existing UI and wire-state mappings adjacent. */
/* eslint-disable max-lines -- Keep this cohesive form or typed data contract together; reader services are split by feature. */
/* eslint-disable react-func/max-lines-per-function */
import { useId, useState } from 'react';
import type { FormEvent } from 'react';

import { useRouter } from 'next/router';
import useTranslation from 'next-translate/useTranslation';

import styles from './AcademyAccount.module.scss';
import AcademyIcon from './AcademyIcon';

import { getBrowserSupabase } from '@/lib/supabase/browser';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { authCallbackPath, authDestination } from '@/tilawa/backend/authDestination';

interface AcademyAccountFormProps {
  mode: 'register' | 'sign-in' | 'recovery';
}

// UI preview only: no requests, session creation, credential persistence or payment.
const AcademyAccountForm = ({ mode }: AcademyAccountFormProps): JSX.Element => {
  const { t } = useTranslation('academy');
  const { t: tAccount } = useTranslation('account');
  const router = useRouter();
  const id = useId();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [notice, setNotice] = useState<'email' | 'google' | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');
  const [liveNotice, setLiveNotice] = useState('');
  const live = process.env.NODE_ENV !== 'test';
  const isRegister = mode === 'register';
  const isRecovery = mode === 'recovery';
  const resetting = router.query.reset === '1';
  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (live) {
      const form = event.currentTarget;
      const values = new FormData(form);
      setBusy(true);
      setFailure('');
      setLiveNotice('');
      try {
        if (!isSupabaseConfigured()) throw new Error('BACKEND_NOT_CONFIGURED');
        const client = getBrowserSupabase();
        const email = String(values.get('email') ?? '');
        const password = String(values.get('password') ?? '');
        const next = router.query.redirectTo ?? router.query.redirect;
        const callback = `${window.location.origin}${authCallbackPath(next, router.locale)}`;
        const result = resetting
          ? await client.auth.updateUser({ password })
          : isRecovery
          ? await client.auth.resetPasswordForEmail(email, {
              redirectTo: `${window.location.origin}${authCallbackPath(next, router.locale, true)}`,
            })
          : isRegister
          ? await client.auth.signUp({
              email,
              password,
              options: { data: { name: String(values.get('name')) }, emailRedirectTo: callback },
            })
          : await client.auth.signInWithPassword({ email, password });
        if (result.error) throw new Error(result.error.code ?? 'AUTH_FAILED');
        form.reset();
        setIsPasswordVisible(false);
        if (isRegister || isRecovery) setLiveNotice('check-email');
        else {
          await router.push(authDestination(next, router.locale));
        }
      } catch (error) {
        setFailure(
          error instanceof Error && error.message === 'BACKEND_NOT_CONFIGURED'
            ? 'backend-not-configured'
            : 'auth-failed',
        );
      } finally {
        setBusy(false);
      }
      return;
    }
    // Clear the password as soon as the design preview is submitted.
    event.currentTarget.reset();
    setIsPasswordVisible(false);
    setNotice('email');
  };
  return (
    <div>
      {!isRecovery && (
        <>
          <button
            type="button"
            className={styles.google}
            disabled={live && process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED !== '1'}
            onClick={async () => {
              if (!live) {
                setNotice('google');
                return;
              }
              const { error } = await getBrowserSupabase().auth.signInWithOAuth({
                provider: 'google',
                options: {
                  redirectTo: `${window.location.origin}/auth/callback?${new URLSearchParams({
                    next: authDestination(
                      router.query.redirectTo ?? router.query.redirect,
                      router.locale,
                    ),
                    lang: router.locale === 'ar' ? 'ar' : 'en',
                  })}`,
                },
              });
              if (error) setFailure('auth-failed');
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M21.6 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.8 3-4.3 3-7.4ZM12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 .9-3.4.9-2.6 0-4.9-1.8-5.7-4.2H3v2.6A10 10 0 0 0 12 22ZM6.3 13.8a6 6 0 0 1 0-3.6V7.6H3a10 10 0 0 0 0 8.8l3.3-2.6ZM12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A9.6 9.6 0 0 0 12 2a10 10 0 0 0-9 5.6l3.3 2.6A6 6 0 0 1 12 6Z"
              />
            </svg>
            {t('account.google')}
          </button>
          <div className={styles.divider}>
            <span>{t('account.or-email')}</span>
          </div>
        </>
      )}
      <form className={styles.form} onSubmit={handleSubmit} onChange={() => setNotice(null)}>
        {isRegister && (
          <label htmlFor={`${id}-name`}>
            {t('account.name')}
            <input
              id={`${id}-name`}
              name="name"
              autoComplete="name"
              required
              maxLength={100}
              placeholder={t('account.name-placeholder')}
            />
          </label>
        )}
        {!resetting && (
          <label htmlFor={`${id}-email`}>
            {t('account.email')}
            <input
              id={`${id}-email`}
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              dir="ltr"
              placeholder={t('account.email-placeholder')}
            />
          </label>
        )}
        {(!isRecovery || resetting) && (
          <div>
            <label htmlFor={`${id}-password`}>{t('account.password')}</label>
            <div className={styles.password}>
              <input
                id={`${id}-password`}
                name="password"
                type={isPasswordVisible ? 'text' : 'password'}
                autoComplete={isRegister || resetting ? 'new-password' : 'current-password'}
                required
                minLength={isRegister || resetting ? 8 : 1}
                maxLength={128}
                aria-describedby={isRegister ? `${id}-password-hint` : undefined}
                dir="ltr"
              />
              <button
                type="button"
                aria-label={t(
                  isPasswordVisible ? 'account.hide-password' : 'account.show-password',
                )}
                aria-pressed={isPasswordVisible}
                onClick={() => setIsPasswordVisible(!isPasswordVisible)}
              >
                <AcademyIcon name={isPasswordVisible ? 'eyeOff' : 'eye'} />
              </button>
            </div>
            {isRegister && (
              <p className={styles.hint} id={`${id}-password-hint`}>
                {t('account.password-hint')}
              </p>
            )}
          </div>
        )}
        <button className={styles.submit} type="submit" disabled={busy}>
          {busy
            ? tAccount('saving')
            : resetting
            ? tAccount('save-password')
            : t(`account.${mode}.submit`)}
          <AcademyIcon name="arrow" />
        </button>
      </form>
      {notice && (
        <div className={styles.feedback} role="status">
          <AcademyIcon name="check" />
          <p>
            {t(notice === 'google' ? 'account.google-preview' : `account.${mode}.preview-result`)}
          </p>
        </div>
      )}
      {failure && (
        <p role="alert" className={styles.feedback}>
          {tAccount(failure)}
        </p>
      )}
      {liveNotice && (
        <p role="status" className={styles.feedback}>
          {tAccount(liveNotice)}
        </p>
      )}
      {!live && <p className={styles.previewNote}>{t('account.preview-note')}</p>}
    </div>
  );
};

export default AcademyAccountForm;
