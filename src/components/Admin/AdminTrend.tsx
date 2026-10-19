import { useId } from 'react';

import { Panel } from '../Account/AccountUi';
import { useAccountUi } from '../Account/useAccountUi';

import consoleStyles from './AdminConsole.module.scss';
import styles from './AdminReports.module.scss';

import type { ReportDay } from '@/tilawa/adminReportTypes';

const AdminTrend = ({ days }: { days: ReportDay[] }): JSX.Element => {
  const { t } = useAccountUi();
  const id = useId();
  const max = Math.max(1, ...days.flatMap((d) => [d.accounts, d.lessons]));
  const points = (key: 'accounts' | 'lessons'): string =>
    days
      .map(
        (d, i) => `${20 + (i * 860) / Math.max(1, days.length - 1)},${180 - (d[key] * 150) / max}`,
      )
      .join(' ');
  return (
    <Panel title={t('admin-reports.trend')}>
      <div className={styles.legend}>
        <span>{t('admin-reports.accounts-line')}</span>
        <span>{t('admin-reports.lessons-line')}</span>
      </div>
      <svg className={styles.chart} viewBox="0 0 900 200" role="img" aria-labelledby={id}>
        <title id={id}>{t('admin-reports.trend-description')}</title>
        {[30, 105, 180].map((y) => (
          <line key={y} x1="20" x2="880" y1={y} y2={y} stroke="var(--tilawa-border)" />
        ))}
        <polyline
          points={points('accounts')}
          fill="none"
          stroke="var(--tilawa-link)"
          strokeWidth="3"
        />
        <polyline
          points={points('lessons')}
          fill="none"
          stroke="var(--tilawa-ink)"
          strokeDasharray="7 5"
          strokeWidth="2"
        />
      </svg>
      <div className={styles.chartDates}>
        <span dir="ltr">{days[0]?.day}</span>
        <span dir="ltr">{days[days.length - 1]?.day}</span>
      </div>
      <details>
        <summary>{t('admin-reports.chart-table')}</summary>
        <div className={consoleStyles.tableWrap}>
          <table className={consoleStyles.table}>
            <thead>
              <tr>
                {['day', 'accounts', 'lessons'].map((key) => (
                  <th scope="col" key={key}>
                    {t(`admin-reports.${key}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map((d) => (
                <tr key={d.day}>
                  <td data-label={t('admin-reports.day')}>{d.day}</td>
                  <td data-label={t('admin-reports.accounts')}>{d.accounts}</td>
                  <td data-label={t('admin-reports.lessons')}>{d.lessons}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </Panel>
  );
};
export default AdminTrend;
