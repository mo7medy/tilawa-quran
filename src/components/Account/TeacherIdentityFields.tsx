import styles from './Account.module.scss';
import { Field } from './AccountUi';
import { useAccountUi } from './useAccountUi';

const TeacherIdentityFields = (): JSX.Element => {
  const { t, state, backend } = useAccountUi();
  const { teacher } = state;
  const profile = teacher.publicProfile;
  return (
    <>
      <div className={styles.twoColumns}>
        <Field
          label={t('full-name')}
          name="name"
          defaultValue={profile.displayName}
          required
          maxLength={100}
        />
        <Field
          label={t('country')}
          name="country"
          defaultValue={teacher.country}
          required
          maxLength={80}
        />
        <Field
          label={t('email')}
          name="email"
          defaultValue={teacher.email}
          type="email"
          required
          disabled={backend}
        />
        <label className={styles.field} htmlFor="teacher-gender">
          {t('gender')}
          <select id="teacher-gender" name="gender" defaultValue={profile.gender}>
            <option value="male">{t('male')}</option>
            <option value="female">{t('female')}</option>
          </select>
        </label>
        <Field
          label={t('phone')}
          name="phone"
          defaultValue={teacher.phone}
          type="tel"
          required
          maxLength={30}
        />
        <Field
          label={t('languages')}
          name="languages"
          defaultValue={profile.teachingLanguages.join(', ')}
          required
          maxLength={150}
        />
      </div>
      <fieldset>
        <legend>{t('specialties')}</legend>
        {['arabic_for_non_arabic_speakers', 'tajweed', 'memorization'].map((specialty) => (
          <label
            htmlFor={`teacher-specialty-${specialty}`}
            key={specialty}
            className={styles.check}
          >
            <input
              id={`teacher-specialty-${specialty}`}
              type="checkbox"
              name="specialty"
              value={specialty}
              defaultChecked={profile.specialties.includes(
                specialty as (typeof profile.specialties)[number],
              )}
            />
            {t(`specialty.${specialty}`)}
          </label>
        ))}
      </fieldset>
    </>
  );
};
export default TeacherIdentityFields;
