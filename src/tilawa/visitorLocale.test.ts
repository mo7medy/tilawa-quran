/* eslint-disable react-func/max-lines-per-function */
import { describe, expect, it } from 'vitest';

import { getVisitorLocale, getVisitorLocaleRedirect } from './visitorLocale';

describe('Country-based visitor language', () => {
  it.each([
    ['EG', 'ar'],
    ['SA', 'ar'],
    ['US', 'en'],
    ['GB', 'en'],
    ['FR', 'fr'],
    ['NL', 'nl'],
    ['TR', 'tr'],
    ['ID', 'id'],
    ['BR', 'pt'],
    ['PK', 'ur'],
    ['CN', 'zh'],
    ['BD', 'bn'],
    ['DE', 'en'],
    ['XX', 'en'],
    ['T1', 'en'],
    [undefined, 'en'],
  ])('chooses %s → %s without requiring a geolocation API', (country, locale) => {
    expect(getVisitorLocale(country)).toBe(locale);
  });

  it('prefers a supported manual language and ignores invalid cookies', () => {
    expect(getVisitorLocale('EG', 'en')).toBe('en');
    expect(getVisitorLocale('US', 'ar')).toBe('ar');
    expect(getVisitorLocale('FR', 'unsupported')).toBe('fr');
  });

  it('preserves page, query and fragment when redirecting', () => {
    const request = new Request('https://tilawa.example/teachers?subject=quran#list');
    expect(getVisitorLocaleRedirect(request, 'EG')?.href).toBe(
      'https://tilawa.example/ar/teachers?subject=quran#list',
    );
    expect(getVisitorLocaleRedirect(new Request('https://tilawa.example/'), 'FR')?.pathname).toBe(
      '/fr',
    );
  });

  it('honors saved English without redirect loops and saved Arabic on an unprefixed visit', () => {
    const en = new Request('https://tilawa.example/', { headers: { Cookie: 'NEXT_LOCALE=en' } });
    const ar = new Request('https://tilawa.example/quran', {
      headers: { Cookie: 'other=1; NEXT_LOCALE=ar' },
    });
    expect(getVisitorLocaleRedirect(en, 'EG')).toBeNull();
    expect(getVisitorLocaleRedirect(ar, 'US')?.pathname).toBe('/ar/quran');
  });

  it.each(['/ar', '/en', '/en/teachers', '/fr/quran', '/nl/sign-in'])(
    'preserves the explicit language in %s',
    (path) => {
      const request = new Request(`https://tilawa.example${path}`, {
        headers: { Cookie: 'NEXT_LOCALE=ar' },
      });
      expect(getVisitorLocaleRedirect(request, 'EG')).toBeNull();
    },
  );

  it.each([
    '/api/proxy/chapters',
    '/api',
    '/_next/static/chunk.js',
    '/_next/data/build/ar.json',
    '/fonts/quran.woff2',
    '/tilawa/logo.svg',
    '/robots.txt',
    '/sitemap.xml',
    '/auth?token=example',
    '/logout',
    '/reset-password?token=example',
    '/embed/v1',
  ])('does not redirect service, asset or callback route %s', (path) => {
    expect(getVisitorLocaleRedirect(new Request(`https://tilawa.example${path}`), 'EG')).toBeNull();
  });

  it('does not redirect POST requests or rely on a country header supplied by the client', () => {
    expect(
      getVisitorLocaleRedirect(
        new Request('https://tilawa.example/sign-in', { method: 'POST' }),
        'EG',
      ),
    ).toBeNull();
    expect(
      getVisitorLocaleRedirect(
        new Request('https://tilawa.example/', {
          headers: new Headers([['CF-IPCountry', 'EG']]),
        }),
      ),
    ).toBeNull();
  });
});
