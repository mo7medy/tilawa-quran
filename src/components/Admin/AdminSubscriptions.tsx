import { Panel } from '../Account/AccountUi';
import { useAccountUi } from '../Account/useAccountUi';

import styles from './AdminConsole.module.scss';
import AdminPlannedSection from './AdminPlannedSection';

import { ACADEMY_LESSON_MINUTES, ACADEMY_PLANS, formatAcademyPrice } from '@/tilawa/academyPlans';

const AdminSubscriptions = (): JSX.Element => {
  const { t } = useAccountUi();
  return (
    <>
      <Panel title={t('admin-console.platform-packages')}>
        <p className={styles.subtle}>{t('admin-console.packages-hint')}</p>
        <div className={styles.plans}>
          {ACADEMY_PLANS.map((plan) => (
            <article key={plan.id}>
              <h3>{t('admin-console.package-lessons', { count: plan.lessons })}</h3>
              <strong>{formatAcademyPrice(plan.monthlyPriceCents)}</strong>
              <p>{t('admin-console.lesson-minutes', { count: ACADEMY_LESSON_MINUTES })}</p>
              <p>
                {t(plan.giftLessons ? 'admin-console.gift-included' : 'admin-console.base-package')}
              </p>
            </article>
          ))}
        </div>
      </Panel>
      <AdminPlannedSection section="subscriptions" />
      <Panel title={t('admin-console.teacher-offers')}>
        <p>{t('admin-console.teacher-offers-hint')}</p>
        <p className={styles.stageNote}>{t('admin-console.payments-deferred')}</p>
      </Panel>
    </>
  );
};
export default AdminSubscriptions;
