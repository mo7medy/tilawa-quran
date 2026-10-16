import useTranslation from 'next-translate/useTranslation';

import type { AcademyTeacherProfile } from '../../tilawa/teachers';

import styles from './TeacherProfile.module.scss';

interface TeacherIntroMediaProps {
  teacher: AcademyTeacherProfile;
}

const TeacherIntroMedia = ({ teacher }: TeacherIntroMediaProps): JSX.Element => {
  const { t } = useTranslation('academy');
  return (
    <div className={styles.media}>
      {teacher.introductionVideoUrl ? (
        <video
          controls
          preload="none"
          poster={teacher.photoUrl}
          aria-label={t('profile.intro-video')}
        >
          <source src={teacher.introductionVideoUrl} />
          <track
            kind="captions"
            src={teacher.introductionCaptionsUrl}
            srcLang={teacher.introductionVideoLanguage ?? 'en'}
            default
          />
          {t('profile.video-fallback')}
        </video>
      ) : (
        <div className={styles.videoPlaceholder}>
          <img src={teacher.photoUrl} alt="" width={600} height={450} />
          <div>
            <strong>{t('marketplace.meet-teacher')}</strong>
            <small>{t('marketplace.video-empty')}</small>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherIntroMedia;
