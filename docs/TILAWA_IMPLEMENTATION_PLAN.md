# Tilawa Academy — Web Implementation Plan (Phase 1: Documentation & Audit)

Status: **Phase 1 only — documentation and auditing. No application behavior was changed in this phase.**
Stack truth: **Next.js 15.5.27 (Pages Router), React 18, TypeScript 5.5.4, SCSS Modules,
next-translate 2.6.2, Redux Toolkit + redux-persist, XState 4, SWR 1.2.1, Vitest 2, Playwright 1.46.**
Note: `.agents/quran/standards/repo-context.md` still says “Next.js 14” — that line is stale;
`package.json` pins `next: 15.5.27`. Do not “downgrade” planning assumptions to Next 14.

Related audit: `docs/TILAWA_APP_PARITY.md` (source-backed parity matrix + regression test map).

Conventions in this plan:

- `WEB:` = this repository (`C:/Users/mu7me/Downloads/Edge D/Tilawa web`).
- `APP:` = Flutter reference (`C:/Users/mu7me/Downloads/Edge D/Tarteel Flutter`), **read-only**.
- “Supabase-backed implementation” means the `Supabase*Repository` class in APP source, not the
  `Local*` demo fallback. Local/demo defaults are explicitly **not** the parity target.
- Money rule: website computes **integer USD cents server-side**. APP source uses whole units in
  SAR; the website does not copy APP currency handling.
- English + Arabic edits are expressly authorized for Tilawa work (old English-only locale standard
  is superseded for academy + rebrand scope).

---

## 1. Plan scope and non-goals

### In scope (bounded implementation queue, phases 1–10 below)

1. Teacher flow parity reimplemented in TypeScript/React (no Dart copying).
2. Visible Quran.com → Tilawa rebrand with functional API preservation.
3. New academy homepage at `/`, original Quran homepage preserved at `/quran`.
4. Academy programs → teachers, EN/AR, USD, app colors, responsive.
5. Independent new Supabase project (code-first), unified website account, server-decided roles.
6. Teacher profiles/filters/availability/pricing from APP workflow; private docs; bookable-only-approved.
7. Booking/intro/subscription/lesson/reschedule/cancel/complete/ratings/chat/notifications/earnings.
8. Payment screens + backend now, gateway later; integer cents; one approved pricing exception.
9. Supabase auth/RLS/migrations/services for platform + Quran state mapping; guest preservation.
10. Focused reviewer-run tests: unit/type/EN/AR responsive/auth/RLS/role/race/timezone/payment/idempotency/
    Quran regression/hydration.

### Explicit non-goals for the bounded queue

- No commit/push/deploy, no Cloudflare/Supabase resource changes, no package/font/asset installs,
  no production builds, no secrets reading (`.env*`, credentials, `supabase_defines`).
- No copying APP assets yet (`assets/icon/app_icon.png`, `logo.svg` stay APP-side in this phase).
- No fabricated testimonials, teacher records, or prices (Decision 4).
- No client-marked-paid, no production payment simulation, no admin lesson-booking acceptance.
- No reading/copying existing users or credentials; no modifying the existing application Supabase.
- No global replacement of internal home routes (`/` → `/quran` rewrites must be scoped).

---

## 2. Phase 1 — Teacher flow audit (Decision 1)

**Goal:** exact functional parity with APP teacher flow, reimplemented in TypeScript/React.

### Audited APP Supabase-backed sources (authoritative)

