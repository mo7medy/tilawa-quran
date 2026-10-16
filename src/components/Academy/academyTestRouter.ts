/**
 * Shared mutable router state for academy tests.
 *
 * `vi.mock` factories run before the importing test file's own top-level
 * initializers, so the factory in `AcademyHome.test.tsx` cannot close over a
 * variable declared there. Importing this module first guarantees the state
 * object exists before any mocked-router consumer is evaluated — a hoisted,
 * fully typed alternative to untyped `globalThis` buckets.
 */

interface AcademyTestRouterState {
  lang: 'en' | 'ar';
  pathname: string;
  asPath: string;
  locales: string[];
  /** Last SEO URL captured by page tests (reset per test as needed). */
  seoUrl?: string;
}

export const academyTestRouterState: AcademyTestRouterState = {
  lang: 'en',
  pathname: '/',
  asPath: '/',
  locales: ['en', 'ar', 'fr'],
};

/**
 * Point the mocked academy router at a route.
 *
 * @param {AcademyTestRouterState['lang']} lang active locale
 * @param {string} pathname Pages Router pathname (locale-unprefixed)
 * @param {string} asPath path as shown in the browser (locale-prefixed)
 * @returns {void}
 */
export const setAcademyTestRoute = (
  lang: AcademyTestRouterState['lang'],
  pathname: string,
  asPath: string,
): void => {
  academyTestRouterState.lang = lang;
  academyTestRouterState.pathname = pathname;
  academyTestRouterState.asPath = asPath;
};
