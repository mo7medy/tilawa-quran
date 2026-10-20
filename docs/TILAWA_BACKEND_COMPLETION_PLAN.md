# Tilawa backend completion plan

Status: implemented on 2026-10-20. See [delivery and verification](TILAWA_BACKEND_COMPLETION.md).
The audit findings below describe the baseline. Owner/provider setup remains separate.

Baseline: `eadb6bf34633abd5b1d5fe70a9905d92ffe672b2`, branch `production`. Independent website
project: `gsoelrejabrmzqypdchv`. The Flutter application's database is outside scope.

## Goal and boundaries

Complete backend work that can be implemented and tested without selecting a real administrator,
providing provider credentials, enrolling a personal authenticator, or deciding new business rules.
Preserve the approved Tilawa identity, Arabic/English, RTL, appearance settings, navigation and
reader.

Administrator access remains under `/1x2003/admin`. Administrators approve teachers, never lessons.
Website packages remain 8/$80, 12/$100 and 16/$120, USD and 45 minutes; teacher pricing stays
separate. Payments, meetings, actual payouts, support, coins, gifts and voice rooms are not enabled
by this plan. The package's existing complimentary lesson is preserved.

No production users or paid subscriptions will be fabricated. Existing migrations remain immutable.
No new fonts, images or large dependencies are required. Git push and deployment are separate work.

## Audit findings

| Finding                                                                                    | Evidence inspected                                                                                            | Consequence                                                                                                          |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Students, lessons and subscription administration lists are not connected                  | `src/components/Admin/AdminPlannedSection.tsx`, `AdminSectionContent.tsx`, `AdminSubscriptions.tsx`           | The console has prepared tables but cannot display real records in these sections.                                   |
| Administrator snapshot loads all teacher profiles, contacts, documents and approval events | `private.tilawa_admin_snapshot`, `src/components/Account/AdminAccount.tsx`, `src/lib/supabase/protectPage.ts` | Even checking an admin page fetches a full directory; search/filtering is in the browser.                            |
| Audit history is limited to the latest 100 events with no further pages                    | Same snapshot and `src/components/Admin/AdminAudit.tsx`                                                       | Older actions cannot be browsed; the UI does not identify actor/target clearly.                                      |
| Teacher form requirements are stronger than database command checks                        | `useTeacherRegistration.ts`, `TeacherPresentationFields.tsx`, `private.tilawa_command`                        | Phone digit count and nonempty qualification/presentation content need equivalent server validation.                 |
| Latest messages are capped globally, rather than fetched per selected conversation         | `private.tilawa_snapshot`, `LiveMessages.tsx`, current `messages` API                                         | An older conversation outside the latest 200 messages can show no messages and no load-earlier control.              |
| Most account history is aggregated into one response without pagination                    | `private.tilawa_snapshot`, `LiveAccountProvider.tsx`                                                          | Lessons, subscriptions, credits, earnings and related records grow the response; Realtime events refresh everything. |
| Notifications expose only the latest 50 records                                            | Account snapshot and `AccountNotifications.tsx`                                                               | Older notifications have no navigation.                                                                              |
| Uploads and profile/database saves are separate operations                                 | `uploadProfilePhoto.ts`, `TeacherDocuments.tsx`, `LiveAccountProvider.tsx`                                    | Failed saves can leave a newly uploaded file unreferenced; opening signed documents has little error feedback.       |
| Auth callback handlers do not explicitly carry the originating locale/context              | `AcademyAccountForm.tsx`, `auth/callback.tsx`, `auth/confirm.tsx`                                             | Localized registration, recovery and intended destination need end-to-end handling and tests.                        |
| Admin membership checks do not require MFA assurance                                       | Live `private.tilawa_is_admin`, route guard and admin commands                                                | TOTP enrollment/challenge and database-enforced assurance are an additional implementation phase.                    |
| Generic backend error mapping lacks a distinct operational failure path                    | `src/lib/supabase/server.ts`                                                                                  | Unexpected errors can appear as validation failures; safe diagnostic correlation is needed.                          |

Live checks: 13 applied migrations; all public tables have RLS; security advisors reported no
issues. `tilawa-maintenance` is active every five minutes and its latest inspected run succeeded
(`2026-10-19T23:30:00Z`). Realtime includes conversations, messages, notifications, bookings and
lessons. There are no administrator memberships and no approved teachers. Payments and meetings are
disabled. These are observations, not defects requiring invented users, approvals or financial
transactions.

## Implementation sequence

### 1. Match server validation to the approved teacher registration

