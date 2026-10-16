import { describe, expect, it } from 'vitest';

import getAccountQuerySuffix from './accountNavigation';

describe('Shared account navigation context', () => {
  it('keeps the Quran return path without carrying recovery state into registration', () => {
    const suffix = getAccountQuerySuffix({ r: '/ar/quran?tab=juz#list', recovery: '1' });
    const params = new URLSearchParams(suffix);
    expect(params.get('r')).toBe('/ar/quran?tab=juz#list');
    expect(params.has('recovery')).toBe(false);
  });

  it('keeps valid package, subject, gift and return path together', () => {
    const params = new URLSearchParams(
      getAccountQuerySuffix({
        package: 'progress',
        subject: 'quran',
        gift: 'memorization',
        r: '/ar/2?startingVerse=5',
      }),
    );
    expect(Object.fromEntries(params)).toEqual({
      package: 'progress',
      subject: 'quran',
      gift: 'memorization',
      r: '/ar/2?startingVerse=5',
    });
  });

  it('does not forward invalid packages or duplicate return parameters', () => {
    expect(getAccountQuerySuffix({ package: 'unknown', r: ['/quran', '/teachers'] })).toBe('');
    expect(getAccountQuerySuffix({})).toBe('');
  });
});
