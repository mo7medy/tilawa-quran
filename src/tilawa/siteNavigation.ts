// Shared navigation destinations for both the academy and the Quran shell.
const SITE_NAVIGATION_LINKS = [
  { href: '/#programs', key: 'programs', icon: 'graduation' },
  { href: '/teachers', key: 'teachers', icon: 'users' },
  { href: '/pricing', key: 'pricing', icon: 'package' },
  { href: '/#how-it-works', key: 'how-it-works', icon: 'calendar' },
  { href: '/#faq', key: 'faq', icon: 'chat' },
] as const;

export default SITE_NAVIGATION_LINKS;
