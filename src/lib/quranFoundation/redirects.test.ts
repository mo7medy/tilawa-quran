// @vitest-environment node
/* eslint-disable @typescript-eslint/naming-convention -- External API fixtures. */
/* eslint-disable react-func/max-lines-per-function */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('Quran Foundation redirects on Workers', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('QURAN_CLIENT_ID', 'test-client');
    vi.stubEnv('QURAN_CLIENT_SECRET', 'test-secret');
    vi.stubEnv('QURAN_API_ENV', 'production');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });
  const token = (value = 'test-token') => Response.json({ access_token: value, expires_in: 3600 });

  it('supports Workers without using its unsupported redirect mode', async () => {
    const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      if (init.redirect === 'error') {
        throw new TypeError('Invalid redirect value, must be one of "follow" or "manual"');
      }
      return url.includes('/oauth2/token') ? token() : Response.json({ chapters: [{ id: 22 }] });
    });
    vi.stubGlobal('fetch', fetchMock);
    const { fetchQuranFoundation } = await import('./client');
    const response = await fetchQuranFoundation('content/api/qdc/chapters');
    expect(await response.json()).toEqual({ chapters: [{ id: 22 }] });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    fetchMock.mock.calls.forEach(([, init]) => expect(init.redirect).toBe('manual'));
  });

  it.each([301, 302, 303, 307, 308])(
    'rejects a %s OAuth redirect before sending content requests',
    async (status) => {
      const fetchMock = vi.fn();
      fetchMock.mockResolvedValueOnce(
        new Response('test-secret', {
          status,
          headers: { Location: 'https://untrusted.test/token' },
        }),
      );
      vi.stubGlobal('fetch', fetchMock);
      const { fetchQuranFoundation } = await import('./client');
      await expect(fetchQuranFoundation('content/api/qdc/chapters')).rejects.toThrow(
        'Quran Foundation token endpoint redirects are not allowed.',
      );
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0][1].redirect).toBe('manual');
    },
  );

  it.each([301, 302, 303, 307, 308])(
    'rejects a %s content redirect without forwarding the token',
    async (status) => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(token())
        .mockResolvedValueOnce(
          new Response('test-token', {
            status,
            headers: { Location: 'https://untrusted.test/content' },
          }),
        );
      vi.stubGlobal('fetch', fetchMock);
      const { fetchQuranFoundation } = await import('./client');
      await expect(fetchQuranFoundation('content/api/qdc/chapters')).rejects.toThrow(
        'Quran Foundation API redirects are not allowed.',
      );
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock.mock.calls[1][1].redirect).toBe('manual');
    },
  );

  it('also rejects redirects after refreshing an expired token', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(token('old'))
      .mockResolvedValueOnce(new Response('', { status: 401 }))
      .mockResolvedValueOnce(token('new'))
      .mockResolvedValueOnce(
        new Response('', { status: 307, headers: { Location: 'https://untrusted.test/content' } }),
      );
    vi.stubGlobal('fetch', fetchMock);
    const { fetchQuranFoundation } = await import('./client');
    await expect(fetchQuranFoundation('content/api/qdc/chapters')).rejects.toThrow(
      'Quran Foundation API redirects are not allowed.',
    );
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls[3][1].redirect).toBe('manual');
  });
});
