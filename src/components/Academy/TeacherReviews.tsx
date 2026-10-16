import useTranslation from 'next-translate/useTranslation';

import type { AcademyTeacherProfile } from '../../tilawa/teachers';

import AcademyIcon from './AcademyIcon';
import styles from './TeacherProfile.module.scss';

interface TeacherReviewsProps {
  teacher: AcademyTeacherProfile;
}

const TeacherReviews = ({ teacher }: TeacherReviewsProps): JSX.Element => {
  const { t, lang } = useTranslation('academy');
  return (
    <>
      <section className={styles.panel} id="reviews">
        <h2>{t('marketplace.student-reviews')}</h2>
        {teacher.reviewCount > 0 && (
          <p className={styles.reviewScore}>
            <AcademyIcon name="star" />
            <strong>{teacher.rating.toFixed(1)}</strong>
            <span>{t('marketplace.review-count', { count: teacher.reviewCount })}</span>
          </p>
        )}
        {teacher.reviews?.length > 0 ? (
          <div className={styles.reviewList}>
            {teacher.reviews.map((review) => (
              <article key={review.id}>
                <strong>{review.name}</strong>
                <p aria-label={t('marketplace.rating-value', { value: review.rating })}>
                  {'★'.repeat(Math.round(review.rating))}
                </p>
                <p>{review.text[lang === 'ar' ? 'ar' : 'en']}</p>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.emptyReview}>
            <AcademyIcon name="chat" />
            <strong>{t('profile.no-reviews')}</strong>
            <p>{t('profile.reviews-note')}</p>
          </div>
        )}
      </section>
      <section className={styles.panel} aria-labelledby="lesson-ratings">
        <h2 id="lesson-ratings">{t('marketplace.lesson-rating')}</h2>
        <div className={styles.ratingGrid}>
          {(['reassurance', 'clarity', 'progress', 'preparation'] as const).map((key) => (
            <div key={key}>
              <strong>{teacher.lessonRatings?.[key]?.toFixed(1) ?? '—'}</strong>
              <AcademyIcon name={key === 'progress' ? 'arrow' : 'star'} />
              <span>{t(`marketplace.rating-areas.${key}`)}</span>
            </div>
          ))}
        </div>
        {!teacher.lessonRatings && <p className={styles.small}>{t('marketplace.ratings-empty')}</p>}
      </section>
    </>
  );
};

export default TeacherReviews;
