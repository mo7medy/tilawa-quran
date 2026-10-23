/* eslint-disable react-func/max-lines-per-function */
import { useId, useState } from 'react';

import useTranslation from 'next-translate/useTranslation';

import {
  ACADEMY_LESSON_MINUTES,
  formatAcademyPrice,
  getAcademyRegistrationUrl,
} from '../../tilawa/academyPlans';
import type { AcademyGift, AcademyPlan, AcademySubject } from '../../tilawa/academyPlans';

import AcademyIcon from './AcademyIcon';
import AcademyLink from './AcademyLink';
import styles from './AcademyPricing.module.scss';

interface AcademyPlanCardProps {
  plan: AcademyPlan;
  subject: AcademySubject;
}

const AcademyPlanCard = ({ plan, subject }: AcademyPlanCardProps): JSX.Element => {
  const { t } = useTranslation('academy');
  const [gift, setGift] = useState<AcademyGift>('recitation');
  const giftId = useId();
  const isFeatured = plan.id === 'progress';
  return (
    <article className={`${styles.card} ${isFeatured ? styles.featured : ''}`}>
      <div className={styles.planIcon}>
        <AcademyIcon name={isFeatured ? 'sparkles' : 'package'} size={24} />
      </div>
      <div className={styles.cardIntro}>
        <div className={styles.cardLabel}>
          <span>{t(`pricing.plans.${plan.id}.name`)}</span>
          {isFeatured && <span className={styles.badge}>{t('pricing.recommended')}</span>}
        </div>
        <h2>{t(`pricing.plans.${plan.id}.lesson-count`)}</h2>
        <p>{t(`pricing.plans.${plan.id}.description`)}</p>
      </div>
      <div className={styles.price}>
        <strong>
          <bdi dir="ltr">{formatAcademyPrice(plan.monthlyPriceCents)}</bdi>
        </strong>
        <span>{t('pricing.per-month')}</span>
      </div>
      <p className={styles.currency}>{t('pricing.usd')}</p>
      <ul className={styles.features}>
        <li>
          <AcademyIcon name="book" />
          {t(`pricing.subjects.${subject}`)}
        </li>
        <li>
          <AcademyIcon name="clock" />
          {t('pricing.duration', { minutes: ACADEMY_LESSON_MINUTES })}
        </li>
        <li>
          <AcademyIcon name="globe" />
          {t('pricing.private-lessons')}
        </li>
        <li>
          <AcademyIcon name="check" />
          {t('pricing.all-teachers')}
        </li>
      </ul>
      <div className={plan.giftLessons ? styles.gift : styles.noGift}>
        {plan.giftLessons ? (
          <>
            <label htmlFor={giftId}>
              <AcademyIcon name="star" />
              {t('pricing.gift-title')}
            </label>
            <select
              id={giftId}
              value={gift}
              onChange={(event) => setGift(event.target.value as AcademyGift)}
            >
              <option value="recitation">{t('pricing.gifts.recitation')}</option>
              <option value="memorization">{t('pricing.gifts.memorization')}</option>
            </select>
            <p>{t('pricing.gift-extra')}</p>
          </>
        ) : (
          <p>{t('pricing.no-gift')}</p>
        )}
      </div>
      <AcademyLink
        href={getAcademyRegistrationUrl(plan, subject, gift)}
        className={`${styles.choose} ${isFeatured ? styles.chooseFeatured : ''}`}
        ariaLabel={t('pricing.choose-label', {
          lessons: t(`pricing.plans.${plan.id}.lesson-count`),
          subject: t(`pricing.subjects.${subject}`),
        })}
      >
        {t('pricing.choose')}
        <AcademyIcon name="arrow" />
      </AcademyLink>
    </article>
  );
};

export default AcademyPlanCard;
