import { useState } from 'react';

import styles from './Account.module.scss';
import AccountSettings from './AccountSettings';
import { AccountLink, Panel, Status } from './AccountUi';
import TeacherDocuments from './TeacherDocuments';
import TeacherRegistrationForm from './TeacherRegistrationForm';
import { useAccountUi } from './useAccountUi';

const TeacherEditor = (): JSX.Element => {
  const { t, state, dispatch, lang, backend, busy, snapshot } = useAccountUi();
  const [message, setMessage] = useState('');
  return (
    <>
      <Panel title={t('teacher-profile')}>
        <span className={styles.badge}>{t(`approval.${state.teacher.approval}`)}</span>
        <div className={styles.actions}>
          <AccountLink
            to={
              backend
                ? '/profile/teacher/preview'
                : `/teachers/${state.teacher.publicProfile.slug}?accountPreview=1`
            }
          >
            {t('public-profile')}
          </AccountLink>
          <button
            type="button"
            disabled={backend && state.teacher.approval !== 'approved'}
            onClick={() => {
              const url = `${window.location.origin}/${lang === 'en' ? '' : `${lang}/`}teachers/${
                state.teacher.publicProfile.slug
              }`;
              if (!navigator.clipboard) {
                setMessage('copy-failed');
                return;
              }
              navigator.clipboard
                ?.writeText(url)
                .then(() => setMessage('link-copied'))
                .catch(() => setMessage('copy-failed'));
            }}
          >
            {t('copy-profile-link')}
          </button>
        </div>
        {message && <Status error={message === 'copy-failed'}>{t(message)}</Status>}
        <TeacherRegistrationForm />
      </Panel>
      {backend && (
        <Panel title={t('application-status')}>
          {Array.isArray(snapshot?.approvalEvents) &&
            snapshot.approvalEvents.slice(0, 3).map((item) => {
              const event = item as { id: string; reason: string; status: string };
              return (
                <p key={event.id}>
                  {t(`approval.${event.status}`)} {event.reason}
                </p>
              );
            })}
          {state.teacher.approval !== 'approved' && (
            <button
              type="button"
              disabled={busy || state.teacher.approval === 'pending' || !snapshot?.teacher}
              onClick={() => {
                dispatch({ type: 'submit-teacher' });
              }}
            >
              {t('submit-application')}
            </button>
          )}
          <TeacherDocuments />
        </Panel>
      )}
      <AccountSettings />
    </>
  );
};
export default TeacherEditor;
