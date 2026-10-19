# Administrative reports

The existing overview at `/1x2003/admin` now includes operational statistics, reminders, a daily
trend and active subscription distributions. `/1x2003/admin/finance` is the eighth console section.
These reports are available in English/Arabic, light/dark and RTL, using existing Tilawa tokens. No
chart, image, font or other dependency was installed.

## Definitions

- Current counts: enabled student accounts, approved teachers, pending teacher applications,
  remaining scheduled lessons today, active subscriptions and subscriptions ending within seven
  days. Active subscriptions must have started and must not have reached their end time, even if a
  background expiry job has not updated their stored status yet.
- Period counts: new profile records, completed and cancelled lessons by scheduled date. The trend
  shows profile registrations and all lessons by scheduled date. It is not online-user tracking.
- Current distribution: Arabic/Quran, the three website plans, and separate teacher subscriptions.
- Financial period totals: transactions currently marked paid, pending, failed and refunded; pending
  order value is separate. A pending order or payment is never counted as collected revenue.
- Source breakdown: paid website-package, teacher-subscription and individual-lesson transactions.
- The current schema has transaction creation timestamps, not settlement/refund timestamps. The UI
  labels this limitation: changing a transaction status can change a past period's totals. These are
  current-state reports grouped by creation date, not immutable historical cash-flow statements.
- Platform share remains undefined until commission and website-package teacher compensation rules
  are agreed. It is not presented as net profit.
- Teacher balances are current lifetime snapshots, independent of the period filter. Available
  earnings subtract pending, approved and paid withdrawal requests per teacher, with each teacher's
  available balance floored at zero before aggregation. Rejected requests do not reserve funds. The
  latest 25 withdrawal requests are read-only; no approval, payout or refund action is exposed.

## Date filters and export

Today, last seven days, last thirty days and custom inclusive calendar dates are supported. All
boundaries and daily buckets use **UTC**, labelled in the UI. API/RPC ranges use inclusive `p_from`
and exclusive `p_until`; the inclusive UI end date is advanced by one day. The maximum range is 366
days. Impossible dates, repeated query parameters, invalid filters and invalid pages are rejected.

Payment status/source filters apply to the record table and its export, not to period summary cards.
Payment pages contain 25 records in deterministic `(created_at, id)` descending order. CSV exports
contain all matching records, capped at 5,000; larger exports fail explicitly and ask for a narrower
range. UTF-8 BOM, escaped quotes/newlines and spreadsheet-formula neutralisation are included.
Exports retain only payment references, creation date, status, source, subject, USD amount and
participant display names. No contact information, private learning notes or provider payloads are
exported. Account identity is checked before initiating the download.

## Backend and security

Migration: `supabase/migrations/20261019204335_tilawa_admin_reports.sql`.

- `public.tilawa_admin_overview` and `public.tilawa_admin_finance` are invoker wrappers around
  private read-only definer functions with an empty search path and fully qualified tables.
- Both private functions require an enabled signed-in user and existing administrator membership.
  Anonymous execution is revoked on all four functions. Existing table grants/RLS remain intact.
- GET `/api/tilawa/v1/admin/reports/overview` and `/finance` use the existing authenticated API
  boundary, account-change check and private/no-store response headers. `format=csv` uses the same
  guarded finance RPC. A missing reporting migration produces an explicit error, not zero totals.
- Bounded reporting indexes cover profile/payment/order creation, lesson schedules and active
  subscription end times. No business records, payment flags or admin memberships are changed.
- Existing mandatory MFA/Cloudflare Access hardening remains a separate phase.

The migration was applied to the independent project `gsoelrejabrmzqypdchv`. Security advisors found
no issues before or after it. Live checks confirmed anonymous and sessionless calls are rejected. At
verification, payment collection was disabled, there were no recorded payment transactions and no
administrator membership had been assigned. No administrator was selected automatically. Positive
administrator and non-admin access scenarios were exercised in the isolated SQL tests.

## Validation

- 171 local UI/API/account/reader regression tests passed.
- 30 isolated SQL checks passed, including access control, UTC boundaries under a non-UTC database
  session, zero-filled dates, filtering, balances, pagination and export limits.
- 40 browser cases passed across English/Arabic, light/dark and 360/390/768/1024/1440 pixels,
  including mobile menu keyboard closure/focus, custom dates, chart table accessibility and overflow
  checks.
- TypeScript source check, scoped ESLint, Stylelint and page-entry validation passed.

Local SQL test command, reusing the previously installed verification runtime:

```powershell
node scripts/supabase/verify-admin-reports.mjs
```

`PGLITE_MODULE` can point to another already installed PGlite module. This test uses an isolated
in-memory schema with synthetic fixtures; it does not connect to or seed production.

The reporting migration is applied independently of the website release. Website publication follows
the GitHub/Cloudflare deployment workflow.