| Area | APP source file | Supabase mechanism |
| --- | --- | --- |
| Booking create/update/reschedule/cancel | `lib/screens/teachers/teacher_booking_repository.dart` (`SupabaseTeacherBookingRepository`) | RPCs `get_teacher_available_slots`, `create_or_update_booking_request`, `cancel_booking_request`; pre-submit slot revalidation; Meet link via `create-meet-space` function |
| Booking models | `lib/screens/teachers/teacher_booking_models.dart` | `intensiveLessonDurationMinutes = 60`; statuses `pending/accepted/rejected/cancelled`, payments `unpaid/paid/refunded`; `requiresPayment = price > 0 && unpaid` |
| Intro policy | `lib/screens/teachers/teacher_intro_lesson_policy.dart` | `introLessonTypeId = 'intro'`; auto-complete `Duration(days: 5)`; `introLessonAutoCompletesAt = scheduledAt + duration + 5d` |
| Availability | `lib/screens/teachers/teacher_availability_repository.dart` | Table `teacher_availability` (`teacher_id, weekday, start_time, end_time`); RPC `replace_teacher_availability`; enabled-day-without-slots guard; Hive cache key |
| Payments | `lib/screens/teachers/teacher_payment_repository.dart` (`SupabaseTeacherPaymentRepository`) | Edge `create-payment-session` (preview + create), `payment-status`; providers `paymob / egypt_wallet_gateway`; grossed-up fee (240bp + 3 fixed + 1400bp VAT); idempotency keys |
| Subscriptions | `lib/screens/teachers/teacher_subscription_repository.dart` | Table `student_subscriptions`; statuses `active/expired/cancelled`; grace `subscriptionGracePeriodDays = 5`; RPC `consume_subscription_lesson`; Supabase `createMonthlySubscription` throws — must come from payment confirmation only |
| Lesson lifecycle | `lib/screens/teachers/teacher_lesson_details_repository.dart` | RPCs `reschedule_lesson`, `cancel_lesson_by_participant`, `request_lesson_cancellation`, `resolve_lesson_cancellation`, `request_lesson_completion`, `confirm_lesson_completion`, `reject_lesson_completion`, `get_lesson_financial_state`; Edge `create-meet-space`, `create-zoom-meeting`; strict real-link validators |
| Teacher accept/reject | `lib/screens/account/teacher_booking_requests_repository.dart` (`SupabaseTeacherBookingRequestsRepository`) | RPCs `accept_booking_request`, `reject_booking_request`; teacher-side visibility hides pending + `amount > 0` (awaiting student payment); Meet link after accept |
| Registration policy | `lib/screens/account/account_registration_policy.dart` | RPC `get_account_registration_policy` → `{ teacher_registration_enabled: boolean }` |
| Profiles/roles | `lib/screens/account/account_profile_models.dart` | `TeacherApprovalStatus pending/approved/rejected`; `TeacherPricingMode per_lesson/monthly/both`; `TeacherGender male/female`; currency/audience/language defaults |
| Specialties | `lib/screens/teachers/teacher_specialties.dart` | 5 ids: `memorization, tajweed, fiqh, aqeedah, arabic_for_non_arabic_speakers` (+ Arabic/English labels) |
| Marketplace query | APP migration `202605190001_teacher_marketplace_filters.sql` | RPC marketplace filter: gender/topic/search/currency/region/verified/available-today; approved-only; ranking score; review aggregates |
| Ratings | `lib/screens/account/teacher_reviews_repository.dart`, `lib/screens/teachers/teacher_lesson_rating_*` | `reviews` table; per-lesson review lookup; summary aggregates |
| Earnings | `lib/screens/account/teacher_earnings_repository.dart` | `earnings_transactions` + matured subscription/gift/support earnings paths |
| Withdrawals | `lib/screens/account/teacher_withdrawal_repository.dart` | `withdrawal_requests` (`pending`-labeled lifecycle, admin approve/reject) |
| Dashboard | `lib/screens/account/teacher_dashboard_repository.dart` | `TeacherDashboardSummary`: today lessons, pending requests, active students, available earnings |
| Chat | `lib/screens/teachers/teacher_chat_repository.dart`, `chat_supervision_*` | `direct_conversations / direct_messages / direct_conversation_user_states`; message-request accept/reject; retraction; supervision inbox/claim/resolve RPCs; contact limits |
| Coupons | `lib/screens/account/teacher_discount_coupons_repository.dart` | `teacher_discount_coupons`; discount 1–90 clamp; active flag; verified-coupon path at payment confirm |
| Notifications | `lib/services/app_notification_service.dart`, `supabase/functions/send-push-notification`, `register-device-token` | `notifications`, `device_tokens`, group keys, push outbox/dispatch functions |

### Website mapping (new code, no behavior change yet)

- New TypeScript domain layer (proposed `src/tilawa/` — does not exist yet; Phase 2+ creates it):
  `booking/`, `availability/`, `payments/`, `subscriptions/`, `lessons/`, `teachers/`, `chat/`,
  `notifications/`, `ratings/`, `earnings/`, `withdrawals/`, `registration-policy/`.
- Server-only price computation in API routes (never trust client amounts).
- UTC + IANA timezone slot pipeline: store `scheduled_at timestamptz` (UTC), teacher IANA zone column,
  student-device zone only for display; race-safe RPC with row locks + exclusion re-check.
- No-Dart-copy rule: port the state machines and RPC contracts, write idiomatic TS/React.

Acceptance: `docs/TILAWA_APP_PARITY.md` §1–§8 trace every APP rule to a website target.

---

## 3. Phase 2 — Rebrand: visible vs functional (Decision 2)

**Goal:** remove visible Quran.com branding/names/logos/links/SEO in favor of Tilawa; preserve license
notices and required Quran Foundation (QF) API endpoints.

### 3.1 Functional references that MUST stay (do not rename)

| Path | Why it stays |
| --- | --- |
| `src/utils/api.ts` (`PRODUCTION_API_HOST = https://api.qurancdn.com`, `API_ROOT_PATH = /api/qdc`) | QF content transport |
| `src/utils/url.ts` (`QuranFoundationService`, `getProxiedServiceUrl`, `/api/proxy/:service`) | Proxy contract for content/auth/search/quran-reflect |
| `src/pages/api/proxy/[...path].ts` | Runtime proxy; renaming breaks all Quran data |
| License notices (`LICENSE`, in-code attributions) | Legal preservation |
| `src/utils/auth/api.ts` + `src/utils/auth/apiPaths.ts` endpoint paths (`users/…`, `bookmarks`, `collections`, `notes`, …) | Existing account-data contracts until Phase 9 Supabase mapping lands |

