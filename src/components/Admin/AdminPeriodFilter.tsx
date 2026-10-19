import { useId } from 'react';

import { useAccountUi } from '../Account/useAccountUi';

import styles from './AdminReports.module.scss';
import type { useAdminReport } from './useAdminReport';

import type { ReportPeriod } from '@/tilawa/adminReports';
import { shiftReportDate } from '@/tilawa/adminReports';

type PeriodControls = Pick<
  ReturnType<typeof useAdminReport>,
  | 'period'
  | 'range'
  | 'from'
  | 'to'
  | 'setFrom'
  | 'setTo'
  | 'choosePeriod'
  | 'applyCustom'
  | 'invalid'
>;
const AdminPeriodFilter = ({ controls }: { controls: PeriodControls }): JSX.Element => {
  const { t } = useAccountUi();
  const id = useId();
  return (
    <form
      className={styles.period}
      onSubmit={(e) => {
        e.preventDefault();
        controls.applyCustom();
      }}
    >
      <label htmlFor={`${id}-period`}>
        {t('admin-reports.period')}
        <select
          id={`${id}-period`}
          value={controls.period}
          onChange={(e) => controls.choosePeriod(e.target.value as ReportPeriod)}
        >
          {['today', 'week', 'month', 'custom'].map((v) => (
            <option key={v} value={v}>
              {t(`admin-reports.periods.${v}`)}
            </option>
          ))}
        </select>
      </label>
      {controls.period === 'custom' && (
        <>
          <label htmlFor={`${id}-from`}>
            {t('admin-reports.from')}
            <input
              id={`${id}-from`}
              type="date"
              value={controls.from}
              required
              onChange={(e) => controls.setFrom(e.target.value)}
            />
          </label>
          <label htmlFor={`${id}-to`}>
            {t('admin-reports.to')}
            <input
              type="date"
              id={`${id}-to`}
              value={controls.to}
              required
              onChange={(e) => controls.setTo(e.target.value)}
            />
          </label>
          <button type="submit">{t('admin-reports.apply')}</button>
        </>
      )}
      <p>{t('admin-reports.utc')}</p>
      <p>
        {t('admin-reports.applied-range', {
          from: controls.range.from,
          to: shiftReportDate(controls.range.until, -1),
        })}
      </p>
      {controls.invalid && <p role="alert">{t('admin-reports.invalid-range')}</p>}
    </form>
  );
};
export default AdminPeriodFilter;
