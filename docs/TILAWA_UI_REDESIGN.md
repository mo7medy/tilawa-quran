# Learning website visual refresh

The learning website now uses shared interface typography, turquoise surfaces, outline icons and
consistent card/control geometry. Design decisions live in
[the design system](../design-system/tilawa/MASTER.md).

## Behavior changes

- The header has three layout regions. Language, appearance, notifications and account controls
  share one tools region, with a compact treatment just above the 1200px drawer breakpoint.
- Primary links expose their active section, including teacher details and Quran chapter routes.
- Student/teacher account groups are shared by the sidebar and mobile drawer. Communication and
  account settings remain reachable in both roles; nested sections select their most specific link.
- The account dropdown includes overview/dashboard, personal information, settings, authorized
  administration and logout, with icons and an explicit dropdown indicator.
- Overview replaces "My learning". Empty sections are compact and actionable. English and Arabic
  labels were updated together with explicit user authorization.
- Home, teacher cards/details, pricing, authentication and messaging use the same visual language.
  Existing prices, reviews, booking/authentication handlers and backend contracts are preserved.

## Reproduced defects fixed

1. **Dropdown links lost their menu semantics and layout:** the shared link swallowed Radix
   attributes, interaction handlers and refs. It now forwards anchor attributes and the DOM ref to
   Next Link. Menu rows retain `role=menuitem`, styling, keyboard selection and focus restoration.

2. **Optional subscription expiry crashed rendering:** `expiresAt` is optional, but was passed
   unconditionally to `Intl.DateTimeFormat`. A missing value now shows the translated "Not added
   yet" label. An English/Arabic regression test exercises the connected-account rendering path.
3. **Loading/failure appeared as an empty teacher directory:** the directory previously rendered its
   empty state while the initial request was loading or had failed. Loading now reserves card space;
   failure offers retry, and the empty message appears only after a successful empty result.
4. **Current navigation was absent or ambiguous:** the desktop header had no active state;
   communication pages were missing from the student sidebar. Shared navigation and most-specific
   matching now preserve context across desktop, mobile and nested routes.

## Local verification

- 128 focused Vitest tests cover account roles, EN/AR rendering, forms, booking selection,
  messaging, hydration, menu focus restoration, navigation matching and the defect regressions.
- TypeScript application validation, ESLint, Stylelint, Prettier and `git diff --check` are run on
  the changed code. Existing native-image lint advisories remain warnings.
- Edge browser review covers 176 fixture layouts: 11 page types × EN/AR × light/dark ×
  375/768/1024/1440px, with overflow, accessible button names and nested-anchor checks.
- Another 30 cases cover desktop header overlap for three roles at 1201/1280/1440px and reduced
  motion with a 720 CSS-pixel viewport at device scale 2 (equivalent layout width for a 1440px
  display at 200% zoom). This emulation does not replace browser-native zoom or assistive-device QA.
- Before/after screenshots use the same isolated fixtures for 11 page types. The comparison uses an
  empty package list because old code cannot render a connected fixture without expiry.
- The actual Next.js development server also loads `/`, `/ar`, `/pricing`, `/ar/pricing`,
  `/register`, `/ar/register`, `/sign-in` with HTTP 200 and no browser hydration/runtime errors.
- Browser reports and screenshots are local artifacts under `.local-runtime/modern-*`; fixtures do
  not create accounts, bookings, payments or messages. Live authenticated production workflows have
  not been exercised by these visual checks.

The installed local Next.js runtime is 15.5.27; the repository lockfile targets 15.5.28. No local
production build or production deployment is part of this verification. The existing remote CI build
remains the release check before production publishing.
