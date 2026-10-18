/**
 * Tilawa academy route classification.
 *
 * Pure (no hooks, no router) so it can be used in `_app.tsx` to split the
 * academy shell from the original Quran shell, and unit-tested in isolation.
 *
 * NOTE: `router.pathname` in the Pages Router is locale-unprefixed, so `/`
 * covers both `/` and `/ar`, and `/teachers` covers `/ar/teachers`.
 */

/** Pathnames rendered with the standalone Tilawa academy shell. */
export const ACADEMY_ROUTE_PATHNAMES: readonly string[] = [
  '/',
  '/teachers',
  '/pricing',
  '/register',
  '/sign-in',
  '/profile',
];

/** Locales with first-class academy content (`locales/<locale>/academy.json`). */
export const ACADEMY_LOCALES = ['en', 'ar'] as const;

/** Academy-supported locale code. */
export type AcademyLocale = (typeof ACADEMY_LOCALES)[number];

/**
 * Whether a Pages Router pathname belongs to the Tilawa academy surface
 * (and therefore must NOT mount the Quran navbar/footer/audio/font stack).
 *
 * @param {string} pathname Next.js `router.pathname` (e.g. `/`, `/teachers`)
 * @returns {boolean} true for academy routes, false for Quran/auth routes
 */
export const isAcademyRoutePathname = (pathname: string): boolean => {
  return (
    ACADEMY_ROUTE_PATHNAMES.includes(pathname) ||
    pathname.startsWith('/teachers/') ||
    pathname.startsWith('/profile/') ||
    pathname === '/dashboard/teacher' ||
    pathname.startsWith('/dashboard/teacher/') ||
    pathname.startsWith('/lessons/') ||
    pathname === '/admin' ||
    pathname.startsWith('/admin/') ||
    pathname.startsWith('/auth/')
  );
};

/**
 * Prefix an academy href with a non-default locale, preserving query and hash.
 * Used wherever a plain string URL is needed (sitemaps, tests, metadata);
 * rendered links should prefer {@link AcademyLink} (`src/components/Academy/AcademyLink.tsx`).
 *
 * @param {string} href site-absolute path (e.g. `/teachers`, `/#programs`)
 * @param {string | null | undefined} locale active locale (`en` stays unprefixed)
 * @returns {string} localized href
 */
export const withLocalePrefix = (href: string, locale?: string | null): string => {
  if (!locale || locale === 'en') return href;
  if (!href.startsWith('/')) return href;
  const queryIndex = href.indexOf('?');
  const hashIndex = href.indexOf('#');
  let splitAt = href.length;
  if (queryIndex !== -1) splitAt = Math.min(splitAt, queryIndex);
  if (hashIndex !== -1) splitAt = Math.min(splitAt, hashIndex);
  const path = href.slice(0, splitAt);
  const suffix = href.slice(splitAt);
  // Mirror `next/link` output exactly (verified by AcademyHome tests): the
  // locale goes directly before the path, and a root path contributes no
  // extra slash (`/#programs` -> `/ar#programs`, `/` -> `/ar`).
  if (suffix === '') return path === '/' ? `/${locale}` : `/${locale}${path}`;
  return `/${locale}${path === '/' ? '' : path}${suffix}`;
};

/**
 * Remove a leading locale segment (`/ar/teachers` -> `/teachers`) so a URL can
 * be re-prefixed for another locale. Query and hash are preserved.
 *
 * @param {string} href site-absolute path, possibly locale-prefixed
 * @param {readonly string[]} locales known locale codes
 * @returns {string} unprefixed path (`/` when only a locale segment remains)
 */
export const stripLocalePrefix = (href: string, locales: readonly string[]): string => {
  if (!href.startsWith('/')) return href;
  const queryIndex = href.indexOf('?');
  const hashIndex = href.indexOf('#');
  let splitAt = href.length;
  if (queryIndex !== -1) splitAt = Math.min(splitAt, queryIndex);
  if (hashIndex !== -1) splitAt = Math.min(splitAt, hashIndex);
  const path = href.slice(0, splitAt);
  const suffix = href.slice(splitAt);
  const segments = path.split('/');
  if (segments.length >= 2 && locales.includes(segments[1])) {
    const rest = segments.slice(2).join('/');
    return `/${rest}${suffix}`;
  }
  return href;
};
