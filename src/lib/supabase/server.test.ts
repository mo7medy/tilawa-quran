/* eslint-disable react-func/max-lines-per-function -- Verify sanitized API diagnostics. */
import type { NextApiRequest, NextApiResponse } from 'next';
import { describe, expect, it, vi } from 'vitest';

import { BackendError, protectRequest, respondError } from './server';

const response = (): NextApiResponse => {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
    getHeader: vi.fn(() => 'request-id'),
    setHeader: vi.fn(),
  };
  res.status.mockReturnValue(res);
  return res as unknown as NextApiResponse;
};
describe('Backend error categories', () => {
  it('rejects missing, malformed and cross-origin mutation origins as authorization errors', () => {
    [undefined, 'null', 'https://other.invalid'].forEach((origin) => {
      expect(() =>
        protectRequest(
          { method: 'POST', headers: { origin, host: 'tilawa.invalid' } } as NextApiRequest,
          response(),
        ),
      ).toThrow('INVALID_ORIGIN');
    });
    expect(() =>
      protectRequest(
        {
          method: 'POST',
          headers: { origin: 'https://tilawa.invalid', host: 'tilawa.invalid' },
        } as NextApiRequest,
        response(),
      ),
    ).not.toThrow();
  });
  it('distinguishes validation/auth failures from unexpected infrastructure errors', () => {
    const res = response();
    respondError(res, new BackendError('AUTH_REQUIRED', 401));
    expect(res.status).toHaveBeenLastCalledWith(401);
    respondError(res, { code: '23514', message: 'PAID_ORDER_REQUIRED' });
    expect(res.status).toHaveBeenLastCalledWith(422);
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    respondError(res, new Error('secret token and private payload'));
    expect(res.status).toHaveBeenLastCalledWith(500);
    expect(JSON.stringify(log.mock.calls)).not.toContain('secret');
    expect(res.json).toHaveBeenLastCalledWith({
      error: { code: 'BACKEND_ERROR', requestId: 'request-id' },
    });
    log.mockRestore();
  });
});
