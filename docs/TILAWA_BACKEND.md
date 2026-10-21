# Tilawa website backend

Target project: `gsoelrejabrmzqypdchv` (`Tilawa web`). This is independent of the Flutter
application. Do not copy application users, credentials or migrations into this project.

## Implemented

| Area                | Routes / integration                                                                         | Source of truth                                                                                |
| ------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Identity            | `/register`, `/sign-in`, `/auth/callback`, `/auth/confirm`, `/logout`                        | Supabase Auth with server-readable cookies; verified server session and database RLS           |
| Student             | `/profile`, `/profile/student`, `/profile/learning`, `/profile/lessons`, `/profile/teachers` | profiles, student_profiles, bookings, lessons                                                  |
| Packages            | `/profile/packages`, `/pricing`                                                              | academy_plans, student_subscriptions, subscription_credit_ledger                               |
| Teacher             | `/profile/teacher`, `/profile/teacher/preview`, `/teachers/[slug]`, `/dashboard/teacher`     | teacher_profiles, private contacts, qualifications, offers, documents, approval history        |
| Teaching            | teacher requests, lessons, availability, students, reviews, coupons                          | server commands with actor and state checks                                                    |
| Shared lessons      | `/lessons/[lessonId]`                                                                        | participant-only lesson details, events, completion and cancellation requests                  |
| Messages            | `/profile/messages`                                                                          | private conversations, pending requests, accept/reject, block, read state, paginated history   |
| Finance             | teacher earnings and withdrawals                                                             | payment evidence, immutable credit events, verified balances and locked withdrawal requests    |
| Administration      | `/1x2003/admin/teachers`, `/1x2003/admin/teachers/[id]`, `/1x2003/admin/settings`            | private administrator membership, teacher approval and registration switch; no lesson approval |
| Quran personal data | existing bookmarks, collections, notes, pins, preferences, sessions and reading goals        | private `quran_*` tables through a compatibility adapter                                       |

Arabic/English, RTL, light/dark appearance and the existing mobile navigation are preserved.

### Teacher registration stages

The teacher editor uses two stages: information and teaching languages, then plans/pricing and the
public introduction. Going back preserves entered values. Required fields are checked before
advancing; saving checks both stages. A contact phone with at least eight digits and a
qualifications description are required, consistent with the application form. Profile photo,
introduction video and supporting document uploads remain optional; the video is recommended.

Teacher pricing uses USD only. Per-lesson, monthly and combined pricing are supported; fields for
inactive pricing modes are hidden and do not block validation. Teacher offers remain separate from
the platform's monthly packages. Saving the form does not approve a teacher: the existing separate
application submission and administrator approval flow remains in effect.

Production never uses account preview data. Local preview is available only with
`NODE_ENV=development` and `NEXT_PUBLIC_TILAWA_DEMO=1`; preview parameters never grant live
permissions.

## Configuration

