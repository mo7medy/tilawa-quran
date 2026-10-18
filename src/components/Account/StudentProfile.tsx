import { useState } from 'react';

import styles from './Account.module.scss';
import AccountSettings from './AccountSettings';
import { Field, Panel, Status, TextField } from './AccountUi';
import PhotoField from './PhotoField';
import { useAccountUi } from './useAccountUi';

const StudentProfile = (): JSX.Element => {
  const { t, state, dispatch, busy } = useAccountUi();
  const [photo, setPhoto] = useState(state.student.photo);
  const [saved, setSaved] = useState(false);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState(false);
  return (
    <>
      <Panel title={t('personal-information')}>
        <form
          key={version}
          onChange={() => setSaved(false)}
          onSubmit={async (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const birthDate = String(form.get('birthDate'));
            if (
              ['name', 'country', 'goal', 'schedule'].some(
                (field) => !String(form.get(field)).trim(),
              ) ||
              !Number.isFinite(Date.parse(`${birthDate}T00:00:00Z`)) ||
              birthDate > new Date().toISOString().slice(0, 10)
            ) {
              setError(true);
              return;
            }
            const succeeded = await dispatch({
              type: 'student',
              value: {
                ...state.student,
                photo,
                name: String(form.get('name')).trim(),
                country: String(form.get('country')),
                birthDate,
                goal: String(form.get('goal')),
                schedule: String(form.get('schedule')),
              },
            });
            if (succeeded === false) return;
            setSaved(true);
            setError(false);
          }}
        >
          <PhotoField value={photo} onChange={setPhoto} />
          <div className={styles.twoColumns}>
            <Field
              label={t('full-name')}
              name="name"
              defaultValue={state.student.name}
              required
              maxLength={100}
              autoComplete="name"
            />
            <Field
              label={t('country')}
              name="country"
              defaultValue={state.student.country}
              required
              maxLength={80}
              autoComplete="country-name"
            />
            <Field
              label={t('birth-date')}
              name="birthDate"
              type="date"
              defaultValue={state.student.birthDate}
              required
            />
            <Field
              label={t('preferred-schedule')}
              name="schedule"
              defaultValue={state.student.schedule}
              required
              maxLength={200}
            />
          </div>
          <TextField label={t('learning-goal')} name="goal" value={state.student.goal} required />
          <div className={styles.actions}>
            <button type="submit" disabled={busy}>
              {t('save-preview')}
            </button>
            <button
              type="button"
              onClick={() => {
                setPhoto(state.student.photo);
                setVersion(version + 1);
                setSaved(false);
                setError(false);
              }}
            >
              {t('cancel-edit')}
            </button>
          </div>
          {saved && <Status>{t('saved')}</Status>}
          {error && <Status error>{t('invalid-profile')}</Status>}
        </form>
      </Panel>
      <AccountSettings />
    </>
  );
};
export default StudentProfile;
