import styles from './Account.module.scss';
import { AccountLink, EmptyState, Panel } from './AccountUi';
import { useAccountUi } from './useAccountUi';

import { ACADEMY_PLANS } from '@/tilawa/academyPlans';
import { readAccountOverview } from '@/tilawa/account/overview';
import { formatAccountDate } from '@/tilawa/account/time';

const StudentOverviewPanels = (): JSX.Element => {
  const { t, state, snapshot, lang, teacherFor } = useAccountUi();
  const active = state.subscriptions.filter(
    (item) => item.status === 'active' || (!item.status && Date.parse(item.renewsAt) > Date.now()),
  );
  const recent = readAccountOverview(snapshot).recentConversations;
  return (
    <div className={styles.twoColumns}>
      <Panel title={t('profile-ui.active-packages')} icon="package">
        {!active.length && (
          <EmptyState description={t('profile-ui.no-active-package')}>
            <AccountLink to="/pricing">{t('profile-ui.explore-packages')}</AccountLink>
          </EmptyState>
        )}
        {active.map((item) => (
          <article key={item.id} className={styles.summaryItem}>
            <span className={styles.badge}>
              {t(item.kind === 'academy' ? 'academy-package' : 'teacher-subscription')}
            </span>
            <h3>{t(`subject.${item.subject}`)}</h3>
            <p>
              {t('lessons-remaining')}:{' '}
              <strong>
                {item.remainingLessons ??
                  Math.max(
                    0,
                    (item.includedLessons ??
                      (item.kind === 'academy'
                        ? ACADEMY_PLANS.find((plan) => plan.id === item.planId)?.lessons ?? 0
                        : teacherFor(item.teacherId || '').monthlyLessons)) - item.used,
                  )}
              </strong>
            </p>
            <small>
              {t('expires')}:{' '}
              {formatAccountDate(item.expiresAt || item.renewsAt, state.student.zone, lang)}
            </small>
          </article>
        ))}
        {!!active.length && (
          <AccountLink to="/profile/packages">{t('profile-ui.package-details')}</AccountLink>
        )}
      </Panel>
      <Panel title={t('profile-ui.recent-conversations')} icon="chat">
        {!recent.length && <EmptyState description={t('no-messages')} />}
        {recent.map((item) => (
          <article key={item.id} className={styles.summaryItem}>
            <h3>{item.peerName || t('profile-ui.conversation')}</h3>
            <p>{item.preview}</p>
            {item.createdAt && (
              <small>{formatAccountDate(item.createdAt, state.student.zone, lang)}</small>
            )}
            {item.unread > 0 && (
              <span className={styles.badge}>
                {t('profile-ui.unread-messages', { count: item.unread })}
              </span>
            )}
            <AccountLink to={`/profile/messages?conversation=${item.id}`}>
              {t('profile-ui.open-conversation')}
            </AccountLink>
          </article>
        ))}
        <AccountLink to="/profile/messages">{t('messages')}</AccountLink>
      </Panel>
    </div>
  );
};

export default StudentOverviewPanels;
