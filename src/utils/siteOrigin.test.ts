/* eslint-disable react-func/max-lines-per-function */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { getSiteOrigin, resolveSiteOrigin } from './siteOrigin';

describe('resolveSiteOrigin', () => {
  it('should prefer the explicit site URL and normalize it', () => {
    expect(resolveSiteOrigin({ explicitSiteUrl: 'https://tilawa.example/' })).toBe(
      'https://tilawa.example',
    );
    expect(resolveSiteOrigin({ explicitSiteUrl: 'tilawa.example' })).toBe('https://tilawa.example');
    expect(resolveSiteOrigin({ explicitSiteUrl: 'http://tilawa.example/' })).toBe(
      'http://tilawa.example',
    );
  });

  it('should use http for localhost-like explicit hosts', () => {
    expect(resolveSiteOrigin({ explicitSiteUrl: 'localhost:3000' })).toBe('http://localhost:3000');
    expect(resolveSiteOrigin({ explicitSiteUrl: '127.0.0.1:3000/' })).toBe('http://127.0.0.1:3000');
  });

  it('should fall back to the browser origin, then Vercel hosts', () => {
    expect(resolveSiteOrigin({ browserOrigin: 'https://client.example/' })).toBe(
      'https://client.example',
    );
    expect(resolveSiteOrigin({ vercelHost: 'tilawa-site.vercel.app' })).toBe(
      'https://tilawa-site.vercel.app',
    );
    expect(resolveSiteOrigin({ vercelHost: 'https://tilawa-site.vercel.app/' })).toBe(
      'https://tilawa-site.vercel.app',
    );
  });

  it('should prefer explicit config over browser and Vercel sources', () => {
    expect(
      resolveSiteOrigin({
        explicitSiteUrl: 'https://canonical.example',
        browserOrigin: 'https://client.example',
        vercelHost: 'preview.vercel.app',
      }),
    ).toBe('https://canonical.example');
    expect(
      resolveSiteOrigin({ browserOrigin: 'https://client.example', vercelHost: 'x.vercel.app' }),
    ).toBe('https://client.example');
  });

  it('should return an empty string when nothing is known', () => {
    expect(resolveSiteOrigin({})).toBe('');
    expect(
      resolveSiteOrigin({ explicitSiteUrl: '  ', browserOrigin: '', vercelHost: undefined }),
    ).toBe('');
  });
});

describe('getSiteOrigin', () => {
  const siteUrlKey = 'NEXT_PUBLIC_SITE_URL';

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should read the explicit site URL from the environment', () => {
    vi.stubEnv(siteUrlKey, 'https://tilawa.example/');
    expect(getSiteOrigin()).toBe('https://tilawa.example');
  });
});
