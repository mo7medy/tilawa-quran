import { useState } from 'react';

import { ACADEMY_PLANS, ACADEMY_LESSON_MINUTES } from '../../tilawa/academyPlans';
import { formatAccountDate } from '../../tilawa/account/time';

import styles from './Account.module.scss';
import { AccountLink, EmptyState, Panel, PreviewDialog } from './AccountUi';
import { useAccountUi } from './useAccountUi';

const StudentPackages = (): JSX.Element => {
  const { t, state, lang, price, dispatch, router, backend, teacherFor } = useAccountUi();
  const [selection, setSelection] = useState<string | null>(null);
  const items = router.query.view === 'empty' ? [] : state.subscriptions;
  return (
    <>
      {items.map((subscription) => {
        const academy = subscription.kind === 'academy';
        const plan = ACADEMY_PLANS.find((item) => item.id === subscription.planId);
        const teacher = subscription.teacherId ? teacherFor(subscription.teacherId) : state.teacher;
        const allowance =
          subscription.includedLessons ?? (academy ? plan.lessons : teacher.monthlyLessons);
        return (
          <Panel
            key={subscription.id}
            title={t(academy ? 'academy-package' : 'teacher-subscription')}
            icon="package"
          >
            <span className={styles.badge}>{t(`subject.${subscription.subject}`)}</span>
            <h3>
              {price(
                subscription.priceCents ??
                  (academy ? plan.monthlyPriceCents : teacher.monthlyPriceCents),
              )}{' '}
              · {t('monthly')}
            </h3>
            {!academy && <p>{teacher.publicProfile.displayName}</p>}
            <dl className={styles.details}>
              <div>
                <dt>{t('lessons-used')}</dt>
                <dd>
                  {subscription.used} / {allowance}
                </dd>
              </div>
              <div>
                <dt>{t('lessons-remaining')}</dt>
                <dd>
                  {subscription.remainingLessons ?? Math.max(0, allowance - subscription.used)}
                </dd>
              </div>
              <div>
                <dt>{t('lesson-duration')}</dt>
                <dd>
                  {t('duration', {
                    minutes:
                      subscription.durationMinutes ??
                      (academy
                        ? ACADEMY_LESSON_MINUTES
                        : teacher.publicProfile.sessionDurationMinutes),
                  })}
                </dd>
              </div>
              <div>
                <dt>{t('starts-at')}</dt>
                <dd>{formatAccountDate(subscription.startsAt, state.student.zone, lang)}</dd>
              </div>
              <div>
                <dt>{t('renews-at')}</dt>
                <dd>{formatAccountDate(subscription.renewsAt, state.student.zone, lang)}</dd>
              </div>
            </dl>
            {backend && (
              <p>
                {t('reserved-lessons')}: {subscription.reservedLessons ?? 0} · {t('expires')}:{' '}
                {subscription.expiresAt
                  ? formatAccountDate(subscription.expiresAt, state.student.zone, lang)
                  : t('profile-ui.not-added')}
              </p>
            )}
            {academy && plan.giftLessons > 0 && (
              <label htmlFor={`gift-${subscription.id}`} className={styles.field}>
                {t('gift-lesson')}
                <select
                  id={`gift-${subscription.id}`}
                  value={backend && !subscription.giftChosen ? '' : subscription.gift}
                  disabled={subscription.giftUsed || subscription.giftReserved}
                  onChange={(event) =>
                    dispatch({
                      type: 'gift',
                      id: subscription.id,
                      gift: event.target.value === 'memorization' ? 'memorization' : 'recitation',
                    })
                  }
                >
                  {backend && (
                    <option value="" disabled>
                      {t('select-gift')}
                    </option>
                  )}
                  <option value="recitation">{t('recitation')}</option>
                  <option value="memorization">{t('memorization')}</option>
                </select>
                <small>{t(subscription.giftUsed ? 'gift-used' : 'gift-available')}</small>
              </label>
            )}
            <div className={styles.actions}>
              {backend && <AccountLink to="/teachers">{t('book-from-package')}</AccountLink>}
              <button type="button" onClick={() => setSelection(subscription.id)}>
                {t('preview-renewal')}
              </button>
              <AccountLink
                to={academy ? '/pricing' : `/teachers/${state.teacher.publicProfile.slug}`}
              >
                {t('change-package')}
              </AccountLink>
            </div>
          </Panel>
        );
      })}
      {!items.length && (
        <Panel>
          <EmptyState
            icon="package"
            title={t('visual.packages-empty')}
            description={t('no-packages')}
          >
            <AccountLink to="/pricing" primary>
              {t('browse-packages')}
            </AccountLink>
          </EmptyState>
        </Panel>
      )}
      {selection && (
        <PreviewDialog title={t('preview-renewal')} onClose={() => setSelection(null)}>
          <p>{t('renewal-note')}</p>
          <AccountLink
            to={
              selection === 'academy-subscription'
                ? '/pricing'
                : `/teachers/${state.teacher.publicProfile.slug}`
            }
          >
            {t('view-options')}
          </AccountLink>
        </PreviewDialog>
      )}
    </>
  );
};
export default StudentPackages;
