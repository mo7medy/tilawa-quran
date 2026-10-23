import type { AcademyIconName } from '@/components/Academy/AcademyIcon';

export interface AccountNavigationLink {
  href: string;
  key: string;
  icon: AcademyIconName;
}
export interface AccountNavigationGroup {
  key: string;
  links: readonly AccountNavigationLink[];
}
const COMMUNICATION_LINKS = [
  { href: '/profile/messages', key: 'messages', icon: 'chat' },
  { href: '/profile/notifications', key: 'notifications', icon: 'bell' },
] as const;
export const STUDENT_ACCOUNT_GROUPS: readonly AccountNavigationGroup[] = [
  {
    key: 'navigation.learning',
    links: [
      { href: '/profile/learning', key: 'learning', icon: 'dashboard' },
      { href: '/profile/lessons', key: 'lessons', icon: 'calendar' },
      { href: '/profile/teachers', key: 'teachers', icon: 'graduation' },
      { href: '/profile/packages', key: 'packages', icon: 'package' },
    ],
  },
  { key: 'navigation.communication', links: COMMUNICATION_LINKS },
  {
    key: 'navigation.account',
    links: [
      { href: '/profile', key: 'profile', icon: 'user' },
      { href: '/profile/settings', key: 'settings', icon: 'settings' },
    ],
  },
];
export const TEACHER_ACCOUNT_GROUPS: readonly AccountNavigationGroup[] = [
  {
    key: 'navigation.teaching',
    links: [
      { href: '/dashboard/teacher', key: 'dashboard', icon: 'dashboard' },
      { href: '/dashboard/teacher/requests', key: 'requests', icon: 'mail' },
      { href: '/dashboard/teacher/lessons', key: 'lessons', icon: 'calendar' },
      { href: '/dashboard/teacher/availability', key: 'availability', icon: 'clock' },
      { href: '/dashboard/teacher/students', key: 'students', icon: 'users' },
      { href: '/dashboard/teacher/reviews', key: 'reviews', icon: 'star' },
    ],
  },
  { key: 'navigation.communication', links: COMMUNICATION_LINKS },
  {
    key: 'navigation.finance',
    links: [
      { href: '/dashboard/teacher/earnings', key: 'earnings', icon: 'wallet' },
      { href: '/dashboard/teacher/withdrawals', key: 'withdrawals', icon: 'wallet' },
      { href: '/dashboard/teacher/coupons', key: 'coupons', icon: 'ticket' },
    ],
  },
  {
    key: 'navigation.account',
    links: [
      { href: '/profile/teacher', key: 'teacher-profile', icon: 'graduation' },
      { href: '/profile/student', key: 'student-profile', icon: 'user' },
      { href: '/profile/settings', key: 'settings', icon: 'settings' },
    ],
  },
];
export const STUDENT_ACCOUNT_LINKS = STUDENT_ACCOUNT_GROUPS.flatMap(({ links }) => links);
// Keep the tuple interface used by existing integrations.
export const TEACHER_ACCOUNT_LINKS = TEACHER_ACCOUNT_GROUPS.flatMap(({ links }) =>
  links.map(({ href, key }) => [href, key]),
);
/**
 * Select the most specific section, including nested detail pages.
 * @returns {boolean} whether this link represents the current section
 */
export const isAccountLinkActive = (
  current: string,
  href: string,
  links: readonly { href: string }[],
): boolean => {
  const matches = (to: string): boolean =>
    current === to || (to !== '/profile' && current.startsWith(`${to}/`));
  return (
    matches(href) && !links.some((link) => link.href.length > href.length && matches(link.href))
  );
};

export const accountInitials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => Array.from(part)[0])
    .join('')
    .toLocaleUpperCase();
