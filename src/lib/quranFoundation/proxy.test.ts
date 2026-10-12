// @vitest-environment node
/* eslint-disable @typescript-eslint/naming-convention -- External API fixtures. */
/* eslint-disable react-func/max-lines-per-function */
import type { NextApiRequest, NextApiResponse } from 'next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const makeResponse = () => {
  const response = { setHeader: vi.fn(), status: vi.fn(), json: vi.fn() };
  response.status.mockReturnValue(response);
  return response;
};
const makeRequest = (overrides = {}): NextApiRequest =>
  ({
    method: 'GET',
    url: '/api/proxy/content/api/qdc/chapters?language=ar',
    query: { path: ['content', 'api', 'qdc', 'chapters'] },
    headers: { host: 'tilawa-quran.vercel.app', referer: 'https://tilawa-quran.vercel.app/' },
    ...overrides,
  } as unknown as NextApiRequest);

describe('Quran content proxy', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('QURAN_CLIENT_ID', 'test-client');
    vi.stubEnv('QURAN_CLIENT_SECRET', 'test-secret');
    vi.stubEnv('API_GATEWAY_URL', '');
    vi.stubEnv('QURAN_API_ENV', 'production');
    vi.stubEnv('ALLOWED_ORIGINS', 'quran.com,test.quran.com');
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('imports safely without a legacy gateway and reports missing configuration', async () => {
    vi.stubEnv('QURAN_CLIENT_SECRET', '');
    const { default: handler } = await import('../../pages/api/proxy/[...path]');
    const response = makeResponse();
    await handler(makeRequest(), response as unknown as NextApiResponse);
    expect(response.status).toHaveBeenCalledWith(503);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('QURAN_CLIENT_ID') }),
    );
  });

  it('allows its own deployment origin and returns data without exposing credentials', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(Response.json({ access_token: 'test-token', expires_in: 3600 }))
        .mockResolvedValueOnce(Response.json({ chapters: [{ id: 1 }] })),
    );
    const { default: handler } = await import('../../pages/api/proxy/[...path]');
    const response = makeResponse();
    await handler(makeRequest(), response as unknown as NextApiResponse);
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({ chapters: [{ id: 1 }] });
    expect(JSON.stringify(response.json.mock.calls)).not.toContain('test-secret');
    expect(JSON.stringify(response.json.mock.calls)).not.toContain('test-token');
  });

  it('blocks another browser origin before making an upstream request', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { default: handler } = await import('../../pages/api/proxy/[...path]');
    const response = makeResponse();
    await handler(
      makeRequest({ headers: { host: 'tilawa-quran.vercel.app', origin: 'https://evil.test' } }),
      response as unknown as NextApiResponse,
    );
    expect(response.status).toHaveBeenCalledWith(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not expose app credentials for arbitrary write operations', async () => {
    const { default: handler } = await import('../../pages/api/proxy/[...path]');
    const response = makeResponse();
    await handler(makeRequest({ method: 'POST' }), response as unknown as NextApiResponse);
    expect(response.status).toHaveBeenCalledWith(405);
    expect(response.setHeader).toHaveBeenCalledWith('Allow', 'GET');
  });

  it('reports unconfigured user services independently of content credentials', async () => {
    const { default: handler } = await import('../../pages/api/proxy/[...path]');
    const response = makeResponse();
    await handler(
      makeRequest({ query: { path: ['auth', 'users', 'me'] } }),
      response as unknown as NextApiResponse,
    );
    expect(response.status).toHaveBeenCalledWith(503);
  });
});
