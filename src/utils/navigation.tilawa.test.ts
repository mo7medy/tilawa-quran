import { describe, expect, it } from 'vitest';

import {
  getLoginNavigationUrl,
  getQuranHomeNavigationUrl,
  getShareableVerseUrl,
  getTeachersNavigationUrl,
  ROUTES,
} from './navigation';

describe('Tilawa home routes', () => {
  it('should expose distinct academy and Quran home constants without changing HOME', () => {
    expect(ROUTES.ACADEMY_HOME).toBe('/');
    expect(ROUTES.QURAN_HOME).toBe('/quran');
    // Existing behavior: HOME still means the site root (now the academy page).
    expect(ROUTES.HOME).toBe('/');
  });

  it('should route reader home navigation helpers to /quran and /teachers', () => {
    expect(getQuranHomeNavigationUrl()).toBe('/quran');
    expect(getTeachersNavigationUrl()).toBe('/teachers');
  });

  it('routes Quran login links to the shared account page and preserves the return path', () => {
    expect(getLoginNavigationUrl()).toBe('/sign-in');
    expect(getLoginNavigationUrl('/quran')).toBe('/sign-in?r=%2Fquran');
    expect(getLoginNavigationUrl('/ar/2?startingVerse=5#reading')).toBe(
      '/sign-in?r=%2Far%2F2%3FstartingVerse%3D5%23reading',
    );
  });

  it('should build verse share URLs on this deployment, never the legacy host', () => {
    const url = getShareableVerseUrl('2:255');
    expect(url.endsWith('/2/255')).toBe(true);
    expect(url).not.toContain('quran.com');
  });
});
