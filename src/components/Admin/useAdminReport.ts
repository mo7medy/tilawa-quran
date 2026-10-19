/* eslint-disable import/prefer-default-export -- Named hook shared by report screens. */
import { useState } from 'react';

import useSWR from 'swr';

import { useAccountUi } from '../Account/useAccountUi';

import { periodRange, reportDate, shiftReportDate, validReportRange } from '@/tilawa/adminReports';
import type { ReportPeriod } from '@/tilawa/adminReports';
import { tilawaFetch } from '@/tilawa/backend/http';

export const useAdminReport = <T>(section: 'overview' | 'finance') => {
  const { userId, snapshot } = useAccountUi();
  const [period, setPeriod] = useState<ReportPeriod>('month');
  const [range, setRange] = useState(() => periodRange('month'));
  const [from, setFrom] = useState(range.from);
  const [to, setTo] = useState(shiftReportDate(range.until, -1));
  const [invalid, setInvalid] = useState(false);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('all');
  const [kind, setKind] = useState('all');
  const query = new URLSearchParams({ ...range, page: String(page), status, kind });
  const path = `admin/reports/${section}?${query}`;
  const report = useSWR<T>(snapshot?.isAdmin && userId ? [path, userId] : null, () =>
    tilawaFetch<T>(path, undefined, userId),
  );
  const choosePeriod = (value: ReportPeriod): void => {
    setPeriod(value);
    setInvalid(false);
    setPage(1);
    if (value !== 'custom') {
      const next = periodRange(value);
      setRange(next);
      setFrom(next.from);
      setTo(shiftReportDate(next.until, -1));
    }
  };
  const applyCustom = (): void => {
    if (!reportDate(from) || !reportDate(to)) {
      setInvalid(true);
      return;
    }
    let until: string;
    try {
      until = shiftReportDate(to, 1);
    } catch {
      setInvalid(true);
      return;
    }
    const next = { from, until };
    if (!validReportRange(next)) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setRange(next);
    setPage(1);
  };
  return {
    ...report,
    period,
    range,
    from,
    to,
    setFrom,
    setTo,
    choosePeriod,
    applyCustom,
    invalid,
    path,
    page,
    setPage,
    status,
    kind,
    chooseStatus: (value: string) => {
      setStatus(value);
      setPage(1);
    },
    chooseKind: (value: string) => {
      setKind(value);
      setPage(1);
    },
  };
};
