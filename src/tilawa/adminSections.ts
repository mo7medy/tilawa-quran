/** Website administration only; mobile-app wallets, rooms and campaigns are outside this scope. */
export const ADMIN_BASE_PATH = '/1x2003/admin';

export const ADMIN_SECTIONS = [
  'overview',
  'teachers',
  'students',
  'lessons',
  'subscriptions',
  'finance',
  'audit',
  'settings',
  'video-studio',
] as const;

export type AdminSection = (typeof ADMIN_SECTIONS)[number];

export const isAdminRoutePathname = (pathname: string): boolean =>
  pathname === ADMIN_BASE_PATH || pathname.startsWith(`${ADMIN_BASE_PATH}/`);

export const getAdminSection = (section?: string): AdminSection | null => {
  if (!section) return 'overview';
  return ADMIN_SECTIONS.find((item) => item === section) ?? null;
};
