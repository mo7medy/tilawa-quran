import useTranslation from 'next-translate/useTranslation';

import type { AcademyTeacherProfile } from '../../tilawa/teachers';

interface TeacherPriceProps {
  teacher: AcademyTeacherProfile;
}

const TeacherPrice = ({ teacher }: TeacherPriceProps): JSX.Element => {
  const { t, lang } = useTranslation('academy');
  return (
    <div>
      <strong>
        {teacher.sessionPriceCents === null
          ? t('profile.price-pending')
          : new Intl.NumberFormat(lang === 'ar' ? 'ar' : 'en', {
              style: 'currency',
              currency: 'USD',
            }).format(teacher.sessionPriceCents / 100)}
      </strong>
      <small>{t('marketplace.per-lesson', { count: teacher.sessionDurationMinutes })}</small>
    </div>
  );
};

export default TeacherPrice;
