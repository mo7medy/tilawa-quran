/* eslint-disable react-func/max-lines-per-function */
import { useRouter } from 'next/router';
import useTranslation from 'next-translate/useTranslation';

import { readAcademyPlanSelection } from '../../tilawa/academyPlans';
import getAccountQuerySuffix from '../../tilawa/accountNavigation';

import styles from './AcademyAccount.module.scss';
import AcademyAccountForm from './AcademyAccountForm';
import AcademyAccountSummary from './AcademyAccountSummary';
import AcademyLink from './AcademyLink';

interface AcademyAccountProps {
  mode: 'register' | 'sign-in';
}

const AcademyAccount = ({ mode }: AcademyAccountProps): JSX.Element => {
  const { t } = useTranslation('academy');
  const { t: tAccount } = useTranslation('account');
  const { query } = useRouter();
  const selection = readAcademyPlanSelection(query);
  const isRecovery = mode === 'sign-in' && query.recovery === '1';
  const formMode = isRecovery ? 'recovery' : mode;
  const suffix = getAccountQuerySuffix(query);
  return (
    <div className={styles.page}>
      <div className={`${styles.layout} ${selection ? styles.withSelection : ''}`}>
        <AcademyAccountSummary selection={selection} />
        <section className={styles.panel} aria-labelledby="account-title">
          <div className={styles.panelIntro}>
            <p className={styles.eyebrow}>{t('account.welcome')}</p>
            <h1 id="account-title">{t(`account.${formMode}.title`)}</h1>
            <p>{t(`account.${formMode}.subtitle`)}</p>
          </div>
          {mode === 'sign-in' && query.authError === '1' && (
            <div className={styles.feedback} role="alert">
              <p>
                {tAccount('confirmation.invalid-link')}{' '}
                <AcademyLink href="/auth/check-email">
                  {tAccount('confirmation.resend')}
                </AcademyLink>
              </p>
            </div>
          )}
          <AcademyAccountForm key={formMode} mode={formMode} />
          <div className={styles.accountLinks}>
            {isRecovery ? (
              <AcademyLink href={`/sign-in${suffix}`}>{t('account.back-login')}</AcademyLink>
            ) : (
              <>
                <p>
                  {t(mode === 'register' ? 'account.have-account' : 'account.new-account')}{' '}
                  <AcademyLink href={`${mode === 'register' ? '/sign-in' : '/register'}${suffix}`}>
                    {t(mode === 'register' ? 'header.login' : 'account.register-link')}
                  </AcademyLink>
                </p>
                {mode === 'sign-in' && (
                  <AcademyLink href={`/sign-in${suffix ? `${suffix}&` : '?'}recovery=1`}>
                    {t('account.forgot-password')}
                  </AcademyLink>
                )}
              </>
            )}
          </div>
          <div className={styles.teach}>
            <div>
              <strong>{t('account.teacher-title')}</strong>
              <p>{t('account.teacher-description')}</p>
            </div>
            <AcademyLink href="/teachers/apply">{t('account.teacher-link')}</AcademyLink>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AcademyAccount;
