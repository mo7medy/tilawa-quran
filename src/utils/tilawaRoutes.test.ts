import { describe, expect, it } from 'vitest';

import {
  ACADEMY_ROUTE_PATHNAMES,
  isAcademyRoutePathname,
  stripLocalePrefix,
  withLocalePrefix,
} from './tilawaRoutes';

describe('isAcademyRoutePathname', () => {
  it('should classify the academy homepage as an academy route', () => {
    expect(isAcademyRoutePathname('/')).toBe(true);
  });

  it('keeps the package and account previews on the light academy shell', () => {
    ['/pricing', '/register', '/sign-in'].forEach((path) => {
      expect(isAcademyRoutePathname(path)).toBe(true);
    });
    expect(isAcademyRoutePathname('/pricing-admin')).toBe(false);
    expect(isAcademyRoutePathname('/register/private')).toBe(false);
  });

  it('should classify the teachers browse route (and nested paths) as academy routes', () => {
    expect(isAcademyRoutePathname('/teachers')).toBe(true);
    expect(isAcademyRoutePathname('/teachers/approved-slug')).toBe(true);
  });

  it('should keep the preserved Quran homepage and reader routes on the Quran shell', () => {
    expect(isAcademyRoutePathname('/quran')).toBe(false);
    expect(isAcademyRoutePathname('/[chapterId]')).toBe(false);
    expect(isAcademyRoutePathname('/search')).toBe(false);
    expect(isAcademyRoutePathname('/login')).toBe(false);
    expect(isAcademyRoutePathname('/my-quran')).toBe(false);
  });

  it('should expose the academy pathname allowlist', () => {
    expect(ACADEMY_ROUTE_PATHNAMES).toContain('/');
    expect(ACADEMY_ROUTE_PATHNAMES).toContain('/teachers');
    expect(ACADEMY_ROUTE_PATHNAMES).not.toContain('/quran');
  });
});

describe('withLocalePrefix', () => {
  it('should leave English and missing locales unprefixed', () => {
    expect(withLocalePrefix('/teachers', 'en')).toBe('/teachers');
    expect(withLocalePrefix('/teachers')).toBe('/teachers');
    expect(withLocalePrefix('/teachers', null)).toBe('/teachers');
  });

  it('should prefix Arabic routes while preserving query and hash', () => {
    expect(withLocalePrefix('/teachers', 'ar')).toBe('/ar/teachers');
    expect(withLocalePrefix('/quran', 'ar')).toBe('/ar/quran');
    expect(withLocalePrefix('/login', 'ar')).toBe('/ar/login');
    expect(withLocalePrefix('/', 'ar')).toBe('/ar');
    expect(withLocalePrefix('/#programs', 'ar')).toBe('/ar#programs');
    expect(withLocalePrefix('/teachers?level=adult#list', 'ar')).toBe(
      '/ar/teachers?level=adult#list',
    );
  });

  it('should leave external and relative hrefs untouched', () => {
    expect(withLocalePrefix('https://example.com/x', 'ar')).toBe('https://example.com/x');
    expect(withLocalePrefix('#faq', 'ar')).toBe('#faq');
  });

  it('should strip a leading locale segment while preserving query and hash', () => {
    const locales = ['en', 'ar', 'fr'];
    expect(stripLocalePrefix('/ar/teachers', locales)).toBe('/teachers');
    expect(stripLocalePrefix('/ar', locales)).toBe('/');
    expect(stripLocalePrefix('/ar?level=adult', locales)).toBe('/?level=adult');
    expect(stripLocalePrefix('/ar#faq', locales)).toBe('/#faq');
    expect(stripLocalePrefix('/teachers', locales)).toBe('/teachers');
    expect(stripLocalePrefix('/', locales)).toBe('/');
    expect(stripLocalePrefix('https://example.com/ar/x', locales)).toBe('https://example.com/ar/x');
  });
});