### 3.2 Visible references to change (file-level strategy)

| Surface | Files (verified) | Strategy |
| --- | --- | --- |
| SEO site name/template/social/app links | `src/utils/seo.ts` (`siteName: 'Quran.com'`, `titleTemplate: '%s - Quran.com'`, Apple app `1118663303`, Android `com.quran.labs.androidquran`, twitter `@app_quran`, facebook ids) | Tilawa titles/meta/OG; keep QF API hosts out of visible copy |
| PWA manifest | `public/manifest.json` (`name/short_name: Quran.com`, description) | Tilawa name/short/description/icons (reuse existing app assets; no heavy fonts) |
| Sitemap/site URL | `next-sitemap.js` (`https://quran.com`), `src/utils/navigation.ts` (`QURAN_URL = https://quran.com`) | Canonical Tilawa host; keep path structure |
| External link map | `src/utils/navigation.ts` `EXTERNAL_ROUTES` (`quran.foundation`, `legacy/corpus.quran.com`, `sunnah.com`, `quranreflect`, `feedback.quran.com`, app-store URLs, WhatsApp/Telegram challenge links) | Keep functional QF/API links; repoint/relabel user-visible brand links to Tilawa surfaces; never break `getProxiedServiceUrl` |
| Navbar/drawer brand + labs link | `src/components/Navbar/**` (incl. `NavigationDrawer/LabsSection.tsx` → `https://labs.quran.com`) | Tilawa wordmark; labs link relabeled or academy-scoped |
| Homepage/hero/about/apps/developers/support copy + locales | `src/components/HomePage/**`, `src/pages/about-us.tsx`, `apps.tsx`, `developers/`, `support.tsx`, `locales/en+ar/{home,common,about,apps,developers,support}.json` | EN+AR rewording; authorized locale edits (old English-only rule superseded for this scope) |
| Footer/legal/about (when located under Wrapper/layout) | Layout wrapper components + `src/pages/{privacy,terms-and-conditions}.tsx` + privacy locales | Tilawa legal identity; preserve license notices |
| `_app.tsx` head/manifest/icons | `src/pages/_app.tsx` (apple-touch-icon, `/manifest.json`) | Tilawa icons/manifest; no new font downloads |

### 3.3 Guardrails

- No global find/replace of `quran.com` — functional hosts (`api.qurancdn.com`, proxy paths) break.
- Codemod allowlist: visible-copy files only; `src/utils/api.ts`, `src/utils/url.ts`,
  `src/pages/api/proxy/[...path].ts`, license files excluded.
- Reviewer check: `rg -n "quran\.com|Quran\.com"` after Phase 2 must show only functional/license hits.

---

## 4. Phase 3 — Academy homepage vs preserved Quran homepage (Decision 3)

**Goal:** new academy homepage at `/`; original Quran homepage reused intact at `/quran`.

### 4.1 What is preserved (exact)

Current `src/pages/index.tsx` (SSG via `getStaticProps` + `getAllChaptersData`) composes:

- `HomePageHero` (`src/components/HomePage/HomePageHero.tsx`)
- `ReadingSection` (`src/components/HomePage/ReadingSection/`) — continue-reading
  (`useGetContinueReadingUrl` → `getChapterWithStartingVerseUrl`), goals/streak
  (`StreakOrGoalCard/GoalStatus`), popular (`PopularDropdown`), chapter lists
- `LearningPlansSection`, `QuranInYearSection` (logged-in + guest variants), `ExploreTopicsSection`,
  `MobileHomepageSections`, `ChapterAndJuzListWrapper`
- SEO via `NextSeoWrapper` + `getCanonicalUrl(lang, '')` + `getLanguageAlternates('')`

Preserved Quran routes/features (no URL changes):

- `/:chapterId`, `/:chapterId/:verseId`, `/page/:pageId`, `/juz/:juzId`, `/hizb/:hizbId`,
  `/rub/:rubId`, `/surah/:chapterId/...`, `/search`, `/reciters*`, `/radio`, `/collections*`,
  `/my-quran`, `/reading-goal*`, `/learning-plans*`, `/login`, `/complete-signup`,
  `/forgot-password`, `/reset-password`, `/about-us`, `/apps`, `/developers`, `/support`,
  `/privacy`, `/terms-and-conditions`, plus locale prefixes (`/ar`, `/ar/quran`, …).

### 4.2 Implementation strategy (Phase 3+)

1. Move current `src/pages/index.tsx` implementation to `src/pages/quran.tsx` (reuse, not rewrite) so
   search/navigation/popular/continue-reading/goals/chapter lists stay byte-identical in behavior.
2. New `src/pages/index.tsx` = academy homepage (programs-first, §5), with separate academy
   layout/styling (no shared Quran homepage SCSS globals; new `Academy*` modules).
