/* eslint-disable no-nested-ternary -- The resend action has three mutually exclusive labels. */
import { useRouter } from 'next/router';
import useTranslation from 'next-translate/useTranslation';

import styles from './AcademyCheckEmail.module.scss';
import AcademyIcon from './AcademyIcon';
import AcademyLink from './AcademyLink';
import useEmailConfirmation from './useEmailConfirmation';

import { authDestination } from '@/tilawa/backend/authDestination';

const AcademyCheckEmail = (): JSX.Element => {
  const { t } = useTranslation('account');
  const router = useRouter();
  const { email, setEmail, remaining, busy, feedback, resend } = useEmailConfirmation();
  const suffix = `?${new URLSearchParams({
    redirectTo: authDestination(router.query.next, router.locale),
  })}`;
  return (
    <div className={styles.page}>
      <section className={styles.panel} aria-labelledby="confirmation-title">
        <div className={styles.icon}>
          <AcademyIcon name="mail" />
        </div>
        <p className={styles.eyebrow}>{t('confirmation.eyebrow')}</p>
        <h1 id="confirmation-title">{t('confirmation.title')}</h1>
        <p>{t('confirmation.description')}</p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            resend();
          }}
        >
          <label htmlFor="confirmation-email">{t('confirmation.email')}</label>
          <input
            id="confirmation-email"
            type="email"
            autoComplete="email"
            dir="ltr"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            maxLength={254}
          />
          <div className={styles.steps}>
            <p>
              <AcademyIcon name="check" />
              {t('confirmation.open')}
            </p>
            <p>
              <AcademyIcon name="check" />
              {t('confirmation.follow')}
            </p>
          </div>
          <p className={styles.hint}>{t('confirmation.spam')}</p>
          <button type="submit" disabled={busy || remaining > 0}>
            {busy
              ? t('confirmation.sending')
              : remaining > 0
              ? t('confirmation.cooldown', { seconds: remaining })
              : t('confirmation.resend')}
          </button>
        </form>
        {feedback && (
          <p className={styles.feedback} role={feedback === 'sent' ? 'status' : 'alert'}>
            {t(`confirmation.${feedback}`)}
          </p>
        )}
        <div className={styles.links}>
          <AcademyLink href={`/sign-in${suffix}`}>{t('confirmation.login')}</AcademyLink>
          <AcademyLink href={`/register${suffix}`}>{t('confirmation.change-email')}</AcademyLink>
        </div>
      </section>
    </div>
  );
};

export default AcademyCheckEmail;
