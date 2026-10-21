import { useCallback, useEffect, useMemo } from 'react';

import { useRouter } from 'next/router';
import useSWR from 'swr';

import useMessageReadCache from './useMessageReadCache';

import { getBrowserSupabase } from '@/lib/supabase/browser';
import { accountReadRoute, accountViewUrl } from '@/tilawa/account/readRoute';
import { tilawaFetch } from '@/tilawa/backend/http';
import type { Row } from '@/tilawa/backend/mappers';
import { mergeAccountReads } from '@/tilawa/backend/mergeAccountReads';

/* eslint-disable @typescript-eslint/naming-convention -- Realtime database table names. */
const TABLE_VIEWS: Record<string, string[]> = {
  profiles: ['profile'],
  student_profiles: ['profile'],
  student_subscriptions: ['home', 'packages'],
  subscription_credit_ledger: ['home', 'packages'],
  direct_conversations: ['home', 'messages'],
  direct_messages: ['home', 'messages'],
  direct_conversation_user_states: ['home', 'messages'],
  notifications: ['notifications'],
  booking_requests: ['requests', 'students', 'teachers'],
  lessons: ['home', 'dashboard', 'lessons', 'lesson', 'students', 'reviews'],
};
const IDENTITY_TABLES = new Set([
  'notifications',
  'profiles',
  'student_profiles',
  'direct_messages',
  'direct_conversations',
  'direct_conversation_user_states',
]);
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
  const pageData = useMessageReadCache(userId, view, page.data);
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
        baseDirty ||= IDENTITY_TABLES.has(table);
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
    if (!base.data) return undefined;
    return mergeAccountReads(base.data, url ? pageData : undefined);
  }, [base.data, pageData, url]);
  return {
    data,
    loading: !base.data || (!!url && !pageData && !page.error),
    readError: base.error || (url ? page.error : undefined),
    error: base.error || (url ? page.error : undefined),
    refresh,
  };
};
export default useAccountReads;
