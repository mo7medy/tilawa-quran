/**
 * Canonical site origin for user-visible URLs (verse share/copy links, SEO).
 *
 * Resolution order:
 * 1. `NEXT_PUBLIC_SITE_URL` — explicit production configuration (documented in
 *    `.env.example`). Wins everywhere, including the browser.
 * 2. Browser `window.location.origin` — always correct on the client.
 * 3. Vercel compatibility vars (`NEXT_PUBLIC_VERCEL_URL`,
 *    `VERCEL_PROJECT_PRODUCTION_URL`, `VERCEL_URL`) — server-side fallback.
 * 4. `''` — unknown (callers fall back to site-relative paths; never to a
 *    hardcoded legacy host).
 *
 * This is intentionally separate from `getBasePath` (`./url`), which builds
 * INTERNAL proxy URLs (`/api/proxy/...`) and must keep its behavior intact.
 */

interface SiteOriginSources {
  explicitSiteUrl?: string;
  browserOrigin?: string;
  vercelHost?: string;
}

const stripTrailingSlashes = (value: string): string => value.replace(/\/+$/, '');

const withProtocol = (host: string): string => {
  const trimmed = host.trim();
  if (/^https?:\/\//i.test(trimmed)) return stripTrailingSlashes(trimmed);
  const protocol =
    trimmed.startsWith('localhost') || trimmed.startsWith('127.0.0.1') ? 'http' : 'https';
  return `${protocol}://${stripTrailingSlashes(trimmed)}`;
};

/**
 * Resolve the canonical origin from explicit sources (pure — unit-tested).
 *
 * @param {SiteOriginSources} sources origin candidates
 * @returns {string} normalized origin (`https://host`, no trailing slash) or `''`
 */
export const resolveSiteOrigin = (sources: SiteOriginSources): string => {
  if (sources.explicitSiteUrl && sources.explicitSiteUrl.trim() !== '') {
    return withProtocol(sources.explicitSiteUrl);
  }
  if (sources.browserOrigin && sources.browserOrigin.trim() !== '') {
    return stripTrailingSlashes(sources.browserOrigin.trim());
  }
  if (sources.vercelHost && sources.vercelHost.trim() !== '') {
    return withProtocol(sources.vercelHost);
  }
  return '';
};

/**
 * Canonical origin of THIS deployment for user-visible URLs.
 *
 * @returns {string} origin or `''` when unknowable
 */
export const getSiteOrigin = (): string =>
  resolveSiteOrigin({
    explicitSiteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    browserOrigin:
      typeof window !== 'undefined' && window.location ? window.location.origin : undefined,
    vercelHost:
      process.env.NEXT_PUBLIC_VERCEL_URL ||
      process.env.VERCEL_PROJECT_PRODUCTION_URL ||
      process.env.VERCEL_URL,
  });
