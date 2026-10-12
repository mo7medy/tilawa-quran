// @vitest-environment node
/* eslint-disable @typescript-eslint/naming-convention -- External API fixtures. */
/* eslint-disable react-func/max-lines-per-function */
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('reader fetcher on the server', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it.each(['true', 'false'])(
    'fetches reader data directly when IS_BUILD_TIME=%s',
    async (buildTime) => {
      vi.stubEnv('QURAN_CLIENT_ID', 'test-client');
      vi.stubEnv('QURAN_CLIENT_SECRET', 'test-secret');
      vi.stubEnv('QURAN_API_ENV', 'production');
      vi.stubEnv('API_GATEWAY_URL', '');
      vi.stubEnv('SIGNATURE_TOKEN', '');
      vi.stubEnv('PROXY_SIGNATURE_TOKEN', '');
      vi.stubEnv('IS_BUILD_TIME', buildTime);
      vi.stubEnv('NEXT_PUBLIC_VERCEL_URL', 'tilawa-quran.vercel.app');
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(Response.json({ access_token: 'test-token', expires_in: 3600 }))
        .mockResolvedValueOnce(
          Response.json({ lookup_range: { from: '2:1', to: '2:286' }, pages: {} }),
        );
      vi.stubGlobal('fetch', fetchMock);
      const { getProxiedServiceUrl, QuranFoundationService } = await import('../../utils/url');
      const { fetcher } = await import('../../api');
      const url = getProxiedServiceUrl(
        QuranFoundationService.CONTENT,
        '/api/qdc/pages/lookup?chapter_number=2',
      );
      const result = await fetcher<{ lookupRange: { from: string } }>(url);
      expect(result.lookupRange.from).toBe('2:1');
      expect(fetchMock.mock.calls[1][0]).toBe(
        'https://apis.quran.foundation/content/api/v4/pages/lookup?chapter_number=2',
      );
      expect(
        fetchMock.mock.calls.some(([requestUrl]) => requestUrl.includes('tilawa-quran.vercel.app')),
      ).toBe(false);
    },
  );
});