The ignored local `.env` has the website URL and public publishable key. `.env.example` contains
names only:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://gsoelrejabrmzqypdchv.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<public publishable key>
NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=0
NEXT_PUBLIC_TILAWA_DEMO=0
```

Both `NEXT_PUBLIC_` values must exist at build time in the deployment environment. Ordinary server
operations use the public key plus the user's verified session. The website does not need a
service-role key. Never add a secret/service-role key to browser variables or Git.

Existing server-only `QURAN_CLIENT_ID`, `QURAN_CLIENT_SECRET` and `QURAN_API_ENV` continue serving
Quran content. They are separate from website accounts. Quran content, search, audio and font
delivery were not moved into Supabase.

### First administrator

Create a real user through the site's registration flow and confirm their email after email delivery
is configured. Obtain that user's exact UUID from Supabase Auth. From a trusted CLI session linked
to this project:

```powershell
node scripts/supabase/admin.mjs <verified-user-uuid>
```

This trusted operation checks the project and the verified user, then creates a private membership.
There is no public admin-registration endpoint. No permanent administrator or permanent demo user
has been created by these changes.

## Database and command rules

- All website public tables have RLS. Direct browser writes to business tables are revoked. Public
  read models expose only approved teachers, published reviews, plans and settings.
- Public SQL wrappers are invoker functions. Private command functions validate `auth.uid()`,
  active-account state, ownership and transitions. Browser metadata and preview role switches cannot
  establish teacher/admin authority.
- Auth creates the common profile and student record. Saving a teacher draft and submitting it are
  separate steps; only a trusted admin approves or rejects it. Registration is open by default and
  can be closed through admin settings.
- A teacher accepts their eligible booking requests. Idempotency receipts protect command replay and
  reject using one key with a different payload. Schedule locks protect both teacher and student
  against overlapping simultaneous requests.
- Available times are interpreted in the teacher's IANA zone and displayed for the student's zone.
  Ambiguous daylight-saving times, past slots, slots outside the window, duration overflow and
  actual conflicts are rejected server-side.
- Website packages: 8/$80, 12/$100, 16/$120, USD, 45 minutes. Thirty calendar days plus five grace
  days; no rollover. The two larger plans grant one distinct gift credit. An Arabic-package student
  may use that gift for Quran correction or memorization.
- Teacher subscriptions and prices remain separate. Credits reserve on request, release on
  rejection/confirmed cancellation, and consume only after completion. Expired credits cannot be
  resurrected through cancellation.
- Paid subscriptions require a matching verified paid order and transaction. Browser writes and
  manual activation are unavailable. Earnings require payment proof and the eligible completed
  lesson or matured teacher subscription; aggregate earnings cannot exceed the recorded net amount.
  Withdrawal creation checks a live Auth session and locks the balance.
- Free introductory lessons are not subscription gifts. One active/completed intro is permitted per
  student/teacher; cancelled or rejected attempts can be retried. Regular completion requires the
  lesson to have passed and the student's response. Maintenance only automatically completes overdue
  introductory lessons, expires holds and unused credits.
- Messages are limited to participants. A pending message request accepts one initial message; the
  recipient chooses accept/reject. Blocked conversations reject further sends. Reviews require the
  student's own completed eligible lesson.

Migrations live in `supabase/migrations/`. Already-applied migrations are immutable; corrections are
subsequent migrations. The project guard refuses a different linked project. The five-minute
database job is named `tilawa-maintenance`.

The separate `tilawa-message-retention` job also runs every five minutes. It deletes message history
after 60 days without a new message, keeping the conversation and its request/block states. See
[message retention](TILAWA_MESSAGE_RETENTION.md) for receipt privacy, Realtime and verification.

## Files, privacy and reader compatibility

- `tilawa-avatars`: private bucket, JPEG/PNG/WebP, 5 MB. The UI uploads when the profile is saved,
  then records the owner's object path. Public approved portraits use short-lived signed URLs.
- `tilawa-teacher-documents`: private bucket, PDF/images, 10 MB. Only the applicant and trusted
  administrators can read the file. They are not part of the public teacher profile.
- Account APIs and private SSR pages send `private, no-store`; the service worker bypasses account
  endpoints and sensitive routes, and clears legacy generic API caches during activation.
- Account switching clears authenticated SWR and persisted private Quran state. Guest
  bookmarks/history are backed up separately. Import requires an explicit choice; it unions
  bookmarks/pins and preserves an existing account reading position. No automatic legacy-account
  import runs with the new backend.
- Original reader contracts are adapted to the new tables: verse-key bookmark/count maps, collection
  pagination and pinned-item envelopes. Quran notes remain private. External QuranReflect
  publishing, community accounts, campaigns and courses are not recreated.
- Reading ranges are validated against chapter verse counts. Range activity stores a union of page
  identifiers, so overlapping requests do not count pages twice. Time/page/range goals use the
  profile timezone and supported Mushaf layouts. Reading-time estimates use **two minutes per
  touched page** and are estimates, not measured recitation durations.
- Mushaf page boundaries come from the existing server-side content integration. Supported layouts
  include the 610-page and 548-page IndoPak variants, consistent with the
  [official page-layout API](https://api-docs.quran.foundation/docs/tutorials/fonts/page-layout/).

## Validation and test data

```powershell
node scripts/supabase/project.mjs push           # identity check, link, dry-run only
node scripts/supabase/project.mjs push --apply   # apply pending migrations to this website project
node scripts/supabase/smoke.mjs                  # real database permission/concurrency tests
node scripts/supabase/smoke.mjs --browser        # also test local site in installed Edge
```

The smoke runner uses trusted CLI credentials only in memory to create temporary confirmed users and
controlled payment fixtures. It does not change project-wide confirmation settings or call a payment
provider. `finally` deletes the exact test users and their related rows. Never use test fixtures to
activate a real customer's subscription. Browser tests require the local site on `127.0.0.1:3000`;
they do not download a browser or fonts. Reports/screenshots are ignored under `.local-runtime/`.

Run scoped Vitest, TypeScript, ESLint and formatting checks before delivery. Public reader routes
and existing Quran content tests remain part of regression verification. Database advisor checks
cover RLS, function privileges and indexes.

## Still intentionally disabled / required before public launch

1. Configure the real site URL, allowed localhost/preview/production callback URLs, SMTP and email
   templates in Supabase Auth. Keep email confirmation enabled. For token-hash templates,
   confirmation targets `/auth/confirm?token_hash={{ .TokenHash }}&type=email`; recovery targets the
   recovery flow. The handlers also support PKCE code callbacks. Test real email confirmation and
   recovery after this setup.
2. Configure Google credentials/provider and exact callback allowlist before setting
   `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=1`. Until then, its button remains disabled.
3. Create the first real admin membership, then approve actual teacher applications. Public teacher
   lists correctly remain empty without approved teachers.
4. Configure a payment provider, verified webhooks, commission/settlement/refund policies,
   subscription activation and payout execution in a separate phase. Current UI cannot purchase or
   claim a paid activation. Withdrawal requests do not transfer money.
5. Configure the meeting provider later. No manual or fabricated meeting links are displayed.
6. Add the public Supabase variables to Cloudflare build/runtime configuration when deployment is
   authorized. No Git push, site deployment or production build is included in this delivery.

## Delivery verification (2026-10-18)

- 119 focused Vitest assertions passed across 20 files.
- 98 real database/browser assertions passed, including cookies, profile saves, private reader
  contracts, responsive layouts, teacher/admin pages and logout. Temporary accounts, uploads and
  payment fixtures were removed.
- Additional private-student-data authorization was tightened for teacher-approval administrators
  and checked separately.
- Scoped source TypeScript and ESLint checks passed; account SCSS passed Stylelint. Next.js page
  entry validation and `git diff --check` passed. Localized source/protocol mapping exceptions are
  documented inline.
- Database security/performance advisors reported no warnings or errors.
- The local chapter 22 reader returned HTTP 200 with five verses and no rendered error. The existing
  content metadata endpoint also returned 200. Public plans returned the approved prices/durations.
  No fonts or Quran assets were installed for these checks.
- Email delivery, Google OAuth, payment collection/payouts, meeting provisioning and an actual
  Cloudflare production build/deployment were not tested or enabled.

## Administration reports

Operational statistics and the read-only USD finance section are implemented under `/1x2003/admin`.
The reporting RPCs and indexes are applied to the independent website project. See
[TILAWA_ADMIN_REPORTS.md](TILAWA_ADMIN_REPORTS.md) for definitions, permission boundaries, UTC date
filtering, CSV limits and verification. Payment collection remains disabled.

## Account and administration completion (2026-10-20)

Live paginated directories, small account bootstrap, per-conversation history, TOTP enforcement,
whole-ledger balances and failure handling are implemented. Three additional website migrations are
applied. See [delivery and remaining setup](TILAWA_BACKEND_COMPLETION.md). These source/database
changes are separate from a Git push or Cloudflare release.