- Add a new migration with focused validation helpers and command changes; do not rewrite migration
  history.
- Validate names, country, phone digits, supported specialties, nonempty language entries, bilingual
  text shapes/content, qualifications, experience, pricing mode, integer USD cents and optional
  HTTPS video.
- Validate both save and submission appropriately using the existing workflow; preserve optional
  uploads/video.
- A field belonging to an inactive pricing mode must not block a valid registration.
- Keep existing approval authority, existing approved records and unrelated business rules
  unchanged.
- Return translated field/action errors without raw SQL or private data.

Acceptance: direct API/RPC calls cannot bypass requirements enforced by the browser. Valid
Arabic-only or English-only presentation content works; empty JSON strings/arrays do not pass as
completed content. No teacher can approve themselves. Per-lesson, monthly and combined pricing each
have coverage.

### 2. Connect the three administration lists

- Add bounded, administrator-only read RPCs and API handlers for students, lessons and
  subscriptions.
- Use deterministic ordering, 25-record pages, validated search/status/subject/date filters and
  total counts.
- Students return only operational identity, country, enabled state and joining date. Exclude date
  of birth, learning notes, private messages and documents.
- Lessons return participants' display names, subject/type, date/time zone, duration and status. Do
  not reuse participant-only lesson details to grant administrators access to private meeting links
  or messages.
- Subscriptions return source, participant display names, package, subject, term, status and
  calculated remaining/reserved/used credits. Separate website packages from teacher subscriptions.
- Replace the prepared placeholder tables with actual loading, error/retry, empty and paginated
  states.
- No account suspension, subscription activation, lesson acceptance or money mutation is added.

Acceptance: anonymous/nonadmin users cannot call any read model. Filters work on the server, page
boundaries do not repeat records with equal timestamps, and credit totals match the existing ledger.
Empty production data is shown honestly.

### 3. Split administrator access checks, directory, details and audit

- Replace the full-snapshot route authorization call with a minimal active-user/admin access check.
- Fetch teacher list summaries separately from applicant contact/documents/history detail.
- Move teacher search/approval filtering and audit history to bounded server queries.
- Show audit action, actor display name, target reference, date and existing safe details with
  date/action filters and pagination. Do not add conversation inspection or invent new administrator
  powers.
- Keep current approval/rejection/settings commands and audit writes intact.
- Retain compatibility only where a caller still needs the old snapshot; remove it from normal page
  guards.

Acceptance: opening overview/settings no longer downloads every applicant's documents/contact
fields. The existing approval flow still works. More than 100 audit events are browsable in tests.

### 4. Fix conversation loading and paginate notifications

- Fetch the selected conversation's latest messages even when it has no messages in the account
  bootstrap.
- Keep the current stable `(created_at, id)` history cursor; return an explicit next cursor/has-more
  state.
- Isolate cached history by authenticated user and conversation; clear it on account switch.
- Preserve message requests, accept/reject/block/read behavior and participant checks.
- Add notification history pagination and an accurate unread count independent of the latest page.
- Preserve per-notification read actions and duplicate event protection.

Acceptance: with more than 200 messages across several conversations, opening an old conversation
still loads its history. Equal timestamps, empty histories, reconnects and account changes are
tested. Notification records beyond the first 50 remain accessible to their owner only.

### 5. Reduce account payloads and unnecessary refreshes

- Introduce a small account bootstrap for identity, role, settings, balances and the next relevant
  lesson.
- Add owned/participant-filtered paginated read models for requests, lessons, subscriptions, linked
  people, earnings/withdrawals and their necessary detail views, migrating callers in small steps.
- Keep authoritative credit/balance calculations in SQL; never calculate totals from just one page.
- Separate list summaries from lesson history and sensitive details.
- Invalidate only affected SWR keys on commands/Realtime changes, coalesce event bursts and
  revalidate after reconnect/focus. RLS remains the authorization mechanism, even with narrower
  subscriptions.
- Refresh expiring signed avatar URLs through the existing authenticated/public read boundaries.

Acceptance: history size does not cause unbounded bootstrap growth. A message no longer refreshes
every financial/history list. Lesson changes still appear in both participants' views, with
consistent zones, credits and permissions. Existing Quran personal-data APIs keep their contracts.

### 6. Complete file and authentication flow handling

- Track the exact new upload and compensate safely if its metadata/profile save fails definitively.
  On an ambiguous timeout, check whether it was committed before deleting any object.
