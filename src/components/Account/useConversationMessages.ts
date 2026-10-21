import { useEffect, useState } from 'react';

import useSWRInfinite from 'swr/infinite';

import { getBrowserSupabase } from '@/lib/supabase/browser';
import { tilawaFetch } from '@/tilawa/backend/http';
import type { Row } from '@/tilawa/backend/mappers';

interface MessagePage {
  items: Row[];
  hasMore: boolean;
  nextCursor: { before: string; cursor: string } | null;
}
const useConversationMessages = (userId: string | undefined, id: string) => {
  const [olderError, setOlderError] = useState(false);
  const { data, error, mutate, size, setSize, isValidating } = useSWRInfinite<MessagePage>(
    (index: number, previous: MessagePage | null) => {
      if (!userId || !id || (index > 0 && !previous?.nextCursor)) return null;
      const params = new URLSearchParams({ conversation: id });
      if (index > 0 && previous?.nextCursor) {
        params.set('before', previous.nextCursor.before);
        params.set('cursor', previous.nextCursor.cursor);
      }
      return ['tilawa-messages', userId, `messages?${params}`];
    },
    // eslint-disable-next-line @typescript-eslint/naming-convention -- SWR 1.x spreads the tuple; its cache namespace is unused.
    (_scope: string, owner: string, path: string) => tilawaFetch(path, undefined, owner),
    { revalidateAll: true, persistSize: false },
  );
  useEffect(() => {
    setOlderError(false);
  }, [userId, id]);
  useEffect(() => {
    if (!userId || !id) return undefined;
    const client = getBrowserSupabase();
    const channel = client.channel(`messages-${userId}-${id}`).on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'direct_messages',
        filter: `conversation_id=eq.${id}`,
      },
      () => {
        mutate();
      },
    );
    channel.on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'direct_conversations', filter: `id=eq.${id}` },
      () => {
        mutate();
      },
    );
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') mutate();
    });
    return () => {
      client.removeChannel(channel);
    };
  }, [userId, id, mutate]);
  const loadEarlier = async (): Promise<void> => {
    setOlderError(false);
    try {
      await setSize((current) => current + 1);
    } catch {
      setOlderError(true);
    }
  };
  const messages = Array.from(
    new Map(
      (data ?? []).flatMap((page) => page.items).map((message) => [message.id, message]),
    ).values(),
  ).sort(
    (a, b) =>
      String(a.created_at).localeCompare(String(b.created_at)) ||
      String(a.id).localeCompare(String(b.id)),
  );
  return {
    messages,
    hasMore: !!data?.[data.length - 1]?.hasMore,
    loadingOlder: isValidating && size > (data?.length ?? 0),
    olderError,
    loadEarlier,
    error,
    loading: !!id && !data && !error,
  };
};
export default useConversationMessages;
