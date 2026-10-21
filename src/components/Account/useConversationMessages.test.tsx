/* eslint-disable @typescript-eslint/naming-convention, react-func/max-lines-per-function -- Database fixtures and complete account-isolation scenarios. */
import type { ReactNode } from 'react';

import { act, renderHook, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { afterEach, describe, expect, it, vi } from 'vitest';

import useConversationMessages from './useConversationMessages';

import { tilawaFetch } from '@/tilawa/backend/http';

const channel = { on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnThis() };
vi.mock('@/tilawa/backend/http', () => ({ tilawaFetch: vi.fn() }));
vi.mock('@/lib/supabase/browser', () => ({
  getBrowserSupabase: () => ({ channel: () => channel, removeChannel: vi.fn() }),
}));
const wrapper = ({ children }: { children: ReactNode }): JSX.Element => (
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false }}>
    {children}
  </SWRConfig>
);
afterEach(() => vi.clearAllMocks());
describe('Independent conversation history', () => {
  it('clears all loaded history pages when retention updates the conversation', async () => {
    let purged = false;
    vi.mocked(tilawaFetch).mockImplementation(async (path) => {
      const older = path.includes('before=');
      return {
        items: purged ? [] : [{ id: older ? 'old' : 'recent', created_at: '2026-08-01' }],
        hasMore: !purged && !older,
        nextCursor: !purged && !older ? { before: '2026-08-01', cursor: 'recent' } : null,
      };
    });
    const { result } = renderHook(() => useConversationMessages('student', 'thread'), { wrapper });
    await waitFor(() => expect(result.current.messages).toHaveLength(1));
    await act(() => result.current.loadEarlier());
    expect(result.current.messages).toHaveLength(2);
    const update = channel.on.mock.calls.find(
      ([, options]) => options.table === 'direct_conversations',
    );
    expect(update?.[1]).toMatchObject({ event: 'UPDATE', filter: 'id=eq.thread' });
    purged = true;
    await act(async () => update?.[2]());
    await waitFor(() => expect(result.current.messages).toEqual([]));
    expect(result.current.hasMore).toBe(false);
  });
  it('rebuilds contiguous history pages after a burst of messages on reconnect', async () => {
    let newest = false;
    vi.mocked(tilawaFetch).mockImplementation(async (path) => {
      const ids = newest ? ['d', 'c', 'b', 'a'] : ['b', 'a'];
      const cursor = new URL(path, 'https://local.invalid').searchParams.get('cursor');
      const index = cursor ? ids.indexOf(cursor) + 1 : 0;
      const id = ids[index];
      return {
        items: id ? [{ id, created_at: `2026-10-${id.charCodeAt(0) - 80}` }] : [],
        hasMore: index < ids.length - 1,
        nextCursor: index < ids.length - 1 ? { before: '2026-10-20', cursor: id } : null,
      };
    });
    const { result } = renderHook(() => useConversationMessages('student', 'thread'), { wrapper });
    await waitFor(() => expect(result.current.messages).toHaveLength(1));
    await act(() => result.current.loadEarlier());
    expect(result.current.messages.map((message) => message.id)).toEqual(['a', 'b']);
    newest = true;
    await act(async () => {
      (channel.on.mock.calls[0][2] as () => void)();
    });
    await waitFor(() =>
      expect(result.current.messages.map((message) => message.id)).toEqual(['c', 'd']),
    );
    await act(() => result.current.loadEarlier());
    await act(() => result.current.loadEarlier());
    expect(result.current.messages.map((message) => message.id)).toEqual(['a', 'b', 'c', 'd']);
  });
  it('loads an old conversation without any bootstrap messages and follows its stable cursor', async () => {
    vi.mocked(tilawaFetch).mockImplementation(async (path) =>
      path.includes('before=')
        ? {
            items: [{ id: 'a', created_at: '2026-10-19', body: 'Older' }],
            hasMore: false,
            nextCursor: null,
          }
        : {
            items: [{ id: 'b', created_at: '2026-10-20', body: 'Recent' }],
            hasMore: true,
            nextCursor: { before: '2026-10-20', cursor: 'b' },
          },
    );
    const { result } = renderHook(() => useConversationMessages('student', 'old-conversation'), {
      wrapper,
    });
    await waitFor(() => expect(result.current.messages).toHaveLength(1));
    expect(tilawaFetch).toHaveBeenCalledWith(
      'messages?conversation=old-conversation',
      undefined,
      'student',
    );
    await act(() => result.current.loadEarlier());
    expect(result.current.messages.map((m) => m.id)).toEqual(['a', 'b']);
    expect(result.current.hasMore).toBe(false);
  });
  it('does not show the previous account conversation while another account loads', async () => {
    vi.mocked(tilawaFetch)
      .mockResolvedValueOnce({
        items: [{ id: 'private', created_at: '2026-10-20' }],
        hasMore: false,
        nextCursor: null,
      })
      .mockImplementationOnce(() => new Promise(() => {}));
    const { result, rerender } = renderHook(({ user }) => useConversationMessages(user, 'thread'), {
      wrapper,
      initialProps: { user: 'first' },
    });
    await waitFor(() => expect(result.current.messages).toHaveLength(1));
    rerender({ user: 'second' });
    expect(result.current.messages).toEqual([]);
  });
});
