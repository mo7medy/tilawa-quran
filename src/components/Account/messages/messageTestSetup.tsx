/* eslint-disable react-func/max-lines-per-function, @typescript-eslint/naming-convention -- Shared connected message fixtures preserve database wire fields. */
/* eslint-disable import/no-extraneous-dependencies -- Imported only by the Vitest messaging suite. */
import { vi } from 'vitest';

import { AccountContext } from '../AccountContext';
import '../accountTestSetup';
import LiveMessages from '../LiveMessages';

import { createAccountFixtures } from '@/tilawa/account/fixtures';

const historyState = vi.hoisted(() => ({
  messages: [] as Record<string, unknown>[],
  retry: vi.fn().mockResolvedValue(undefined),
}));
export const history = historyState;
vi.mock('../useConversationMessages', () => ({
  default: () => ({
    messages: historyState.messages,
    retry: historyState.retry,
    loading: false,
    hasMore: false,
  }),
}));

export const fixture = (status = 'accepted', blocked = false) => {
  const state = createAccountFixtures();
  state.teachers = [];
  state.messages = [];
  const snapshot = {
    conversations: ['one', 'two'].map((id) => ({
      id,
      teacher_id: id,
      student_id: 'self',
      request_status: status,
      requested_by: 'other',
      blocked,
      own_state: { blocked },
    })),
    people: [
      { id: 'one', display_name: 'Ahmed' },
      { id: 'two', display_name: 'Nour' },
    ],
  };
  const command = vi.fn().mockResolvedValue({ ok: true });
  const app = () => (
    <AccountContext.Provider
      value={{ state, backend: true, userId: 'self', snapshot, command, dispatch: vi.fn() }}
    >
      <LiveMessages />
    </AccountContext.Provider>
  );
  return { command, app, snapshot };
};
