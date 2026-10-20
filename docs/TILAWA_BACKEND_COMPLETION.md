# Backend completion delivery

Implemented on 2026-10-20 for the independent website project `gsoelrejabrmzqypdchv`. The
application database, Quran content integration and deployment credentials were not changed.

## Delivered

- Server-side teacher validation matches staged registration: identity/contact fields, specialties,
  languages, bilingual presentation, qualifications and USD pricing. Inactive pricing fields are
  normalized. Image/video/document uploads remain optional. Saving/submitting does not approve a
  teacher.
- Live paginated administrator student, lesson and subscription lists replace the prepared
  placeholders. Search, status/subject/date filters and stable 25-record pages run on the server.
  Students expose operational identity, not birth dates, learning notes or private conversations.
- Admin page authorization uses a minimal membership check. Applicant summaries, individual contact/
  document reviews, audit history and finance reports are fetched separately. Audit can browse past
  100 events.
- The selected conversation fetches its own latest 50 messages and an explicit older-history cursor.
  It no longer depends on the newest 200 messages across all conversations. Notifications have
  pagination and an independent unread total. Caches/history are isolated on account changes.
- Small account bootstrap is separate from route-specific history. Lessons, requests, subscriptions,
  linked teachers/students, reviews, documents, coupons, earnings and withdrawals have bounded
  reads. Balances and package credits use complete database ledgers, never only a visible page.
- Realtime coalesces events and refreshes the relevant section. Identity/unread bootstrap and signed
  portraits refresh separately. The current section revalidates on reconnect/focus.
- Upload compensation removes only the exact new, unreferenced object after a definitive rejection.
  Network/server ambiguity preserves the file. A reference check protects student/teacher shared
  portraits. No historical/bulk deletion was added. Documents have error/retry feedback.
- Signup, confirmation, recovery and password updates retain language and a safe local destination.
- Admin TOTP setup, challenge, verification and factor removal are implemented. Membership-only
  sessions can reach setup; protected SQL/API/Storage requires `aal2`, a live unexpired Auth session
  and a currently verified TOTP factor. Factor removal refreshes the session. Real enrollment
  remains an owner action.
- A separate timezone command preserves weekly availability and supports idempotent replay.
- API validation/auth/conflict failures are distinguished from 500/503 failures. Sanitized request
  IDs exclude raw exceptions, credentials, private records and document URLs.
- Settings show bounded backend/maintenance health information, explicitly including unknown states.
  CI uses Node 24, matching the existing package engine.

Administrator lesson acceptance, manual paid activation, collection/payout, support, voice rooms,
coins and application gifts were not introduced. Approved website package and complimentary-lesson
rules remain unchanged.

## Contracts and migrations

All private responses use `private, no-store`. Database functions enforce authorization; ordinary
server calls still use the public client key and verified user session.

| HTTP route                                                                       | Purpose                                         |
| -------------------------------------------------------------------------------- | ----------------------------------------------- |
| `GET /api/tilawa/v1/account`                                                     | Identity/settings/balances bootstrap            |
| `GET /api/tilawa/v1/account/view?view=...&id=...&page=...&status=...`            | Current account section and relevant identities |
| `GET /api/tilawa/v1/messages?conversation=...&before=...&cursor=...`             | Items, `hasMore`, next stable cursor            |
| `GET /api/tilawa/v1/admin/access`                                                | Membership/verification flags only              |
| `GET /api/tilawa/v1/admin/lists/{students,teachers,lessons,subscriptions,audit}` | Minimal administrator lists                     |
| `GET /api/tilawa/v1/admin/teacher/{uuid}`                                        | Applicant review                                |
| `GET /api/tilawa/v1/admin/health`                                                | Read-model/maintenance status                   |
| `POST /api/tilawa/v1/command`                                                    | Existing guarded commands plus `time-zone`      |

List parameters: `search`, `status`, `subject`, `from`, `until`, `page`. Invalid/repeated parameters
are rejected. `from` is inclusive, `until` exclusive, both UTC dates; maximum period 366 days.
Existing reporting and participant-only Quran personal-data APIs retain their contracts. Legacy
snapshot RPCs remain for compatibility but are not used by normal page guards/bootstrap.

Applied migrations:

1. `20261020105154_tilawa_backend_completion.sql`
2. `20261020105357_tilawa_account_reads.sql`
3. `20261020111815_tilawa_admin_session_guard.sql`

Public wrappers are invoker functions. Private definer implementations have empty search paths and
qualified relations. Anonymous execution is revoked. Direct execution of the preserved command core
is revoked for browser roles. Public database types have been regenerated.

## Verification and limits

Evidence is recorded under ignored `.local-runtime/backend-completion-*` files.

Final results: 152 focused tests, 64 isolated SQL checks and 124 local visual cases passed. Source
TypeScript, scoped ESLint, formatting and page-entry validation passed.

- Isolated PostgreSQL-compatible tests load the complete migration chain: permissions,
  membership/MFA, revoked sessions/factors, validation/replay, all read views, stable pages, private
  field exclusion, participant-only lessons/messages, whole-ledger credit totals and upload
  references. Run `node scripts/supabase/verify-backend-completion.mjs` with the existing local
  PGlite runtime.
- Focused Vitest covers account/teacher UI, admin lists/reports, routes, history/account switching,
  uploads, auth destinations, MFA lifecycle, API errors and Quran regressions.
- Visual verification uses actual changed components with synthetic fixtures, not real authenticated
  accounts: EN/AR, light/dark, 360/390/768/1024/1440; 124 cases including TOTP setup.
- Source TypeScript, scoped ESLint, formatting and Next.js page-entry validation are included in
  final checks.
- Live database checks confirm migrations and grants. No real admin was chosen; payments and
  meetings stay disabled. No production users or payment fixtures were created.
- Combined advisors report an Auth configuration warning: leaked-password protection is disabled. It
  was not enabled by code/schema changes. No database RLS/function-privilege defect was reported.

SMTP, Google OAuth, real-device TOTP enrollment, real administrator sign-in, payment/payout
providers, meeting provisioning and a Cloudflare release are not verified by synthetic tests. No
local production build, new dependencies, images or fonts were installed. Git push/deployment remain
separate.

## First administrator and recovery

The owner selects an existing confirmed website account. The trusted, project-checked helper
`scripts/supabase/admin.mjs <uuid>` can then grant membership. Sign in normally, open
`/1x2003/admin`, and scan/verify a factor with the owner's authenticator. Role switches/user
metadata cannot grant access.

For a lost authenticator, use a trusted Supabase project-owner session and official Auth
administration tools to remove the affected factor and revoke that user's sessions after verifying
the exact identity. Retain the intended private membership; the user signs in again and enrolls a
replacement factor. Never insert a bypass flag, alter JWT claims, delete Auth rows directly, publish
a service-role key or add a public recovery endpoint. No actual user's factors/sessions were
modified in this work.

See [execution plan](TILAWA_BACKEND_COMPLETION_PLAN.md), [backend setup](TILAWA_BACKEND.md),
[admin reports](TILAWA_ADMIN_REPORTS.md), and
[Supabase application MFA](https://supabase.com/docs/guides/auth/auth-mfa).
