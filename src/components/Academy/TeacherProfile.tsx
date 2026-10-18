import { useEffect, useState } from 'react';

import { useRouter } from 'next/router';
import useTranslation from 'next-translate/useTranslation';

import type { AcademyTeacherProfile } from '../../tilawa/teachers';
import { useOptionalAccountPreview } from '../Account/AccountPreviewProvider';

import AcademyIcon from './AcademyIcon';
import AcademyLink from './AcademyLink';
import TeacherBookingPreview from './TeacherBookingPreview';
import TeacherIntroMedia from './TeacherIntroMedia';
import TeacherMessagePreview from './TeacherMessagePreview';
import TeacherPreviewDialog from './TeacherPreviewDialog';
import TeacherPrice from './TeacherPrice';
import styles from './TeacherProfile.module.scss';
import TeacherProfileDetails from './TeacherProfileDetails';
import TeacherProfileHeader from './TeacherProfileHeader';

interface TeacherProfileProps {
  teacher: AcademyTeacherProfile;
  referenceDate: string;
}

const TeacherProfile = ({ teacher, referenceDate }: TeacherProfileProps): JSX.Element => {
  const { t } = useTranslation('academy');
  const router = useRouter();
  const account = useOptionalAccountPreview();
  const message = (): void => {
    if (account?.backend && !teacher.isIllustrative) {
      router.push(`/profile/messages?peer=${teacher.id}`);
    } else setDialog('message');
  };
  const [dialog, setDialog] = useState<'booking' | 'message' | null>(null);
  const action = router.query?.action;
  useEffect(() => {
    if (action === 'booking' || action === 'message') setDialog(action);
  }, [action]);
  return (
    <div className={styles.page} data-testid="teacher-profile">
      <AcademyLink href="/teachers" className={styles.back}>
        {t('profile.back')}
      </AcademyLink>
      {teacher.isIllustrative && (
        <p className={styles.previewNotice}>{t('teachers.preview-notice')}</p>
      )}
      <div className={styles.layout}>
        <TeacherProfileHeader teacher={teacher} onMessage={message} />
        <aside className={styles.sidebar}>
          <TeacherIntroMedia teacher={teacher} />
          <div className={styles.sidebarActions}>
            <div className={styles.sidebarPrice}>
              <TeacherPrice teacher={teacher} />
            </div>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => setDialog('booking')}
            >
              {t('profile.choose-lesson')}
              <AcademyIcon name="arrow" />
            </button>
            <button type="button" className={styles.secondaryButton} onClick={message}>
              <AcademyIcon name="chat" />
              {t('marketplace.message')}
            </button>
            <p>{t('marketplace.booking-hint')}</p>
          </div>
        </aside>
        <TeacherProfileDetails teacher={teacher} onBook={() => setDialog('booking')} />
      </div>
      <div className={styles.mobileBooking}>
        <TeacherPrice teacher={teacher} />
        <button type="button" className={styles.primaryButton} onClick={() => setDialog('booking')}>
          {t('profile.choose-lesson')}
          <AcademyIcon name="arrow" />
        </button>
      </div>
      {dialog && (
        <TeacherPreviewDialog
          label={t(dialog === 'booking' ? 'profile.booking-title' : 'marketplace.message')}
          onClose={() => setDialog(null)}
        >
          {dialog === 'booking' ? (
            <TeacherBookingPreview teacher={teacher} referenceDate={referenceDate} />
          ) : (
            <TeacherMessagePreview teacher={teacher} />
          )}
        </TeacherPreviewDialog>
      )}
    </div>
  );
};

export default TeacherProfile;
