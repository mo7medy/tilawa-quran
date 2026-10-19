import styles from './Account.module.scss';
import { Field, TextField } from './AccountUi';
import { useAccountUi } from './useAccountUi';

const TeacherPresentationFields = (): JSX.Element => {
  const { t, state, lang } = useAccountUi();
  const profile = state.teacher.publicProfile;
  const locale = lang === 'ar' ? 'ar' : 'en';
  return (
    <>
      <TextField label={t('bio')} name="bio" value={profile.biography?.[locale]} required />
      <TextField
        label={t('teaching-style')}
        name="approach"
        value={profile.approach?.[locale]}
        required
      />
      <TextField
        label={t('qualifications')}
        name="qualifications"
        value={profile.qualifications.map((item) => item[locale]).join('\n')}
        required
      />
      <Field
        label={t('intro-video')}
        name="video"
        type="url"
        defaultValue={profile.introductionVideoUrl ?? ''}
      />
      <p className={styles.muted}>{t('video-hint')}</p>
    </>
  );
};
export default TeacherPresentationFields;
