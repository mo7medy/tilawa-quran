/* eslint-disable react-func/max-lines-per-function */

import { useRouter } from 'next/router';
import useTranslation from 'next-translate/useTranslation';
import useSWR from 'swr';

import { ACADEMY_PLANS, getAcademySubject } from '../../tilawa/academyPlans';
import type { AcademySubject, AcademyPlan } from '../../tilawa/academyPlans';

import AcademyIcon from './AcademyIcon';
import AcademyLink from './AcademyLink';
import AcademyPlanCard from './AcademyPlanCard';
import styles from './AcademyPricing.module.scss';

import { tilawaFetch } from '@/tilawa/backend/http';
import { rows } from '@/tilawa/backend/mappers';

const INCLUDED_ICONS = { personal: 'star', live: 'chat', bilingual: 'globe' } as const;

const AcademyPricing = (): JSX.Element => {
  const { t } = useTranslation('academy');
  const { t: accountText } = useTranslation('account');
  const live = process.env.NODE_ENV !== 'test';
  const { data: plans, error } = useSWR<AcademyPlan[]>(
    live ? 'tilawa-public-plans' : null,
    async () =>
      rows(await tilawaFetch('plans'))
        .filter((plan) => plan.active !== false)
        .map((plan) => ({
          id: plan.id as AcademyPlan['id'],
          lessons: Number(plan.lessons),
          monthlyPriceCents: Number(plan.price_cents),
          giftLessons: Number(plan.gift_lessons),
        })),
  );
  const catalogue = live ? plans ?? [] : ACADEMY_PLANS;
  const router = useRouter();
  const subject = getAcademySubject(router.query.subject);
  const handleSubjectChange = (nextSubject: AcademySubject): Promise<boolean> =>
    router.replace({ pathname: '/pricing', query: { subject: nextSubject } }, undefined, {
      shallow: true,
      scroll: false,
    });
  return (
    <div className={styles.page}>
      <section className={styles.intro} aria-labelledby="pricing-title">
        <p className={styles.eyebrow}>{t('pricing.eyebrow')}</p>
        <h1 id="pricing-title">
          {t('pricing.title')} <em>{t('pricing.title-focus')}</em>
        </h1>
        <p className={styles.subtitle}>{t('pricing.subtitle')}</p>
        <div className={styles.switch} role="group" aria-label={t('pricing.subject-label')}>
          {(['arabic', 'quran'] as const).map((item) => (
            <button
              type="button"
              key={item}
              aria-pressed={subject === item}
              onClick={() => handleSubjectChange(item)}
            >
              <AcademyIcon name="book" />
              {t(`pricing.subjects.${item}`)}
            </button>
          ))}
        </div>
        <p className={styles.subjectNote} aria-live="polite">
          {t(`pricing.subject-description.${subject}`)}
        </p>
      </section>
      <section className={styles.grid} aria-label={t('pricing.packages-label')}>
        {catalogue.map((plan) => (
          <AcademyPlanCard key={plan.id} plan={plan} subject={subject} />
        ))}
      </section>
      {live && !plans && (
        <p role={error ? 'alert' : 'status'}>{accountText(error ? 'backend-error' : 'loading')}</p>
      )}
      <p className={styles.previewNote}>{t('pricing.preview-note')}</p>
      <section className={styles.included} aria-labelledby="included-title">
        <div>
          <p className={styles.eyebrow}>{t('pricing.included-eyebrow')}</p>
          <h2 id="included-title">{t('pricing.included-title')}</h2>
        </div>
        {(['personal', 'live', 'bilingual'] as const).map((item) => (
          <div className={styles.includedItem} key={item}>
            <AcademyIcon name={INCLUDED_ICONS[item]} />
            <h3>{t(`pricing.included.${item}.title`)}</h3>
            <p>{t(`pricing.included.${item}.body`)}</p>
          </div>
        ))}
      </section>
      <section className={styles.faq} aria-labelledby="pricing-faq-title">
        <h2 id="pricing-faq-title">{t('pricing.faq-title')}</h2>
        <div>
          {(['difference', 'gift', 'teacher', 'payment'] as const).map((item) => (
            <details key={item}>
              <summary>{t(`pricing.faq.${item}.question`)}</summary>
              <p>{t(`pricing.faq.${item}.answer`)}</p>
            </details>
          ))}
        </div>
      </section>
      <div className={styles.bottomCta}>
        <span>{t('pricing.teacher-prompt')}</span>
        <AcademyLink href="/teachers">
          {t('pricing.meet-teachers')}
          <AcademyIcon name="arrow" />
        </AcademyLink>
      </div>
    </div>
  );
};

export default AcademyPricing;
