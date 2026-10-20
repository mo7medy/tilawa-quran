import { safeAccountRedirect } from './redirect';

import { stripLocalePrefix, withLocalePrefix } from '@/utils/tilawaRoutes';

export const authDestination = (
  value: unknown,
  locale?: string | null,
  recovery = false,
): string => {
  const target = recovery ? '/sign-in?reset=1' : safeAccountRedirect(value);
  return withLocalePrefix(stripLocalePrefix(target, ['en', 'ar']), locale === 'ar' ? 'ar' : 'en');
};
export const authCallbackPath = (
  next: unknown,
  locale?: string | null,
  recovery = false,
): string => {
  const params = new URLSearchParams({
    next: authDestination(next, locale, recovery),
    lang: locale === 'ar' ? 'ar' : 'en',
  });
  return `/auth/${recovery ? 'callback' : 'confirm'}?${params}`;
};
