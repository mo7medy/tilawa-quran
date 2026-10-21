export const STUDENT_ACCOUNT_LINKS = [
  { href: '/profile/learning', key: 'learning' },
  { href: '/profile/lessons', key: 'lessons' },
  { href: '/profile/teachers', key: 'teachers' },
  { href: '/profile/packages', key: 'packages' },
  { href: '/profile', key: 'profile' },
  { href: '/profile/settings', key: 'settings' },
] as const;

export const accountInitials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => Array.from(part)[0])
    .join('')
    .toLocaleUpperCase();

export const TEACHER_ACCOUNT_LINKS = [
  ['/dashboard/teacher', 'dashboard'],
  ['/profile/teacher', 'teacher-profile'],
  ['/profile/student', 'student-profile'],
  ['/dashboard/teacher/requests', 'requests'],
  ['/dashboard/teacher/lessons', 'lessons'],
  ['/dashboard/teacher/availability', 'availability'],
  ['/dashboard/teacher/students', 'students'],
  ['/dashboard/teacher/reviews', 'reviews'],
  ['/dashboard/teacher/coupons', 'coupons'],
  ['/dashboard/teacher/earnings', 'earnings'],
  ['/dashboard/teacher/withdrawals', 'withdrawals'],
  ['/profile/messages', 'messages'],
  ['/profile/notifications', 'notifications'],
];
