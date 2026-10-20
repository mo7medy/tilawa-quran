/* eslint-disable @typescript-eslint/naming-convention, no-nested-ternary -- Adapt SQL summaries to existing teacher UI contracts. */
import useSWR from 'swr';

import { useAccountUi } from '../Account/useAccountUi';

import { tilawaFetch } from '@/tilawa/backend/http';
import { rows } from '@/tilawa/backend/mappers';
import type { Row } from '@/tilawa/backend/mappers';

const useAdminConsoleData = (
  section: string | null,
  id: string | undefined,
  filter: string,
  search: string,
  page: number,
) => {
  const { snapshot, userId } = useAccountUi();
  const query = new URLSearchParams({
    status: section === 'overview' ? 'pending' : filter,
    search,
    page: String(page),
  });
  const path = id ? `admin/teacher/${id}` : `admin/lists/teachers?${query}`;
  const needed = section === 'teachers' || section === 'overview';
  const result = useSWR<Row>(
    snapshot?.adminVerified && userId && needed ? ['tilawa-admin-directory', userId, path] : null,
    () => tilawaFetch(path, undefined, userId),
  );
  const teachers = id
    ? result.data
      ? [result.data]
      : []
    : rows(result.data?.items).map((t) => ({
        ...t,
        user_id: t.id,
        display_name: t.name,
        approval: t.status,
      }));
  return {
    ...result,
    data:
      !needed || result.data !== undefined
        ? ({ settings: snapshot?.settings, teachers, total: result.data?.total ?? 0 } as Row)
        : undefined,
  };
};
export default useAdminConsoleData;
