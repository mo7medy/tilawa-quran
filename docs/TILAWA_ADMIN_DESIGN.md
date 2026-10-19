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

| Route                             | Current interface and data                                                           |
| --------------------------------- | ------------------------------------------------------------------------------------ |
| `/1x2003/admin`                   | Live operational reporting, teacher applications, review links and shortcuts.        |
| `/1x2003/admin/teachers`          | Existing teacher data, approval filter and name/email search.                        |
| `/1x2003/admin/teachers/[userId]` | Existing profile/documents review and approve/reject commands.                       |
| `/1x2003/admin/students`          | Directory layout and explicit pending secure administrative data connection.         |
| `/1x2003/admin/lessons`           | Schedule layout and pending data connection; no lesson acceptance by administrators. |
| `/1x2003/admin/subscriptions`     | Approved USD website catalogue and subscription layout awaiting data connection.     |
| `/1x2003/admin/finance`           | Live read-only financial reporting and filtered CSV exports.                         |
| `/1x2003/admin/audit`             | Existing snapshot's latest 100 audit records.                                        |
| `/1x2003/admin/settings`          | Existing teacher-registration switch and the remaining security setup status.        |

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
- Mandatory administrator MFA and Cloudflare Access have **not** been configured or enforced by this
  design. They remain a separate security phase before treating the console as production hardened.
- No manual paid activation, collection, refund execution, payout execution, user impersonation or
  conversation inspection is exposed.
- No additional package, image or font dependency is introduced.

## Next implementation phase

Connect the three prepared lists through dedicated administrator read models with pagination,
minimal returned fields and authorization enforced at the server/database boundary. Student learning
notes and private conversations are outside the directory's scope. Add detail views only after their
permitted fields and actions are agreed. Support remains deferred.

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
