/* eslint-disable react-func/max-lines-per-function -- Upload retry scenarios keep visible errors and the single-use challenge lifecycle together. */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { StudioClientError } from './client';
import { defaultSpec } from './contracts';
import useBackgroundUpload from './useBackgroundUpload';

const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('./client', async (original) => ({
  ...(await original<typeof import('./client')>()),
  studioRequest: request,
}));
beforeEach(() => {
  request.mockReset();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
});
afterEach(() => vi.unstubAllGlobals());

describe('background upload recovery', () => {
  it('resets the consumed challenge after a size rejection so another upload can succeed', async () => {
    const consumed = vi.fn();
    const changed = vi.fn();
    const error = vi.fn();
    const { result } = renderHook(() =>
      useBackgroundUpload({
        spec: defaultSpec,
        change: changed,
        challenge: 'single-use',
        onConsumed: consumed,
        onError: error,
      }),
    );
    const file = new File(['image'], 'background.png', { type: 'image/png' });
    request.mockRejectedValueOnce(new StudioClientError('FILE_TOO_LARGE'));
    await act(async () => result.current.upload(file));
    expect(error).toHaveBeenCalledWith('FILE_TOO_LARGE');
    expect(consumed).toHaveBeenCalledTimes(1);
    request
      .mockResolvedValueOnce({ id: 'accepted-background' })
      .mockResolvedValueOnce({ status: 'ready' });
    await act(async () => result.current.upload(file));
    expect(consumed).toHaveBeenCalledTimes(2);
    expect(changed).toHaveBeenCalledWith({
      background: expect.objectContaining({ type: 'upload', value: 'accepted-background' }),
    });
    expect(result.current.busy).toBe(false);
  });
  it('reports an invalid file when decoder cleanup removes a rejected upload before polling', async () => {
    const error = vi.fn();
    const { result } = renderHook(() =>
      useBackgroundUpload({
        spec: defaultSpec,
        change: vi.fn(),
        challenge: 'single-use',
        onConsumed: vi.fn(),
        onError: error,
      }),
    );
    request
      .mockResolvedValueOnce({ id: 'rejected-background' })
      .mockRejectedValueOnce(new StudioClientError('NOT_FOUND'));
    await act(async () =>
      result.current.upload(new File(['invalid'], 'background.png', { type: 'image/png' })),
    );
    expect(error).toHaveBeenCalledWith('INVALID_FILE');
    expect(result.current.busy).toBe(false);
  });
});