3. Scoped route map (do not globally rewrite `/` links):
   - `src/utils/navigation.ts`: add `ACADEMY_HOME = '/'`, `QURAN_HOME = '/quran'`; keep `ROUTES.HOME`
     semantics documented per caller (academy vs Quran context).
   - Audit every `router.push('/')`, `<Link href="/">`, `getCanonicalUrl(lang, '')`,
     `getBasePath()`-derived alternates, `resolveSafeRedirect`, auth redirects (`/login?redirect=`),
     `next-sitemap.js` additional paths, `i18n.json` `/` namespaces, Playwright POM `home.goTo('/')`.
4. Redirects: no blanket `/` → `/quran`. Only explicit, reviewed redirects (e.g. legacy campaign URLs).
5. Locales: academy homepage needs `locales/en+ar/academy.json` (+ shared `common/login`); `/quran`
   keeps existing `/` namespaces (`home, radio, collection, reading-goal, reciter, learn` in `i18n.json`).

Acceptance: `/` renders academy; `/quran` renders today’s homepage sections; all preserved URLs pass
the regression map in `docs/TILAWA_APP_PARITY.md` §10; `/ar` + `/ar/quran` both RTL-correct.

---

## 5. Phase 4 — Academy programs → teachers surface (Decision 4)

**Goal:** programs first, then teachers; Quran + Arabic for adults in Western English-speaking countries;
EN/AR, USD, app colors, responsive; no fabricated content.

Content model (real data only):

- Programs: Quran memorization, Tajweed/recitation correction, Fiqh/Aqeedah foundations,
  Quranic Arabic for non-Arabic speakers — mapped from APP specialty ids
  (`lib/screens/teachers/teacher_specialties.dart`).
- Teacher cards derive from Supabase `teacher_profiles` (approved only) + marketplace RPC aggregates
  (rating, reviews count, price, currency, availability-today, gender, country). No seed/demo teachers
  on the website (APP `LocalTeachersData` 4 profiles are audit reference only).
- Pricing display: USD only; integer cents upstream; formatted per locale (`en-US` / `ar` with USD).
- Theme: APP `lib/config/theme.dart` → web SCSS tokens:
  `--tilawa-primary: #037F70; --tilawa-bright: #04B49D; --tilawa-container: #E6F8F5;`
  `--tilawa-gold: #D4AF37; --tilawa-bg: #FAFAFA; --tilawa-bg-dark: #05070D;`
  Separate academy token file (e.g. `src/styles/_tilawa-tokens.scss`); do not mutate
  `src/styles/_constants.scss` Quran tokens in place.
