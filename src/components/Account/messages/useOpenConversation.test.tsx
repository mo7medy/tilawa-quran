/* eslint-disable react-func/max-lines-per-function -- Cancellable opening and retry lifecycle scenarios. */
import { StrictMode } from 'react';
import type { ReactNode } from 'react';

import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AccountContext } from '../AccountContext';
import { accountTestRoute, routeAccount } from '../accountTestSetup';

import useOpenConversation from './useOpenConversation';

import { createAccountFixtures } from '@/tilawa/account/fixtures';

afterEach(cleanup);
describe('Open a teacher conversation', () => {
  it('shares one opening request across StrictMode effects and navigates only while active', async () => {
    routeAccount('profile', ['messages']);
    accountTestRoute.query.peer = 'teacher';
    const replace = vi.fn().mockResolvedValue(true);
    Object.assign(accountTestRoute, { replace });
    let finish: (value: { id: string }) => void = () => {};
    const command = vi.fn(
      () =>
        new Promise<{ id: string }>((resolve) => {
          finish = resolve;
        }),
    );
    const wrapper = ({ children }: { children: ReactNode }) => (
      <StrictMode>
        <AccountContext.Provider
          value={{
            state: createAccountFixtures(),
            backend: true,
            userId: 'self',
            dispatch: vi.fn(),
            command: command as never,
          }}
        >
          {children}
        </AccountContext.Provider>
      </StrictMode>
    );
    const { result } = renderHook(useOpenConversation, { wrapper });
    expect(command).toHaveBeenCalledOnce();
    await act(async () => finish({ id: 'thread' }));
    await waitFor(() => expect(replace).toHaveBeenCalledOnce());
    expect(result.current.opening).toBe(false);
  });
  it('keeps a failure visible and retries only when explicitly requested', async () => {
    routeAccount('profile', ['messages']);
    accountTestRoute.query.peer = 'teacher';
    const replace = vi.fn().mockResolvedValue(true);
    Object.assign(accountTestRoute, { replace });
    const command = vi
      .fn()
      .mockRejectedValueOnce(Error('Offline'))
      .mockResolvedValue({ id: 'thread' });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AccountContext.Provider
        value={{
          state: createAccountFixtures(),
          backend: true,
          userId: 'self',
          dispatch: vi.fn(),
          command,
        }}
      >
        {children}
      </AccountContext.Provider>
    );
    const { result, rerender } = renderHook(useOpenConversation, { wrapper });
    await waitFor(() => expect(result.current.failed).toBe(true));
    rerender();
    expect(command).toHaveBeenCalledOnce();
    act(() => result.current.retry());
    await waitFor(() => expect(replace).toHaveBeenCalledOnce());
    expect(command).toHaveBeenCalledTimes(2);
  });
});
