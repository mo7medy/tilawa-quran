// @vitest-environment node
/* eslint-disable @typescript-eslint/naming-convention -- External API fixtures. */
/* eslint-disable react-func/max-lines-per-function */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('server-only Quran Foundation requests', () => {
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

  it('uses OAuth credentials on the server and reuses cached tokens', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(token())
      .mockResolvedValueOnce(Response.json({ chapters: [] }))
      .mockResolvedValueOnce(Response.json({ chapters: [] }));
    vi.stubGlobal('fetch', fetchMock);
    const { fetchQuranFoundation } = await import('./client');
    await fetchQuranFoundation('content/api/qdc/chapters');
    await fetchQuranFoundation('content/api/qdc/chapters');
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0][0]).toBe('https://oauth2.quran.foundation/oauth2/token');
    expect(fetchMock.mock.calls[0][1].body).toBe('grant_type=client_credentials&scope=content');
    expect(fetchMock.mock.calls[1][1].headers).toMatchObject({
      'x-client-id': 'test-client',
      'x-auth-token': 'test-token',
    });
    expect(JSON.stringify(fetchMock.mock.calls[1])).not.toContain('test-secret');
  });

  it('coalesces simultaneous token requests', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(async (url: string) =>
        url.includes('/oauth2/token') ? token() : Response.json({ chapters: [] }),
      );
    vi.stubGlobal('fetch', fetchMock);
    const { fetchQuranFoundation } = await import('./client');
    await Promise.all([
      fetchQuranFoundation('content/api/qdc/chapters'),
      fetchQuranFoundation('content/api/qdc/chapters'),
    ]);
    expect(fetchMock.mock.calls.filter(([url]) => url.includes('/oauth2/token'))).toHaveLength(1);
  });

  it('renews the token once after 401', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(token('old'))
      .mockResolvedValueOnce(new Response('', { status: 401 }))
      .mockResolvedValueOnce(token('new'))
      .mockResolvedValueOnce(Response.json({ chapters: [] }));
    vi.stubGlobal('fetch', fetchMock);
    const { fetchQuranFoundation } = await import('./client');
    expect((await fetchQuranFoundation('content/api/qdc/chapters')).status).toBe(200);
    expect(fetchMock.mock.calls[3][1].headers['x-auth-token']).toBe('new');
  });

  it('does not loop on persistent authorization failures', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(token('old'))
      .mockResolvedValueOnce(new Response('', { status: 401 }))
      .mockResolvedValueOnce(token('new'))
      .mockResolvedValueOnce(new Response('', { status: 401 }));
    vi.stubGlobal('fetch', fetchMock);
    const { fetchQuranFoundation } = await import('./client');
    expect((await fetchQuranFoundation('content/api/qdc/chapters')).status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('collects every verse page rather than silently truncating at 50', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(token())
      .mockResolvedValueOnce(
        Response.json({ verses: [{ verse_key: '2:1' }], pagination: { next_page: 2 } }),
      )
      .mockResolvedValueOnce(
        Response.json({ verses: [{ verse_key: '2:2' }], pagination: { next_page: null } }),
      );
    vi.stubGlobal('fetch', fetchMock);
    const { fetchQuranFoundation } = await import('./client');
    const response = await fetchQuranFoundation('content/api/qdc/verses/by_page/2?per_page=all');
    const body = await response.json();
    expect(body.verses.map((verse: { verse_key: string }) => verse.verse_key)).toEqual([
      '2:1',
      '2:2',
    ]);
    expect(body.pagination.next_page).toBeNull();
    expect(fetchMock.mock.calls[2][0]).toContain('page=2');
  });

  it('selects matching prelive hosts', async () => {
    vi.stubEnv('QURAN_API_ENV', 'prelive');
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(token())
      .mockResolvedValueOnce(Response.json({ chapters: [] }));
    vi.stubGlobal('fetch', fetchMock);
    const { fetchQuranFoundation } = await import('./client');
    await fetchQuranFoundation('content/api/qdc/chapters');
    expect(fetchMock.mock.calls[0][0]).toContain('prelive-oauth2.quran.foundation');
    expect(fetchMock.mock.calls[1][0]).toContain('apis-prelive.quran.foundation');
  });

  it('reports missing credentials without exposing secrets or making requests', async () => {
    vi.stubEnv('QURAN_CLIENT_SECRET', '');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { fetchQuranFoundation } = await import('./client');
    await expect(fetchQuranFoundation('content/api/qdc/chapters')).rejects.toThrow(
      'Set QURAN_CLIENT_ID',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not expose a token endpoint error body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(Response.json({ error: 'test-secret' }, { status: 403 })),
    );
    const { fetchQuranFoundation } = await import('./client');
    await expect(fetchQuranFoundation('content/api/qdc/chapters')).rejects.toThrow(
      'token request failed (403)',
    );
  });
});
