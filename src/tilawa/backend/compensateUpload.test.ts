/* eslint-disable react-func/max-lines-per-function -- Compensation and ambiguous failure boundaries. */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { compensateUpload } from './compensateUpload';
import { TilawaRequestError } from './http';

const state = vi.hoisted(() => ({ rpc: vi.fn(), remove: vi.fn(), owner: 'owner' }));
vi.mock('@/lib/supabase/browser', () => ({
  getSessionUserId: () => state.owner,
  getBrowserSupabase: () => ({
    rpc: state.rpc,
    storage: { from: () => ({ remove: state.remove }) },
  }),
}));
beforeEach(() => {
  vi.clearAllMocks();
  state.owner = 'owner';
  state.rpc.mockResolvedValue({ data: false, error: null });
});
describe('New-upload compensation', () => {
  it('removes only a definitively rejected, unreferenced upload owned by the current account', async () => {
    await compensateUpload(
      'tilawa-avatars',
      'owner/new.png',
      'owner',
      new TilawaRequestError('INVALID_PROFILE', 422),
    );
    expect(state.remove).toHaveBeenCalledWith(['owner/new.png']);
  });
  it('keeps files for ambiguous network/server failures, existing references and switched accounts', async () => {
    await compensateUpload('tilawa-avatars', 'owner/new.png', 'owner', new Error('timeout'));
    await compensateUpload(
      'tilawa-avatars',
      'owner/new.png',
      'owner',
      new TilawaRequestError('BACKEND_ERROR', 500),
    );
    expect(state.rpc).not.toHaveBeenCalled();
    state.rpc.mockResolvedValue({ data: true, error: null });
    await compensateUpload(
      'tilawa-avatars',
      'owner/new.png',
      'owner',
      new TilawaRequestError('INVALID_PROFILE', 422),
    );
    state.owner = 'other';
    await compensateUpload(
      'tilawa-avatars',
      'owner/new.png',
      'owner',
      new TilawaRequestError('INVALID_PROFILE', 422),
    );
    expect(state.remove).not.toHaveBeenCalled();
  });
});