- Responsive: mobile-first SCSS (per `core-standards.md` + `COMMON_MISTAKES.md` #6/#10); RTL logical
  properties; EN/AR responsive UI tests in reviewer phase.
- Assets: reuse existing app assets only; no heavy fonts (system + existing Quran fonts; APP uses
  Amiri/Manrope/Sora/IBM Plex — web must not download equivalents without approval).

---

## 6. Phase 5 — Accounts, roles, registration policy (Decision 5)

**Goal:** independent new Supabase project (code-first; user supplies connection later); unified website
account across academy + Quran; separate from Flutter accounts/data; email/password + Google; server-decided
roles; registration-policy-gated teacher signup; admin approves teachers/eligibility only.

### 6.1 Schema direction (new migrations, new project only)

- `profiles` (website user id ↔ auth user), `student_profiles`, `teacher_profiles`
  (+ `teacher_private_contacts`, `teacher-documents` storage bucket — private, never publicly readable),
  `platform_settings` (`teacher_registration_enabled` default per APP migration `20261010173126…`
  which seeds `false`), `admin_audit_logs`, `admin_notes`.
- Roles: `student / teacher-pending / approved-teacher (teacher) / admin`. Only server (RPC/trigger with
  `auth.uid()` + service-role admin paths) decides/transition roles. Client role claims are display-only.
- Registration: `get_account_registration_policy()` RPC (authenticated-only, per APP migration) gates
  teacher signup UI + server insert guard. Student registration always open; teacher path closed when
  policy is `false`, including a server race guard (re-check at insert, cf. APP
  `accountRegistrationRefreshProvider` comment).
- Google sign-in via Supabase Auth (new project) + email/password; link to unified website identity so
  academy + Quran surfaces share one account; explicit migration path for existing QF-JWT users and
  guest state (see Phase 9).

### 6.2 Website auth integration points (current state → target)

- Today: custom QF JWT (`src/contexts/AuthContext.tsx`, `src/hooks/auth/useAuthData.ts` + SWR,
  `src/utils/auth/{api,apiPaths,login}.ts`, `ROUTES` auth/protected lists in `src/utils/navigation.ts`).
- Target: Supabase session coexists behind an adapter; `useAuthData` remains the component contract;
  protected academy routes (`/academy/**`, `/teachers/**/book`, `/dashboard/**`, `/admin/**`) enforce
  server-checked role guards (RLS + API-route checks), not client flags.

---

## 7. Phase 6 — Teacher profiles, filters, availability, pricing (Decision 6)

- Public profile query: approved-only marketplace RPC (cf. APP `202605190001…` filters +
  `20260630234141…_visibility`, `202605060003…_market_pricing`, ranking/score logic). Filters:
  topic/specialty, gender, country, price range, currency (USD on web), verified-only,
  available-today-only, search (name/specialization), rating sort.
- Profile fields mirror APP `TeacherProfile` (`teachers_data.dart`) + `TeacherAccountProfile`
  (education, expertise, languages, audiences, pricing mode, subscription offer, intro video
  per `20260729100906…`, public slug per `20260531113607…`/`202606020001…`, badges per
  `20260603152935…` with no-ranking-touch honorary rule).
- Availability: teacher weekly editor → `replace_teacher_availability` RPC; student slot picker →
  `get_teacher_available_slots` RPC with `p_excluded_booking_request_id / p_excluded_lesson_id`
  for reschedule flows; UTC storage + IANA display; same-day lead-time rule ported server-side.
- Approval docs: private storage (`teacher-documents` bucket) + admin-only read RPCs; approval status
  never exposed beyond `approved` visibility; only approved teachers are bookable (DB-enforced, not UI-only).

---

## 8. Phase 7 — Booking → lesson → completion → ratings → chat → notifications → earnings (Decision 7)

Port the APP state machines 1:1 (semantics), in TS:

1. **Booking:** `create_or_update_booking_request` (slot conflict → `BOOKING_SLOT_UNAVAILABLE`;
   subscription/intro/paid validations per `20260625231607…` + `20260625233339…`); pre-submit
   availability re-check; `cancel_booking_request`.
2. **Teacher decision:** teacher-only `accept_booking_request` (pending + terms check) creates `lessons`
   row + triggers Meet-link creation; `reject_booking_request`. Admin never accepts (§11 guard).
3. **Lesson:** `reschedule_lesson`, `cancel_lesson_by_participant`, cancellation request/approval
   (`request/resolve_lesson_cancellation`), completion handshake
   (`request_lesson_completion` → `confirm/reject_lesson_completion`), financial state
   (`get_lesson_financial_state`: paid/refunded/pending + cancellation financial status).
4. **Intro auto-completion:** 5 days after end (`20260713175812…` + `teacher_intro_lesson_policy.dart`);
   schedulable job (pg_cron/Edge) — website must schedule it, not rely on client timers.
5. **Ratings/reviews:** per-lesson review + teacher aggregate (visible-only reviews in marketplace).
6. **Chat:** direct conversations/messages/user-states; message-request accept/reject; retraction
   (`20260707161836…`); compliance supervision inbox/claim/resolve (`20260920151503…`,
   `20260920215008…`, `20260712135050…`); contact limits; realtime subscriptions.
7. **Notifications:** `notifications` + `device_tokens` + `register-device-token` /
   `send-push-notification` + dispatch/outbox + reminder queue (`20260728153735…` lesson reminders,
   `20260728173455…` push outbox). Website needs web-push adapter; FCM path stays app-side.
8. **Earnings dashboards:** teacher + student + admin views from `earnings_transactions` /
   matured-subscription logic (`202605070002…`, `202605070003…`, `20260626231839…`
   paid-subscription-earnings requirement); teacher accepts bookings; admin does not.
9. **Meet/Zoom adapters (real, prepared):** Edge `create-meet-space`, `create-zoom-meeting` parity;
   strict validators (Meet `https://meet.google.com/xxx-xxxx-xxx`, Zoom `https://zoom.us/j/…`);
   placeholder `https://meet.google.com/new` is APP-local/demo only — **never persisted as a real link
   on the website**; no fake room URLs.

---

## 9. Phase 8 — Payments now, gateway later (Decision 8)

- Payment screens + backend in the bounded queue; external gateway integration deferred.
- Rules:
  - Money = **integer USD cents, computed server-side** (Edge/RPC). Client amounts are untrusted input.
  - **ONE explicit parity exception (user-approved):** intensive 60-min lesson price =
    `round(base * 1.20)` to nearest cent. APP source computes `base + 25`
    (`_intensiveLessonPrice` in `teacher_booking_repository.dart`); APP DB history moved
    `base+25 → round(trunc(base) * 1.2)` (`20260704153413_intensive_lesson_percentage_pricing.sql`).
    Website follows the approved 20% rule; see `TILAWA_APP_PARITY.md` §9 for the three-way comparison.
  - Free intro once per teacher; intro duration = `base - 15` if `base > 35` else `base`
    (verified in APP `_buildLessonTypeOptions`; DB verification not performable in Phase 1 — see §13).
  - Production paid bookings blocked pending provider; free-intro follows APP rules
    (free + marked paid before acceptance; subscription bookings paid-through-subscription).
  - Payment simulation = dev-only, hard-disabled in production (env + server guard, not a UI flag).
  - Client can never mark paid: acceptance requires `payment_status = paid AND payment_transaction_id`
    (per `20260625233339…`); idempotency keys on session create; `payment-status` / `payment-webhook` /
    `reconcile-payments` parity; atomic confirmation (`202605190002…`).
  - Withdrawals: requests-only until provider integrated (no payouts executed).

---

## 10. Phase 9 — Supabase auth/RLS/migrations/services + Quran state (Decision 9)

- New Supabase project; code-first migrations in website repo (proposed `supabase/migrations/`,
  new — must not touch APP `supabase/`); user supplies connection later via env names (§12).
- RLS: authenticated-only RPC grants (pattern per `20260625233339…`, `20260722001048…`,
  `20260722013837…`); private tables/buckets deny anon; teacher/admin checks via `auth.uid()`;
  privileged RPCs locked to service-role.
- Quran state mapping into existing contracts (preserve guest + explicit migration):
  - Guest slices stay: `src/redux/slices/guestBookmark.ts`, `QuranReader/bookmarks.ts`,
    `QuranReader/notes.ts`, `QuranReader/readingTracker.ts`, `QuranReader/pinnedVerses.ts`,
    `QuranReader/styles.ts`, translations/tafsirs/readingPreferences, `session.ts`.
  - Server contracts stay: `src/utils/auth/apiPaths.ts` (`bookmarks`, `collections*`, `notes*`,
    goals/streak/activity-days via `src/utils/auth/api.ts`, `types/auth/{Goal,Streak,Note}.ts`).
  - Supabase tables for bookmarks/collections/goals/streak/private-notes/settings mirror these shapes;
    sync via website API routes + SWR mutate (same optimistic pattern as `BOOKMARKS_AND_COLLECTIONS.md`);
    one-time guest→account migration modal parity (`GuestBookmarksMigrationModal`,
    `users/syncLocalData` semantics) with explicit conflict handling.
  - No existing-application Supabase reads/copies; no credential/user migration.

---

## 11. Phase 10 — Reviewer test plan (Decision 10; reviewer runs)

Production builds are remote-only later; no auto-deploy. Reviewer runs:

- `tsc --noEmit` (bundled Node) — must pass.
- Focused Vitest via `node node_modules/vitest/vitest.mjs run <files>` (no yarn):
  Quran regression/hydration (`ChapterCard/index.test.tsx`, `useGetContinueReadingUrl.test.ts`,
  redux slices/migrations tests) + new academy/auth/booking/timezone/payment/idempotency suites.
- EN/AR responsive UI tests (RTL logical properties, `ar` + `/ar/quran` routes).
- Auth/RLS/role-guard/race/timezone/payment/idempotency suites (server-first; no live-provider dependency).
- Full regression map + commands: `docs/TILAWA_APP_PARITY.md` §10.

---

## 12. Entities / interfaces (website TypeScript targets)

```typescript
// Roles — server-decided only
type WebsiteRole = 'student' | 'teacher-pending' | 'teacher' | 'admin';

// Registration policy (RPC get_account_registration_policy)
interface RegistrationPolicy { teacherRegistrationEnabled: boolean; }

// Teacher (public; approved-only)
interface AcademyTeacher {
  id: string; slug: string; name: string; avatarUrl: string | null;
  countryFlag: string; countryLabel: string; gender: 'male' | 'female';
  expertiseLabel: string; educationLevel: string;
  rating: number; reviewCount: number;
  sessionPriceCents: number; sessionDurationMinutes: number;
  pricingMode: 'per_lesson' | 'monthly' | 'both';
  monthlyPriceCents: number; monthlyLessons: number; monthlyDurationMinutes: number;
  teachingAudiences: string[]; teachingLanguages: string[];
  specialties: ('memorization' | 'tajweed' | 'fiqh' | 'aqeedah' | 'arabic_for_non_arabic_speakers')[];
  introVideoUrl: string | null; availableToday: boolean; qualityBadge: string | null;
}

// Lesson types (IDs must match APP/DB: intro | follow_up | intensive_review)
type LessonTypeId = 'intro' | 'follow_up' | 'intensive_review';
interface LessonTypeOption {
  id: LessonTypeId; label: string; subtitle: string;
  durationMinutes: number; priceCents: number; currency: 'USD';
}

// Booking / lesson (UTC ISO; IANA zones alongside)
type BookingStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';
type PaymentStatus = 'unpaid' | 'paid' | 'refunded';
interface LessonBooking {
  bookingId: string; lessonId: string | null; teacherId: string;
  scheduledAtUtcIso: string; teacherTimeZone: string;
  lessonTypeId: LessonTypeId; durationMinutes: number;
  amountCents: number; currency: 'USD';
  status: BookingStatus; paymentStatus: PaymentStatus;
}

// Availability
interface AvailabilitySlot { id: string; start: string /* HH:MM */; end: string; }
interface WeeklyAvailabilityDay { id: string; weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7; enabled: boolean; slots: AvailabilitySlot[]; }

// Subscription (5-day grace parity)
type SubscriptionStatus = 'active' | 'expired' | 'cancelled';
interface TeacherSubscription {
  id: string; teacherId: string; studentId: string;
  monthlyPriceCents: number; currency: 'USD';
  includedLessons: number; remainingLessons: number; durationMinutes: number;
  startsAtUtcIso: string; endsAtUtcIso: string; status: SubscriptionStatus;
}

// Payments (server-computed cents; gateway later)
type PayProvider = 'simulation' | 'pending-provider';
interface PaymentSession {
  paymentId: string; status: 'pending' | 'requires_action' | 'paid' | 'failed' | 'cancelled' | 'expired' | 'refunded';
  baseCents: number; discountCents: number; gatewayFeeCents: number;
  platformFeeCents: number; teacherNetCents: number; totalCents: number;
  currency: 'USD'; idempotencyKey: string; checkoutUrl: string | null;
}

// Chat / notifications / reviews / earnings / withdrawals
interface ChatThread { conversationId: string; peerId: string; messages: ChatMessage[]; requestStatus: 'none' | 'pending' | 'accepted' | 'rejected'; }
interface ChatMessage { id: string; senderId: string; body: string; sentAtUtcIso: string; retracted: boolean; }
interface AcademyNotification { id: string; title: string; body: string; path: string | null; groupKey: string | null; readAtUtcIso: string | null; }
interface TeacherReview { id: string; teacherId: string; lessonId: string; rating: number; comment: string | null; visible: boolean; }
interface EarningEntry { id: string; amountCents: number; currency: 'USD'; type: string; settled: boolean; }
interface WithdrawalRequest { id: string; teacherId: string; amountCents: number; currency: 'USD'; status: 'pending' | 'approved' | 'rejected' | 'paid'; }
```

Quran preserved contracts (unchanged): `types/Bookmark.ts`, `types/auth/{Goal,Streak,Note,ActivityDay}.ts`,
`src/utils/auth/apiPaths.ts` URL builders, redux slice states (see §10/§11 + parity doc §10).

---

## 13. Environment variable NAMES only (no values; nothing read in Phase 1)

New Tilawa names (code-first; user supplies connection later):

- `NEXT_PUBLIC_TILAWA_SUPABASE_URL` (client)
- `NEXT_PUBLIC_TILAWA_SUPABASE_ANON_KEY` (client)
- `TILAWA_SUPABASE_SERVICE_ROLE_KEY` (server only — never `NEXT_PUBLIC_`)
- `NEXT_PUBLIC_TILAWA_SITE_URL`
- `TILAWA_PAYMENT_SIMULATION_ENABLED` (dev-only; production must be false/absent → paid blocked)
- `TILAWA_PAYMENT_PROVIDER` (e.g. unset/`pending` until gateway chosen)
- `TILAWA_MEET_ADAPTER` / `TILAWA_ZOOM_ADAPTER` (adapter selection; credentials stay server-side)
- `TILAWA_GOOGLE_CLIENT_ID` / `TILAWA_GOOGLE_CLIENT_SECRET` (server secret; only if custom OAuth needed
  beyond Supabase Google provider)

Existing names encountered (do not duplicate; reuse where applicable):
`NEXT_PUBLIC_VERCEL_ENV`, `NEXT_PUBLIC_VERCEL_URL`, `VERCEL_URL`, `VERCEL_PROJECT_PRODUCTION_URL`,
`NEXT_PUBLIC_DEPLOYMENT_TARGET`, `NEXT_PUBLIC_SENTRY_*`, `NEXT_PUBLIC_BUILD_DATE`,
`NEXT_PUBLIC_COMMIT_HASH`, `NEXT_PUBLIC_APP_VERSION`, `NEXT_PUBLIC_APP_ENV`,
`NEXT_PUBLIC_GENERATE_SITEMAP_ADDITIONAL_PATHS`, `API_GATEWAY_URL` (static-build proxy override).

---

## 14. Dependency / acceptance checklist

- [ ] D1 Parity matrix complete (`TILAWA_APP_PARITY.md` §§1–9) with every APP Supabase path traced.
- [ ] D2 Rebrand file strategy reviewed; functional QF endpoints byte-identical; license notices intact.
- [ ] D3 `/` academy + `/quran` preserved homepage verified; no global home-route rewrite; `/ar`, `/ar/quran` OK.
- [ ] D4 Programs→teachers EN/AR USD responsive; zero fabricated records/prices/testimonials.
- [ ] D5 New Supabase migrations + RLS + role/registration guards; unified website account; Google + password.
- [ ] D6 Approved-only bookability DB-enforced; private docs admin-only; availability/slot pipeline UTC+IANA.
- [ ] D7 Full lifecycle incl. 5-day intro auto-complete job; real Meet/Zoom adapters; no fake URLs.
- [ ] D8 Cents-server-side; 20%-intensive exception; dev-only simulation; paid-blocked production; withdrawals requests-only.
- [ ] D9 Quran guest/server contracts preserved + explicit migration handling.
- [ ] D10 Reviewer test suites green (unit/type/EN/AR/auth/RLS/race/timezone/payment/idempotency/regression).
- [ ] No dirty-baseline damage (§15); no unapproved workflow file; no behavior change in Phase 1.

---

## 15. Dirty-baseline preservation (must remain intact)

Verified `git status --short` at Phase 1 start:

- `M .gitignore` (`.local-runtime` entry) — keep.
- `M next-env.d.ts` (generated) — keep.
- `M src/components/HomePage/ReadingSection/ChapterCard/index.tsx` (hydration fix) — keep.
- `?? src/components/HomePage/ReadingSection/ChapterCard/index.test.tsx` — keep.
- `?? .github/workflows/cloudflare-deploy.yml` (unapproved) — **do not include, touch, or reference as
  approved** in any phase.

Phase 1 adds only `docs/TILAWA_IMPLEMENTATION_PLAN.md` + `docs/TILAWA_APP_PARITY.md`.
No `git restore/reset/clean/stash`, no branch changes, no commits.

---

## 16. Migration & rollback considerations

- Website Supabase is a **new project**: migrations are greenfield (`supabase/migrations/` new in web
  repo). Rollback = per-migration `down` semantics + RPC-grant revocation order (mirror APP
  `revoke … from public, anon` pattern); never roll back by touching the Flutter project.
- RPC-first design: all money/slot/role transitions in `security definer` RPCs with
  `auth.uid()` checks + `for update` row locks (APP `accept_booking_request` pattern); RLS as second layer.
- Slot-lock parity: `lock_teacher_booking_slots` (`20260713004847…`) + pricing hardening
  (`20260625231607…`, `20260625234831…` withdrawal transitions, `20260722013837…` lifecycle) must be
  ported before any bookable UI ships; otherwise double-booking races are possible.
- Intro auto-complete + subscription-earnings maturation + reminder/push-outbox jobs need schedulers
  (pg_cron/Edge) from day one of Phase 7 — client timers are not a substitute.
- Quran-state Supabase mapping ships behind the existing QF contracts: dual-write then cutover per
  collection (bookmarks → collections → notes → goals/streak/settings), each with guest-migration test;
  any cutover must be reversible to QF read path until reviewer sign-off.
- Rebrand rollback: pure frontend; keep a `tilawa-brand` flag-free approach (direct copy change, not a
  feature flag) but retain the visible-vs-functional audit so a revert never re-breaks proxy hosts.

---

## 17. Bounded implementation queue (next phases propose; orchestrator approves each)

1. **Q2:** Brand-token + SEO/manifest/sitemap/nav copy (visible-only), codemod allowlist from §3; no route changes.
2. **Q3:** `/quran` reuse + academy `/` scaffold + scoped navigation audit (`ROUTES`, sitemap, `i18n.json`, POM).
3. **Q4:** Academy programs/teachers browse UI (EN/AR, USD formatting, responsive) on mocked-approved shapes
   (no fabricated production data; clearly-labeled fixtures, never shipped as real).
4. **Q5:** Supabase project scaffolding (migrations/RLS/RPC stubs per §§6–7) + Auth adapter + role guards.
5. **Q6:** Availability + booking + teacher accept/reject + lesson lifecycle + intro job + chat/notifications.
6. **Q7:** Payments backend (cents, idempotency, preflight, webhook/reconcile stubs, dev simulation gate).
7. **Q8:** Quran-state Supabase mapping + guest migration (one collection at a time).
8. **Q9:** Reviewer suites (auth/RLS/race/timezone/payment/idempotency/EN/AR/regression) → report.

Each queue item must state files changed, audit findings carried forward, unresolved questions (§18),
and validation actually run. Do not declare external configuration/test coverage complete.

---

## 18. Unresolved questions (explicit; not blocking Phase 1)

1. New Supabase project connection (URL/keys) — user supplies later; code-first only. (Decision 5)
2. Payment provider choice + fee schedule — gateway later; production paid stays blocked. (Decision 8)
3. Google OAuth details (Supabase provider vs custom client) — confirm when project exists. (Decision 5)
4. Meet/Zoom credential hosting (service accounts/OAuth app) — adapter interfaces prepared, secrets later. (Decision 7)
5. Tilawa canonical host + store/app-link ids for SEO/manifest (replaces `quran.com`, Apple `1118663303`,
   Android `com.quran.labs.androidquran`) — needed before Q2 ships.
6. Whether existing QF-JWT accounts get linked or fresh Supabase identities (Decision 9 mapping choice).
7. Web-push provider for academy notifications (APP uses FCM for mobile; web needs Web Push/VAPID plan).
8. Live-database verification of APP `private.assert_teacher_booking_terms` intensive formula and any
   post-`20260704` pricing patches — **cannot be performed in Phase 1** (no credentials, no live DB;
   see parity doc §9). Source-file claims below are file-backed; DB-effective claims are marked unverified.
