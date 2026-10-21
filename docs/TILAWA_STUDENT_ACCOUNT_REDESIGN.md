# Student account redesign — 2026-10-21

## Delivered behavior

- Section signing no longer manufactures an empty owner profile. The bootstrap identity, email,
  permissions and counters remain authoritative while route content loads, refreshes or fails.
- The student profile opens in read mode with the real avatar/initials, name and localized country.
  Editing uses a separate draft; background refresh preserves the draft and cancellation restores
  the latest saved data. Only name and country are required. Birthday, photo and learning
  preferences remain optional. There is no minimum age.
- Country selection accepts legacy values. Device time zone is an explicit suggestion, never a
  silent write. PNG/JPEG/WebP previews remain local until saving, with the existing 5 MB limit.
- `/profile/settings` separates email/password management and reads only the account bootstrap.
  Email changes retain the localized confirmation callback; password/email outcomes remain distinct.
- The signed-in header offers teacher search (or the teacher dashboard), messages, Quran, unread
  notifications and an avatar menu. Guest marketing navigation remains available to guests. The
  Quran shell uses the same session, account menu and shared mobile drawer; its language, search,
  reading tools and sidebar behavior are preserved.
- Student account sections are learning, lessons, associated teachers, packages, profile and
  settings. There is one mobile drawer, no separate live-account banner, and a compact account
  footer. Public footers suppress sign-up/sign-in links for authenticated users.
- `/profile/learning` shows the next/current lesson, live package balances and latest three visible
  conversations. Empty states offer teacher/package exploration without claiming payment activation.
  No charts, progress percentages or statistical cards were added.
- Account translations load for all routes, including Quran and marketing pages, with the existing
  English fallback for reader languages other than Arabic.

## API and database compatibility

Existing HTTP paths and public RPC signatures are retained. Bootstrap adds `unreadMessages`; the
`home` read adds active `subscriptions` with the existing full-ledger credit summary and
`recentConversations` (`id`, `peerId`, `peerName`, `preview`, `createdAt`, `unread`). Unread counts
use participant membership and existing per-user read/hidden/blocked state, exclude retracted and
self-sent messages, and are independent of history pagination.

New migration: `supabase/migrations/20261020231431_tilawa_student_account_redesign.sql`. It wraps
existing read/command implementations, keeps prior helper execution private, allows optional student
fields, and publishes the relevant owner-scoped tables for Realtime updates. Existing RLS, MFA,
teacher approval, booking, payment and idempotency rules remain in effect.

**The migration has not been applied to production.** Apply and verify it before deploying the
dependent frontend. Do not edit previously applied migrations. No new tables, Auth settings, payment
integrations, packages, fonts or images were introduced by this redesign.

## Verification and local preview

The isolated SQL verifier loads the entire migration chain without any production connection:
`node scripts/supabase/verify-backend-completion.mjs`. Its 87 checks include optional profile
fields, replay conflicts, date validation, ownership, full-ledger balances, unread history, read
markers, hidden conversations and anonymous/helper ACLs.

All 230 focused Vitest tests passed, covering draft refresh/cancel behavior, submission locking,
required/optional fields, header roles, mobile navigation, account screens, Supabase authorization,
confirmation and reader regressions. Source TypeScript, ESLint, Stylelint, formatting and Next
page-entry checks are included.

The local visual run passed 100 layout/state checks. The ignored component harness runs the real
account/header/footer components with synthetic data and a mocked account provider. It verifies
EN/AR, both themes, 360/390/768/1024/1440 pixels, profile edit/save, empty learning, avatar menu and
mobile drawer keyboard behavior. External requests are blocked. It is not a real signed-in account
or a production end-to-end test.

Preview URLs while the local helper is running:

- Profile: `http://127.0.0.1:3112/?lang=ar&theme=dark`
- Learning: `http://127.0.0.1:3112/?lang=ar&theme=dark&section=learning`
- Settings: `http://127.0.0.1:3112/?lang=ar&theme=dark&section=settings`
- Empty learning: add `&empty=1` to the learning URL.

Production migration application, Git push, deployment and real-user/inbox confirmation are separate
delivery steps. Previously implemented email waiting-page changes are preserved in this working
tree.

## Tablet correction — 2026-10-21

The account sidebar was hidden at 1200 px, but a later 1000 px media query restored a two-column
layout. The only visible child then occupied the 210 px first column. Removing that conflicting rule
lets profile, learning and settings use the available tablet width. The earlier visual check only
asserted the absence of horizontal overflow; it now also checks actual content and field widths.

The shared drawer now has a fixed brand/close row and a separately scrollable body. Account sections
and quick links are grouped, tablet width is 400 px, and localized account routes correctly
highlight the current section. Mobile/tablet message and notification shortcuts sit next to the menu
button.

The follow-up browser check passed 132 layouts across 360, 390, 767, 768, 834, 865, 1000, 1024,
1200, 1201 and 1440 px, both languages and themes, including a 600 px landscape height. It also
checks edit-field width, drawer scrolling, a visible close button, active links and Escape focus
restoration. Eleven focused header/shared-menu tests, source TypeScript, ESLint and Stylelint passed
(the existing logo `<img>` optimization warning remains). No backend or production settings changed.
