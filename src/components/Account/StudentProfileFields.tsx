import { useEffect, useState } from 'react';

import styles from './Account.module.scss';
import { Field, Panel } from './AccountUi';
import PhotoField from './PhotoField';
import { useAccountUi } from './useAccountUi';

import { accountTimeZones, browserTimeZone, countryOptions } from '@/tilawa/account/profile';
import type { StudentAccount } from '@/tilawa/account/types';

const StudentProfileFields = ({
  draft,
  onChange,
}: {
  draft: StudentAccount;
  onChange: (draft: StudentAccount) => void;
}): JSX.Element => {
  const { t, lang } = useAccountUi();
  const [detected, setDetected] = useState('');
  useEffect(() => setDetected(browserTimeZone()), []);
  const set = (key: keyof StudentAccount, value: string): void =>
    onChange({ ...draft, [key]: value });
  return (
    <>
      <Panel title={t('personal-information')}>
        <PhotoField value={draft.photo} onChange={(photo) => set('photo', photo)} isOptional />
        <div className={styles.twoColumns}>
          <Field
            label={t('full-name')}
            name="name"
            value={draft.name}
            onChange={(event) => set('name', event.target.value)}
            required
            maxLength={100}
            autoComplete="name"
          />
          <label className={styles.field} htmlFor="student-country">
            {t('country')}
            <select
              id="student-country"
              name="country"
              required
              value={draft.country}
              onChange={(event) => set('country', event.target.value)}
            >
              <option value="">{t('profile-ui.select-country')}</option>
              {countryOptions(lang, draft.country).map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <Field
            label={t('profile-ui.optional', { field: t('birth-date') })}
            name="birthDate"
            type="date"
            value={draft.birthDate}
            onChange={(event) => set('birthDate', event.target.value)}
            max={new Date().toISOString().slice(0, 10)}
          />
        </div>
      </Panel>
      <Panel title={t('profile-ui.preferences')}>
        <label className={styles.field} htmlFor="student-goal">
          {t('profile-ui.optional', { field: t('learning-goal') })}
          <textarea
            id="student-goal"
            name="goal"
            rows={3}
            maxLength={1500}
            value={draft.goal}
            onChange={(event) => set('goal', event.target.value)}
          />
        </label>
        <Field
          label={t('profile-ui.optional', { field: t('preferred-schedule') })}
          name="schedule"
          value={draft.schedule}
          onChange={(event) => set('schedule', event.target.value)}
          maxLength={200}
        />
        <label className={styles.field} htmlFor="student-zone">
          {t('timezone')}
          <select
            id="student-zone"
            value={draft.zone}
            onChange={(event) => set('zone', event.target.value)}
          >
            {accountTimeZones(draft.zone, detected).map((zone) => (
              <option key={zone}>{zone}</option>
            ))}
          </select>
        </label>
        <small>{t('profile-ui.schedule-zone')}</small>
        {detected && detected !== draft.zone && (
          <button type="button" className={styles.secondary} onClick={() => set('zone', detected)}>
            {t('profile-ui.use-device-zone', { zone: detected })}
          </button>
        )}
      </Panel>
    </>
  );
};

export default StudentProfileFields;
