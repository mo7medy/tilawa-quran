import styles from './Account.module.scss';
import { Panel } from './AccountUi';
import { useAccountUi } from './useAccountUi';

const AccountReviews = (): JSX.Element => {
  const { t, state, router, studentFor } = useAccountUi();
  const reviews =
    router.query.view === 'empty' ? [] : state.lessons.filter((lesson) => lesson.review);
  return (
    <Panel icon="star" title={t('reviews')}>
      {reviews.length ? (
        reviews.map((lesson) => (
          <article className={styles.listCard} key={lesson.id}>
            <div>
              <h3>{studentFor(lesson.studentId).name}</h3>
              <p aria-label={t('rating-value', { rating: lesson.review.rating })}>
                {'★'.repeat(lesson.review.rating)}
              </p>
              <p>{lesson.review.text}</p>
            </div>
          </article>
        ))
      ) : (
        <p className={styles.empty}>{t('no-reviews')}</p>
      )}
    </Panel>
  );
};
export default AccountReviews;
