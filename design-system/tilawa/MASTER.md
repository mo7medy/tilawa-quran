# Tilawa learning website

## Direction

A welcoming, modern learning platform. Keep Tilawa turquoise and supplied photography; use clear
interface typography, useful outline icons, calm surfaces, and restrained amber highlights. The
Quran reader shares the header; its reading and audio tools remain independent.

## Foundations

- English: system sans-serif. Arabic: existing Cairo family. Preserve the brand wordmark.
- Spacing: 8 / 16 / 24 / 32px. Controls: 12px radius; cards: 20px; shell: 24px.
- Shared maximum content width: 1380px, with responsive 16–32px outer gutters.
- Use the semantic `--tilawa-*` tokens for both light and dark modes; amber is an accent, not a
  substitute for success/error states. Normal text must reach 4.5:1 contrast.
- Icons: `AcademyIcon`, 20px in controls and 24px in card headings, 1.7px outline stroke. Decorative
  icons use `aria-hidden`; icon controls retain accessible labels.
- Interaction: 150–200ms color/opacity feedback; visible focus, no layout movement. Respect
  `prefers-reduced-motion`. Keep interactive controls at least 44 CSS pixels high.

## Navigation

- Desktop above 1200px: brand, primary navigation, combined user tools. At/below 1200px use the
  shared drawer and message/notification shortcuts; all account sections remain available there.
- `src/tilawa/account/navigation.ts` defines account groups for both sidebar and drawer. Select the
  most specific matching section, including nested detail routes.
- Student groups: Learning (Overview, Lessons, My teachers, My packages), Communication (Messages,
  Notifications), Account (Personal information, Account settings).
- Teacher groups: Teaching, Communication, Finances, Account. Preserve role permissions and URLs.
- The account menu exposes overview/dashboard, profile, settings, authorized administration, logout.
- Update English and Arabic design copy together, using `next-translate` and logical CSS properties.

## Content and states

- Each page has a clear primary action. Use a title, short explanation and a meaningful icon for
  empty states; do not invent statistics, reviews, schedules, subscriptions or testimonials.
- Keep real booking, plan-selection, authentication and messaging flows intact. Show loading, error,
  disabled and selected states explicitly. Preserve visible form labels.
- Reuse current images and avoid additional icon, animation or font libraries.

## Validation

Review EN/AR and light/dark at 375, 768, 1024 and 1440px, plus 200% zoom. Check long labels,
overflow, focus restoration, role navigation, unread counts, empty/populated data and reduced
motion. Use focused behavior tests, TypeScript, ESLint, formatting and browser screenshots.
Production builds run through the existing remote CI workflow.
