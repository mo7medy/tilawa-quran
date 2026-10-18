import { useState } from 'react';

import buildTeacherDraft from '../../tilawa/account/teacherDraft';

import styles from './Account.module.scss';
import AccountSettings from './AccountSettings';
import { AccountLink, Panel, Status } from './AccountUi';
import PhotoField from './PhotoField';
import TeacherDocuments from './TeacherDocuments';
import TeacherFields from './TeacherFields';
import { useAccountUi } from './useAccountUi';

const TeacherEditor = (): JSX.Element => {
  const { t, state, dispatch, lang, backend, busy, snapshot } = useAccountUi();
  const [photo, setPhoto] = useState(state.teacher.publicProfile.photoUrl ?? '');
  const [message, setMessage] = useState('');
  const [version, setVersion] = useState(0);
  const locale = lang === 'ar' ? 'ar' : 'en';
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
        <form
          key={`${version}-${locale}`}
          onChange={() => setMessage('')}
          onSubmit={async (event) => {
            event.preventDefault();
            const value = buildTeacherDraft(
              new FormData(event.currentTarget),
              state.teacher,
              photo,
              lang,
            );
            if (!value) {
              setMessage('invalid-teacher');
              return;
            }
            if ((await dispatch({ type: 'teacher', value })) === false) return;
            setMessage('saved');
          }}
        >
          <PhotoField value={photo} onChange={setPhoto} />
          <TeacherFields />
          <div className={styles.actions}>
            <button type="submit" disabled={busy}>
              {t('save-preview')}
            </button>
            <button
              type="button"
              onClick={() => {
                setPhoto(state.teacher.publicProfile.photoUrl ?? '');
                setVersion(version + 1);
                setMessage('');
              }}
            >
              {t('cancel-edit')}
            </button>
          </div>
          {message && (
            <Status error={message.startsWith('invalid') || message === 'copy-failed'}>
              {t(message)}
            </Status>
          )}
        </form>
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
              disabled={busy || state.teacher.approval === 'pending'}
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