- Use the Storage API, never direct SQL deletion of Storage metadata. Do not bulk-delete historical
  files. Do not delete an avatar still referenced by either student or teacher profile.
- Add signed-document loading/error/retry feedback and respect account changes during async
  operations.
- Preserve locale and a validated local return destination through signup, confirmation, recovery
  and password-change routes. Keep callback tokens and credentials out of logs/browser persistence.
- Test expired/invalid links, missing recovery session, duplicate submit and update-user failures.
- SMTP configuration and actual email delivery are explicitly outside these code-only checks.

Acceptance: failed saves do not delete committed/shared files; failures are recoverable and
localized. Confirmation/recovery returns to the expected language and permitted destination;
external redirects and credential leakage are rejected. No actual user email is sent during
automated checks.

### 7. Implement the administrator MFA flow

- Add TOTP enrollment, verification, challenge and verified-factor management using Supabase Auth.
- A membership-only bootstrap can explain enrollment/challenge; administrative data/actions require
  an active admin membership and verified `aal2` at API/RPC/Storage boundaries.
- Ensure the access helper and all dependent RLS policies are reviewed together; no UI-only
  enforcement.
- Cover direct RPC calls, low-assurance sessions, refresh/re-login, factor removal and nonadmin
  access.
- Provide a documented trusted recovery procedure; never expose a public MFA-bypass/admin-grant
  endpoint.
- Do not select the first admin or enroll an authenticator on the user's behalf. Actual enrollment
  and the first real-admin end-to-end test wait for the owner's account/authenticator.

Acceptance: isolated tests prove membership without `aal2` cannot access protected administrator
data or commands. Normal student/teacher access is unaffected. No existing user is assigned a role.

### 8. Add operational verification and deliver evidence

- Classify expected validation/auth/authorization/conflict failures separately from unexpected
  500/503 failures; keep responses stable and localized.
- Add sanitized request IDs and structured server diagnostics without passwords, tokens, messages,
  document URLs, payment payloads or sensitive profile fields.
- Add bounded admin-only health information for required RPCs and maintenance freshness/failure.
  Show unavailable/unknown explicitly; do not claim a successful check from missing data.
- Reuse existing tests and installed runtimes; add focused SQL, API and browser regressions for new
  behavior.
- Verify new migrations, grants, RLS and generated types; rerun database security/performance
  advisors.
- Review existing tracked CI configuration before extending it; sparse paths may not exist locally.
- Deliver changed routes/contracts, applied-versus-pending migrations, test evidence, external
  prerequisites and remaining limitations. Do not declare email, MFA enrollment, payment or meetings
  verified by mocks.

Acceptance: tests cover authorization, deterministic pages, stale/account-switched requests, input
validation, file compensation, duplicate actions and failure recovery. Visual checks cover EN/AR,
light/dark and 360/390/768/1024/1440 widths. Reader, language, appearance and shared-menu
regressions pass. No local production build, dependency/asset downloads, Git push or deployment is
included by default.

## Work that still needs owner or external setup

| Dependency                    | What cannot be completed autonomously                                                   |
| ----------------------------- | --------------------------------------------------------------------------------------- |
| First administrator           | Owner selects an existing confirmed account; the trusted CLI can then grant membership. |
| Personal MFA                  | Owner scans/verifies their TOTP factor after the flow is implemented.                   |
| Transactional email           | Real SMTP service/sender access and real confirmation/recovery delivery validation.     |
| Google sign-in                | Correct OAuth project/provider credentials and authorized callback configuration.       |
| Payment collection/payouts    | Provider account, credentials and approved commission/refund/settlement rules.          |
| Meeting provisioning          | Chosen provider/account, access and any provider-specific lesson rules.                 |
| Cloudflare Access/domain move | Owner identity/access policy and final domain decisions when requested.                 |

Do not add empty provider adapters or inactive webhook endpoints merely to make these rows appear
complete. The existing disabled state remains explicit until a separate integration is authorized.

## References

- Existing implementation: [backend](TILAWA_BACKEND.md), [admin design](TILAWA_ADMIN_DESIGN.md),
  [reports](TILAWA_ADMIN_REPORTS.md).
- [Supabase application MFA](https://supabase.com/docs/guides/auth/auth-mfa) and
  [TOTP flow](https://supabase.com/docs/guides/auth/auth-mfa/totp).
- [Supabase Storage object deletion](https://supabase.com/docs/guides/storage/management/delete-objects).

The initial audit changed documentation only. Implementation subsequently added source changes and
three tested database migrations; see the delivery document for verification and release boundaries.
