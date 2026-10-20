# Tilawa website administration

The website administration starts at `/1x2003/admin` on the website hostname. It has its own
navigation, header and content layout; the academy header/footer and Quran reader shell are not
mounted there. Arabic/English, RTL, the shared appearance preference and Tilawa colour tokens are
retained.

The old `/admin` route family is retired with a 404, without redirecting to the replacement. The new
base path is defined once as `ADMIN_BASE_PATH`; navigation, account links, route classification and
the existing server-side administrator check use it. Localized routes such as
`/ar/1x2003/admin/teachers` preserve the requested section through sign-in. The administrative API
endpoint and its existing authorization remain unchanged.

The relocation passed 150 targeted local tests, including the retired entry's 404 response,
localized return URLs and rejection of non-administrator sessions, plus TypeScript, ESLint and
Next.js page-entry checks. Deployment is tracked separately from these local checks.

## Scope

The application panel at `../tilawa-admin-web` was inspected as a design reference. Its sidebar,
compact header and application-review workflow informed this interface. Its database connection,
credentials, payment tools, rooms, coins, gifts and campaigns were not copied.

There are eight sections: overview, teachers, students, lessons, packages/subscriptions, finance,
audit and settings. Technical support is deferred.

| Route                             | Current interface and data                                                    |
| --------------------------------- | ----------------------------------------------------------------------------- |
| `/1x2003/admin`                   | Live operational reporting, teacher applications, review links and shortcuts. |
| `/1x2003/admin/teachers`          | Existing teacher data, approval filter and name/email search.                 |
| `/1x2003/admin/teachers/[userId]` | Existing profile/documents review and approve/reject commands.                |
| `/1x2003/admin/students`          | Live minimal student directory with server filtering and pagination.          |
| `/1x2003/admin/lessons`           | Live read-only lesson directory; no administrative lesson acceptance.         |
| `/1x2003/admin/subscriptions`     | USD catalogue and live subscriptions with authoritative credit summaries.     |
| `/1x2003/admin/finance`           | Live read-only financial reporting and filtered CSV exports.                  |
| `/1x2003/admin/audit`             | Filtered paginated audit history with actor/target references.                |
| `/1x2003/admin/settings`          | Existing teacher-registration switch and the remaining security setup status. |

There are no fabricated live student, lesson or subscription records. Local visual verification uses
synthetic `[Preview]` teacher records in an ignored harness, never in the deployed application.
Website packages reuse `academyPlans.ts`: 8/$80, 12/$100 and 16/$120, 45 minutes each, with one
optional type of gift lesson in each of the latter two plans. Teacher prices remain separate.

## Preserved boundaries

- Teacher approval, registration settings and audit use the existing website administration API and
  command contract. The reports extension adds guarded read-only RPCs and reporting indexes; it does
  not grant direct table access or mutate business records.
- Existing server session checks and administrator membership checks remain in place. Hiding links
  is not the access control mechanism. Non-administrators do not request the admin snapshot in the
  UI.
- Administrator TOTP setup/challenge and live session/factor checks are implemented and enforced in
  database authorization. Actual enrollment requires the owner. Cloudflare Access remains external
  setup.
- No manual paid activation, collection, refund execution, payout execution, user impersonation or
  conversation inspection is exposed.
- No additional package, image or font dependency is introduced.

## Next implementation phase

The lists are connected through dedicated, bounded administrator read models. Student learning notes
and private conversations remain outside their scope. Support remains deferred. See
[backend completion](TILAWA_BACKEND_COMPLETION.md) for contracts and verification.

The UI lives under `src/components/Admin`, with route classification in
`src/tilawa/adminSections.ts`. This separation helps a future move to an admin subdomain, but that
move also requires separate deployment/routing, cookie/session scope, authentication redirects and
Access configuration; changing a URL alone does not provide isolation.

## Validation

- 156 local tests passed, covering accounts, teacher registration, administrative access and
  actions, catalogue, theme, route classification and Quran service regressions.
- TypeScript source check, scoped ESLint, Stylelint and Next.js page-entry checks passed.
- 34 isolated browser layout cases passed: English/Arabic, light/dark, 360/390/768/1024/1440 pixels,
  every section and teacher detail. Mobile menu Escape/focus restoration and horizontal overflow
  checks passed. Existing font fallbacks were used; no font assets were downloaded.
- These design checks were local. The later reporting migration was applied to the independent
  website database; see `TILAWA_ADMIN_REPORTS.md`. No website build, push, deployment, live approval
  or settings mutation was performed.
