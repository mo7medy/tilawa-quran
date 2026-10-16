/* eslint-disable react-func/max-lines-per-function */
import useTranslation from 'next-translate/useTranslation';

import { ACADEMY_LESSON_MINUTES, formatAcademyPrice } from '../../tilawa/academyPlans';
import type { AcademyPlanSelection } from '../../tilawa/academyPlans';

import styles from './AcademyAccount.module.scss';
import AcademyIcon from './AcademyIcon';
import AcademyLink from './AcademyLink';

interface AcademyAccountSummaryProps {
  selection: AcademyPlanSelection | null;
}

const AcademyAccountSummary = ({ selection }: AcademyAccountSummaryProps): JSX.Element => {
  const { t } = useTranslation('academy');
  return (
    <aside className={styles.story}>
      <p className={styles.eyebrow}>{t('account.eyebrow')}</p>
      <h2>
        {t('account.story-title')} <em>{t('account.story-focus')}</em>
      </h2>
      <p className={styles.storyDescription}>{t('account.story-description')}</p>
      <figure className={styles.storyImage}>
        <img
          src="/tilawa/academy/hero-teacher-young.webp"
          alt={t('hero.image-alt')}
          width={1100}
          height={733}
        />
        <figcaption>
          <AcademyIcon name="globe" />
          {t('account.live-caption')}
        </figcaption>
      </figure>
      {selection ? (
        <div className={styles.selection} aria-label={t('account.selected-plan')}>
          <div className={styles.selectionHeading}>
            <span>{t('account.selected-plan')}</span>
            <AcademyLink href={`/pricing?subject=${selection.subject}`}>
              {t('account.change-plan')}
            </AcademyLink>
          </div>
          <strong>
            {t(`pricing.plans.${selection.plan.id}.lesson-count`)} ·{' '}
            {t(`pricing.subjects.${selection.subject}`)}
          </strong>
          <div className={styles.selectionPrice}>
            <b>
              <bdi dir="ltr">{formatAcademyPrice(selection.plan.monthlyPriceCents)}</bdi>
            </b>
            <span>{t('pricing.per-month')}</span>
          </div>
          <p>{t('pricing.duration', { minutes: ACADEMY_LESSON_MINUTES })}</p>
          {selection.gift && (
            <p className={styles.selectedGift}>
              <AcademyIcon name="star" />
              {t('account.gift-summary', { gift: t(`pricing.gifts.${selection.gift}`) })}
            </p>
          )}
        </div>
      ) : (
        <div className={styles.storyBenefits}>
          {['personal', 'live', 'bilingual'].map((key) => (
            <p key={key}>
              <AcademyIcon name="check" />
              {t(`pricing.included.${key}.title`)}
            </p>
          ))}
          <AcademyLink href="/pricing">
            {t('account.explore-plans')}
            <AcademyIcon name="arrow" />
          </AcademyLink>
        </div>
      )}
    </aside>
  );
};

export default AcademyAccountSummary;
