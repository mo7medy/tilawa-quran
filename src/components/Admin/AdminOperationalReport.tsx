import { Panel } from '../Account/AccountUi';
import { useAccountUi } from '../Account/useAccountUi';

import consoleStyles from './AdminConsole.module.scss';
import AdminMetric from './AdminMetric';
import AdminPeriodFilter from './AdminPeriodFilter';
import styles from './AdminReports.module.scss';
import AdminReportState from './AdminReportState';
import AdminTrend from './AdminTrend';
import { useAdminReport } from './useAdminReport';

import type { AdminOverviewReport } from '@/tilawa/adminReportTypes';

const AdminOperationalReport = (): JSX.Element => {
  const { t, lang } = useAccountUi();
  const report = useAdminReport<AdminOverviewReport>('overview');
  const { data, error } = report;
  return (
    <>
      <AdminPeriodFilter controls={report} />
      {error || !data ? (
        <AdminReportState
          error={error}
          retry={() => {
            report.mutate();
          }}
        />
      ) : (
        <>
          <h2>{t('admin-reports.current-snapshot')}</h2>
          <div className={styles.metrics}>
            {(
              [
                'students',
                'approvedTeachers',
                'pendingTeachers',
                'lessonsToday',
                'activeSubscriptions',
                'endingSoon',
              ] as const
            ).map((key) => (
              <AdminMetric key={key} label={t(`admin-reports.metrics.${key}`)} value={data[key]} />
            ))}
          </div>
          <Panel title={t('admin-reports.alerts')}>
            <ul className={styles.alerts}>
              <li>{t('admin-reports.pending-teacher-alert', { count: data.pendingTeachers })}</li>
              <li>{t('admin-reports.ending-alert', { count: data.endingSoon })}</li>
              <li>{t('admin-reports.payment-alert', { count: data.pendingPayments })}</li>
            </ul>
          </Panel>
          <h2>{t('admin-reports.selected-period')}</h2>
          <div className={styles.metrics}>
            {(['newAccounts', 'completedLessons', 'cancelledLessons'] as const).map((key) => (
              <AdminMetric key={key} label={t(`admin-reports.metrics.${key}`)} value={data[key]} />
            ))}
          </div>
          <AdminTrend days={data.trend} />
          <Panel title={t('admin-reports.distribution')}>
            <p className={consoleStyles.subtle}>{t('admin-reports.distribution-hint')}</p>
            <div className={styles.metrics}>
              {(['arabic', 'quran'] as const).map((key) => (
                <AdminMetric
                  key={key}
                  label={t(`admin-reports.subjects.${key}`)}
                  value={data.subjects[key]}
                />
              ))}
              {data.plans.map((plan) => (
                <AdminMetric
                  key={plan.id}
                  label={t('admin-reports.plan-lessons', { count: plan.lessons })}
                  value={plan.count}
                />
              ))}
              <AdminMetric
                label={t('admin-console.teacher-offers')}
                value={data.teacherSubscriptions}
              />
            </div>
          </Panel>
          <p className={styles.timestamp}>
            {t('admin-reports.updated')}:{' '}
            {new Date(data.asOf).toLocaleString(lang === 'ar' ? 'ar' : 'en', { timeZone: 'UTC' })}{' '}
            UTC
          </p>
        </>
      )}
    </>
  );
};
export default AdminOperationalReport;
