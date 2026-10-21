import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import useMessageReadCache from './useMessageReadCache';

import type { Row } from '@/tilawa/backend/rows';

describe('Message directory transitions', () => {
  it('retains only the same owner directory while the next conversation loads', () => {
    const page: Row = { conversations: [{ id: 'old-thread' }] };
    const { result, rerender } = renderHook(
      ({ owner, data }: { owner: string; data?: Row }) =>
        useMessageReadCache(owner, 'messages', data),
      { initialProps: { owner: 'first', data: page } },
    );
    rerender({ owner: 'first', data: undefined });
    expect(result.current).toBe(page);
    rerender({ owner: 'second', data: undefined });
    expect(result.current).toBeUndefined();
  });
  it('discards a directory when leaving messages instead of supplying stale profile data', () => {
    const { result, rerender } = renderHook(
      ({ view, data }: { view: string; data?: Row }) => useMessageReadCache('owner', view, data),
      { initialProps: { view: 'messages', data: { conversations: [] } } },
    );
    rerender({ view: 'profile', data: undefined });
    expect(result.current).toBeUndefined();
    rerender({ view: 'messages', data: undefined });
    expect(result.current).toBeUndefined();
  });
});
