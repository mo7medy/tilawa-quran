import { useEffect, useRef, useState } from 'react';

import styles from './Account.module.scss';
import AccountAvatar from './AccountAvatar';
import { Panel, Status } from './AccountUi';
import profileStyles from './StudentProfile.module.scss';
import StudentProfileFields from './StudentProfileFields';
import StudentProfileView from './StudentProfileView';
import { useAccountUi } from './useAccountUi';

import { countryOptions, validStudentProfile } from '@/tilawa/account/profile';
import type { StudentAccount } from '@/tilawa/account/types';

const StudentProfile = (): JSX.Element => {
  const { t, state, dispatch, busy, lang } = useAccountUi();
  const [draft, setDraft] = useState<StudentAccount | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<'validation' | 'save' | null>(null);
  const [saving, setSaving] = useState(false);
  const pending = useRef(false);
  const editButton = useRef<HTMLButtonElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const wasEditing = useRef(false);
  const editing = !!draft;
  useEffect(() => {
    if (!wasEditing.current && editing) {
      formRef.current?.querySelector<HTMLInputElement>('[name="name"]')?.focus();
    }
    if (wasEditing.current && !editing) editButton.current?.focus();
    wasEditing.current = editing;
  }, [editing]);
  const { student } = state;
  return (
    <>
      <Panel>
        <div className={profileStyles.hero}>
          <AccountAvatar large name={student.name} photo={student.photo} />
          <div className={profileStyles.identity}>
            <span className={profileStyles.role}>{t('student')}</span>
            <h2>{student.name || t('profile')}</h2>
            <small>
              {countryOptions(lang, student.country).find(
                (option) => option.value === student.country,
              )?.label || t('profile-ui.not-added')}
            </small>
          </div>
          {!draft && (
            <button
              type="button"
              ref={editButton}
              onClick={() => {
                setDraft({ ...student });
                setError(null);
                setSaved(false);
              }}
            >
              {t('profile-ui.edit')}
            </button>
          )}
        </div>
      </Panel>
      {saved && <Status>{t('saved')}</Status>}
      {draft ? (
        <form
          ref={formRef}
          onSubmit={async (event) => {
            event.preventDefault();
            if (pending.current) return;
            if (!validStudentProfile(draft)) {
              setError('validation');
              return;
            }
            pending.current = true;
            setSaving(true);
            setError(null);
            try {
              const result = await dispatch({
                type: 'student',
                value: { ...draft, name: draft.name.trim(), country: draft.country.trim() },
              });
              if (result === false) {
                setError('save');
                return;
              }
              setDraft(null);
              setSaved(true);
            } catch {
              setError('save');
            } finally {
              pending.current = false;
              setSaving(false);
            }
          }}
        >
          <fieldset className={styles.profileFields} disabled={busy || saving}>
            <StudentProfileFields
              draft={draft}
              onChange={(value) => {
                setDraft(value);
                setError(null);
              }}
            />
          </fieldset>
          {error && (
            <Status error>
              {t(error === 'validation' ? 'invalid-profile' : 'profile-ui.save-failed')}
            </Status>
          )}
          <div className={profileStyles.saveBar}>
            <button type="submit" disabled={busy || saving}>
              {t(saving ? 'saving' : 'save-preview')}
            </button>
            <button
              type="button"
              className={styles.secondary}
              disabled={saving}
              onClick={() => {
                setDraft(null);
                setError(null);
                setSaved(false);
              }}
            >
              {t('cancel-edit')}
            </button>
          </div>
        </form>
      ) : (
        <StudentProfileView />
      )}
    </>
  );
};
export default StudentProfile;
