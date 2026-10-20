import { useCallback, useEffect, useMemo } from 'react';

import { useRouter } from 'next/router';
import useSWR from 'swr';

import { getBrowserSupabase } from '@/lib/supabase/browser';
import { accountReadRoute, accountViewUrl } from '@/tilawa/account/readRoute';
import { tilawaFetch } from '@/tilawa/backend/http';
import { rows } from '@/tilawa/backend/mappers';
import type { Row } from '@/tilawa/backend/mappers';

/* eslint-disable @typescript-eslint/naming-convention -- Realtime database table names. */
const TABLE_VIEWS: Record<string, string[]> = {
  direct_conversations: ['messages'],
  direct_messages: ['messages'],
  notifications: ['notifications'],
  booking_requests: ['requests', 'students', 'teachers'],
  lessons: ['home', 'dashboard', 'lessons', 'lesson', 'students', 'reviews'],
};
const useAccountReads = (userId?: string) => {
  const router = useRouter();
  const route = accountReadRoute(router.asPath, router.locales);
  const url = route ? accountViewUrl(route) : '';
  const base = useSWR<Row>(
    userId ? ['tilawa-account', userId] : null,
    () => tilawaFetch('account', undefined, userId),
    { refreshInterval: 540000 },
  );
  const page = useSWR<Row>(
    userId && url ? ['tilawa-view', userId, url] : null,
    () => tilawaFetch(url, undefined, userId),
    { refreshInterval: 540000 },
  );
  const refreshBase = base.mutate;
  const refreshPage = page.mutate;
  const view = route?.view;
  const refresh = useCallback(async (): Promise<void> => {
    await Promise.all([refreshBase(), refreshPage()]);
  }, [refreshBase, refreshPage]);
  useEffect(() => {
    if (!userId) return undefined;
    const client = getBrowserSupabase();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let baseDirty = false;
    let pageDirty = false;
    const channel = client.channel(`account-${userId}`);
    Object.entries(TABLE_VIEWS).forEach(([table, views]) => {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        baseDirty ||= table === 'notifications';
        pageDirty ||= !!view && views.includes(view);
        if (timer) return;
        timer = setTimeout(() => {
          if (baseDirty) refreshBase();
          if (pageDirty) refreshPage();
          baseDirty = false;
          pageDirty = false;
          timer = undefined;
        }, 150);
      });
    });
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') refresh();
    });
    return () => {
      if (timer) clearTimeout(timer);
      client.removeChannel(channel);
    };
  }, [userId, view, refreshBase, refreshPage, refresh]);
  const data = useMemo(() => {
    if (!base.data || (url && !page.data)) return undefined;
    const own = rows(base.data.teachers);
    const related = rows(page.data?.teachers);
    return {
      ...base.data,
      ...page.data,
      teachers: Array.from(new Map([...own, ...related].map((t) => [t.user_id, t])).values()),
    };
  }, [base.data, page.data, url]);
  return { data, error: base.error || page.error, refresh };
};
export default useAccountReads;
