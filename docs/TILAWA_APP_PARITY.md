# Tilawa Academy — APP Parity Audit (Phase 1)

Status: **audit only — no application behavior changed.**
`APP:` = Flutter reference `C:/Users/mu7me/Downloads/Edge D/Tarteel Flutter` (**read-only**).
`WEB:` = this repository. “Supabase-backed” = APP `Supabase*Repository` + `supabase/migrations` +
`supabase/functions`. `Local*` demo fallbacks are documented only to be **excluded** from parity.

Historical-source warning (user-supplied, verified against files where possible): the old
`private.assert_teacher_booking_terms` intensive `base+25` rule contradicts the newer
`20260704153413_intensive_lesson_percentage_pricing.sql` patch (`round(trunc(base) * 1.2)`).
Website approved rule is **20%** (Decision 8). §9 distinguishes file-verified claims from
live-database verification that Phase 1 cannot perform.

---

## 1. Booking parity matrix

| # | APP rule (Supabase-backed) | APP source | WEB target (Phase 6+) | Notes |
| --- | --- | --- | --- | --- |
| B1 | Slot picker reads server availability window; reschedule passes exclusions | `teacher_booking_repository.dart` `fetchAvailableSlots/fetchAvailableDates` → RPC `get_teacher_available_slots` with `p_window_start/end`, `p_duration_minutes`, `p_excluded_booking_request_id`, `p_excluded_lesson_id` | TS service + API route calling same-RPC-shape `get_teacher_available_slots`; UTC ISO in/out; IANA display only | APP converts UTC→local via `teacherBookingUtcSlotToLocal`; WEB must do UTC + `teacherTimeZone` explicitly |
| B2 | Pre-submit revalidation; conflict throws slot-unavailable | `_ensureBookingSlotIsAvailable` → `TeacherBookingSlotUnavailableException` (`BOOKING_SLOT_UNAVAILABLE` / `SELECTED BOOKING/LESSON TIME CONFLICTS`) | Server RPC re-check + `for update` locks; UI surfaces “slot taken” without data loss | Race safety is server-side; client pre-check is UX only |
| B3 | Subscription holders get a `follow_up` zero-amount option; intro blocked under subscription | `fetchLessonTypeOptions` (active subscription → single `follow_up`, price 0) + `saveBooking` throwing on subscription+intro | Same branching in TS booking-options builder; amount forced 0 server-side | Subscription validity = `status active + remaining > 0 + within ends_at + 5d grace` (§4) |
| B4 | Intro once per teacher; create + update paths both guarded (`exceptBookingId`) | `_hasUsedIntroLesson`: checks `lessons` (completed intro) + `booking_requests` (pending/accepted intro) + `lessons` (scheduled intro) | RPC-enforced once-per-teacher (unique partial index + RPC check); update path excludes self | See §9 for duration rule |
| B5 | Submit path is one RPC with fallback for missing-request retry | `create_or_update_booking_request` with `P0001 booking request not found` → retry with null id | Same RPC contract; idempotent client request keys | Slot-conflict errors map to B2 UX |
| B6 | Cancel path is one RPC with notifications | `cancel_booking_request` (`p_request_id`, `p_emit_notification`) | Same | Student + teacher cancel both route here; lesson-cancel handshake is separate (§5) |
| B7 | Current booking = nearest future pending/accepted within 12h lookback; intro past auto-complete hidden | `fetchCurrentBooking` (`scheduled_at >= now-12h`, limit 10, `_currentUsableBooking` + intro-due filter) | TS selector with identical 12h + intro-due semantics | Intro-due = §3 |
| B8 | Same-day 1h lead time (APP-local demo only) | `_sameDayBookingLeadTime = 1h` in `LocalTeacherBookingRepository` | **Do not copy as-is**; server lead-time rule belongs in slot RPC config | Local demo is not parity target |

Lesson-type IDs are contract: `intro | follow_up | intensive_review` (DB CHECK in
`20260625231607_harden_booking_pricing_and_lesson_types.sql`).

---

## 2. Teacher accept / reject parity (authoritative: migration + repository)

Source: `supabase/migrations/20260625233339_harden_booking_acceptance_and_rpc_grants.sql`
(`accept_booking_request`), `teacher_booking_requests_repository.dart`
(`SupabaseTeacherBookingRequestsRepository`).

- Auth: `auth.uid()` required; booking locked `for update`; **only `teacher_id = auth.uid()`**
  can accept; only `status = pending` transitions.
- Terms gate (matches user-supplied historical warning):
  - `subscription_id NOT NULL` → `amount = 0 AND payment_status = paid`.
  - `lesson_type_id = 'intro'` → `amount = 0 AND payment_status = paid`.
  - else → `amount > 0 AND payment_status = paid AND payment_transaction_id NOT NULL`.
- On accept: `booking_requests.status → accepted`; `lessons` row created if absent
  (copies teacher/student/title/type/schedule/duration/amount/currency/subscription/payment refs;
  `meeting_provider_label = 'Google Meet'`, placeholder link — WEB must replace with real adapter, §6);
  returns `{ booking_request, lesson_id }`; caller triggers Meet-link creation.
- Grants: `accept/reject/cancel_booking_request`, `consume_subscription_lesson`,
  `reschedule_lesson`, `cancel_lesson_by_participant` revoked from `public, anon`, granted to
  `authenticated` (RPCs still enforce ownership server-side).
- Teacher inbox visibility: pending + `amount > 0` rows are **hidden** from the teacher
  (`_isVisibleBookingRowToTeacher`; `isAwaitingStudentPayment`, `canTeacherReview` in
  `teacher_booking_requests_repository.dart`). Rejected/accepted always visible.
- Admin never accepts lesson bookings (Decision 5/7): no admin path calls `accept_booking_request`
  with a non-teacher uid — the RPC itself rejects it; WEB admin UI must not expose the action.

---

## 3. Intro lesson parity

Sources: `teacher_intro_lesson_policy.dart`, `teacher_booking_repository.dart`
(`_buildLessonTypeOptions`), `20260713175812_auto_complete_intro_lessons_after_five_days.sql`,
`202609090001`-adjacent intro-once migration `202609090001_intro_lesson_once_and_lesson_type.sql`
(name per migration listing), `20260625231607…` pricing hardening.

- Type id: `intro`. Free: `price/amount = 0`, `payment_status = paid` before acceptance (§2).
- Duration: `base > 35 ? base - 15 : base` — **verified in APP source**
  (`_buildLessonTypeOptions` lines 658–660). Live-DB verification: **not performed in Phase 1**
  (no credentials/access; see §9).
- Once per teacher: §1-B4.
- Auto-completion: 5 days after end:
  `introLessonAutoCompletesAt = scheduledAt + duration + 5d`; past-due intros read as completed
  (`isIntroCompletionDue`, `_currentUsableBooking`). WEB needs a scheduled job (pg_cron/Edge),
  not client logic.

---

## 4. Subscription parity

Sources: `teacher_subscription_repository.dart`, `teacher_subscription_models.dart`,
migrations `202605010002_monthly_subscriptions.sql`, `202605070002…_grace…`,
`202605070003…schedule…`, `20260626231839_require_paid_subscription_earnings.sql`.

- Table `student_subscriptions`; statuses `active/expired/cancelled`.
- Active definition (Supabase path): `status = active AND remaining_lessons > 0 AND
  ends_at > now() - 5d` (query) ≡ model `isActive = active && remaining > 0 &&
  accessEndsAt (= ends_at + 5d) > now`; `isInGracePeriod` when past `ends_at` but inside grace.
- `consume_subscription_lesson` RPC is the only decrement path; Supabase
  `createMonthlySubscription` **throws** — subscriptions originate from payment confirmation only.
- Booking with subscription: zero-amount `follow_up` option; intro disallowed; acceptance requires
  subscription-paid terms (§2). Earnings maturation respects grace + paid-only requirement.

---

## 5. Lesson lifecycle parity

Source: `teacher_lesson_details_repository.dart` (`SupabaseTeacherLessonDetailsRepository`) +
lifecycle migrations (`20260722013837…`, `202605120002_lesson_completion_confirmation.sql`,
`202605010005_lesson_cancellation_requests.sql`, `20260720170553…` moderation-adjacent).

| Transition | APP RPC | WEB target |
| --- | --- | --- |
| Reschedule | `reschedule_lesson(p_lesson_id, title, type, scheduled_at, duration, emit_notification)` | Same; slot exclusions = current lesson/booking ids |
| Participant cancel | `cancel_lesson_by_participant(p_lesson_id, emit_notification)` | Same |
| Cancellation request flow | `request_lesson_cancellation` → `resolve_lesson_cancellation(p_request_id, approved, emit_notification)`; pending lookup in `lesson_cancellation_requests` | Same tables/RPCs; financial follow-up via `get_lesson_financial_state` |
| Completion handshake | `request_lesson_completion` → `confirm_lesson_completion` / `reject_lesson_completion(reason)`; pending lookup in `lesson_completion_requests` | Same; ratings unlock on completion |
| Financial state | `get_lesson_financial_state` → `{ payment_status, financial_status }` mapping to `paid/pending/refunded` + `LessonCancellationFinancialStatus` (`notRequired/creditRestored/reviewPending/refunded/failed/manualReview`) | Same enum mapping in TS |
| Fetch/list | `lessons` by `student_id` (desc), by-id with `student OR teacher` guard; teacher names from `teacher_profiles`; Hive cache | SWR + server pagination; no client-side cache authority |

---

## 6. Meet / Zoom adapter parity (real adapters prepared; no fake URLs)

Sources: `teacher_lesson_details_repository.dart` (`ensureMeetingLink`, `ensureZoomMeeting`),
`teacher_booking_repository.dart` (`_createMeetLinkForLesson`), Edge functions
`create-meet-space`, `create-zoom-meeting`.

- Creation requires a saved lesson or booking UUID; cached/DB links are reused when valid.
- Validators (port exactly): Meet `^https://meet\.google\.com/[a-z]+-[a-z]+-[a-z]+$` (case-insensitive);
  Zoom `https host endsWith zoom.us, path[0] == 'j'`.
- APP placeholder `https://meet.google.com/new` appears only in local/demo + freshly-inserted lesson
  rows — **it is not a joinable link**. WEB must never persist or display it as a meeting URL; the
  acceptance/lessons insert default must be replaced by the adapter-created link before student display.
- Zoom fields: `zoom_meeting_id / zoom_join_url / zoom_password / zoom_created_at`
  (migration `20260707193512_lesson_zoom_links.sql`).

---

## 7. Payments / chat / notifications / earnings / withdrawals / reviews / coupons parity

- **Payments** (`teacher_payment_repository.dart`, `teacher_payment_models.dart`, functions
  `create-payment-session`, `payment-status`, `payment-webhook`, `reconcile-payments`,
  migrations `202605120001_payment_fee_breakdown.sql`, `202605120003_payment_expiry_events.sql`,
  `202605120005_payment_release_hardening.sql`, `202605190002_atomic_payment_confirmation.sql`,
  `20260722190530_accept_verified_coupon…`, `20261005000257_lesson_payment_checkout_preflight.sql`,
  `20260907184153_harden_payment_paths.sql`):
  preview + create session shapes (`base/originalBase/discount/gatewayFee(+basisPoints/fixed/VAT split)/
  platformFee(+basisPoints)/teacherNet/total/support/currency` + optional payment-currency fields);
  idempotency keys (`type:user:teacher:fingerprint`); coupon code upper-trim; provider mapping
  (`card/paymob-wallet → paymob`, `egypt-wallet → egypt_wallet_gateway`); grossed-up gateway fee helper
  `calculateGrossedUpGatewayFee` (240bp + 3 + 1400bp VAT, ceil/round to 2dp). WEB: same breakdown in
  **USD cents**, server-computed; gateway deferred (§9 of plan).
- **Chat** (`teacher_chat_repository.dart`, `chat_supervision_*`, `chat_compliance_confirmation.dart`,
  migrations `202605010004_direct_chat.sql`, `202606050001…_user_states…`, `202606050002…_previews_rpc…`,
  `20260705135324_direct_chat_message_requests.sql`, `20260707161836_retract…`,
  `20260920151503_chat_supervision_and_contact_limits.sql`, `20260920215008…_admin_controls…`,
  `20260712135050_guard_direct_chat_compliance.sql`, `20260720170553…_moderation…`):
  conversations/messages/user-states; fetch + realtime watch; send/accept-request/reject-request/delete/
  mark-read/settings/retract; supervision inbox/claim/resolve; contact limits; compliance gate.
- **Notifications** (`app_notification_service.dart`, `send-push-notification`,
  `register-device-token`, `dispatch-notification-pushes`, `202605010008…_navigation_path…`,
  `202605010009/010_device/realtime…`, `202606200001_merge_grouped…`, `20260728153735…_reminders…`,
  `20260728173455…_outbox…`): `notifications`/`device_tokens`, `group_key` merging, navigation `path`,
  reminder queue + push outbox + dispatch workers. WEB needs a Web-Push adapter (unresolved, plan §18).
- **Earnings** (`teacher_earnings_repository.dart`, `202605070001…`,
  `202605070002…`, `202605070003…`, `20260626231839…`): per-currency summaries, pending vs settled,
  matured subscription/gift/support paths, paid-only subscription earnings.
- **Withdrawals** (`teacher_withdrawal_repository.dart`, `20260623121046_withdrawal_approval_exception.sql`,
  `20260625234831_harden_withdrawal_status_transitions.sql`): request lifecycle with hardened status
  transitions; admin approval path; **website = requests-only until provider integrated** (Decision 8).
- **Reviews/ratings** (`teacher_reviews_repository.dart`, `teacher_lesson_rating_*`,
  `20260712135048_harden_teacher_profiles_and_reviews.sql`, marketplace review aggregates in
  `202605190001…`): per-lesson review + `reviews` visible-flag aggregates feed marketplace ranking.
- **Coupons** (`teacher_discount_coupons_repository.dart`, `20260707124118…`): code/percent(1–90)/active;
  verified-coupon acceptance at payment confirm.
- **Registration policy** (`account_registration_policy.dart`,
  `20261010173126_teacher_registration_controls.sql`): `platform_settings.teacher_registration_enabled`
  (seed `false`), `private.teacher_registration_enabled()`, `get_account_registration_policy()` for
  `authenticated`, admin get/set + audit; role/tier-creation guards re-check policy (server race-safe).
- **Marketplace/visibility/ranking** (`20260630234141…_visibility…`, `202608080002…_ranking…`,
  `20260912135049…_retention…`, `202605060003…_pricing…`, `20260626093614…_tier_currency…`,
  `20260626155546…_ip_rates…`, `20260626224025…_egypt_tiers…`, `20260626224652…_debug…`,
  `20260713183654…_market_aware_profile…`, `20260729100906…_intro_video…`,
  `20260531113607…_share…`, `202606020001…_slugs…`, `20260603152935…_badge_override…`,
  `20260603155533…_honorary_no_ranking…`, `202606230001…_specialization_values…`,
  `202606200…/20260621…_metrics…`): approved-only public surface; tier-aware currency/region pricing;
  badge overrides that must not perturb ranking; fixed specialization values (§8).

---

## 8. Profiles / specialties / filters / theme / assets (audit)

- `TeacherProfile` (`teachers_data.dart`): id/slug/name/avatar/country/gender/expertise/education/
  rankingScore/qualityBadge/rating/reviewCount/sessionPrice+duration/pricingMode/monthly{price,lessons,
  duration,description}/audiences/languages/displayCurrency/marketRegion/primaryTopic/activeStudents/
  lessonCount/languages/bio/about/introVideo/topics/highlights/verified/availableToday/gradients.
  `LocalTeachersData` 4 demo teachers are **not** website data (Decision 4).
- `TeacherAccountProfile`/`StudentProfile`/`TeacherPricingTier`/`AppCurrencyOption`
  (`account_profile_models.dart`): approval/pricing/gender enums + currency/audience defaults
  (`defaultTeacherTeachingAudiences = ['arabic_native']`, `defaultTeacherTeachingLanguages = ['ar']`).
- Specialties (5): `memorization, tajweed, fiqh, aqeedah, arabic_for_non_arabic_speakers` with AR/EN labels;
  `arabic_for_non_arabic_speakers` hidden from Arabic filters (`showInArabicFilters = false`).
  Filter topics = `allTeacherSpecialtiesFilterValue ('كل المجالات')` + ids.
- Availability models: `WeeklyAvailabilityDay{id sun..sat, label AR, enabled, slots[]}` +
  `TeacherAvailabilitySlot{id, start, end}`; weekday mapping sun→7…sat→6 (Dart `DateTime` constants).
- Dashboard: `TeacherDashboardSummary{todayLessonsCount, pendingRequestsCount, activeStudentsCount,
  availableEarnings, …}`.
- Theme (`lib/config/theme.dart`): primary `#037F70`, bright `#04B49D`, container `#E6F8F5`,
  gold `#D4AF37`, light bg `#FAFAFA`, dark bg `#05070D` (+ teal/emerald/gradient system).
- Assets: `assets/icon/app_icon.png`, `logo.svg` — **not copied in Phase 1** (Decision: audit phase only).
- Tables inventory (APP `supabase_tables.dart`, website needs subset in new project):
  `profiles, student_profiles, teacher_profiles, teacher_pricing_tiers, teacher_discount_coupons,
  teacher_private_contacts, teacher_availability, booking_requests, lessons,
  lesson_cancellation_requests, lesson_completion_requests, student_subscriptions, reviews,
  earnings_transactions, withdrawal_requests, payment_transactions, platform_settings,
  notifications, notification_campaigns(+user_states), device_tokens, direct_conversations,
  direct_messages, direct_conversation_user_states, admin_audit_logs, admin_notes, support_messages,
  feedback_submissions`; buckets `avatars, teacher-documents (private), voice-room-group-images,
  notification-images`. Voice-room/wallet/gift/presence tables are **out of academy scope** unless a
  later phase justifies them.

---

## 9. Pricing exception (ONE approved divergence) + verification status

| Rule | APP source (`teacher_booking_repository.dart`) | APP DB migration chain | Website approved rule |
| --- | --- | --- | --- |
| Intensive 60-min price | `_intensiveLessonPrice(base) = base + 25` (whole units, SAR context) | `20260625231607…` hardens `base + 25`; **`20260704153413…` patches to `round(trunc(base) * 1.2)`** via regex rewrite of `create_or_update_booking_request`, with a hard failure if the `+25` pattern is not found | `intensiveCents = round(baseCents * 1.20)` to nearest cent, USD, server-side |
| Intro duration | `base > 35 ? base - 15 : base` | No contrary migration found in Phase 1 file scan | Same rule, TS port |
| Intro price | `0` | `amount = 0 AND paid` enforced at acceptance | Same |
| Subscription lesson price | `0` (deducted from subscription) | paid-through-subscription terms | Same, cents |

Worked example (website): `base $45.00 (4500c)` → intensive `round(4500 × 1.2) = 5400c ($54.00)`.
APP-source equivalent would be `base + 25` in APP units — **not comparable 1:1** (different currency and
minor units), which is why the exception is defined as a formula, not a value.

Verification status:

- **File-verified:** `_intensiveLessonPrice`, `_buildLessonTypeOptions`, `accept_booking_request` terms,
  `20260704153413` 20% patch text, `20260625231607` lesson-type CHECK + pricing block.
- **Explicitly NOT verified (cannot be in Phase 1):** effective live-DB function body of
  `create_or_update_booking_request` / `private.assert_teacher_booking_terms`, and whether any later
  migration re-patches intensive pricing after `20260704`. No live DB access, no credentials read,
  no Supabase resource changes per task constraints. Reviewer must confirm against the APP project
  before porting the RPC verbatim; the website’s 20% rule stands regardless per user approval.

---

## 10. Regression test map (focused; reviewer runs; Phase 1 adds no code)

### 10.1 Must-stay-green Quran/unit suites (existing)

| File | Covers | Command (bundled Node; no yarn) |
| --- | --- | --- |
| `src/components/HomePage/ReadingSection/ChapterCard/index.test.tsx` | SSR/hydration: single reading link, no nested `a`/`button`, no hydration/DOM-nesting warnings (dirty-baseline fix) | `node node_modules/vitest/vitest.mjs run src/components/HomePage/ReadingSection/ChapterCard/index.test.tsx` |
| `src/hooks/useGetContinueReadingUrl.test.ts` | Continue-reading URL selection (sessions vs redux vs default `1:1`) | `node node_modules/vitest/vitest.mjs run src/hooks/useGetContinueReadingUrl.test.ts` |
| `src/redux/migrations.test.ts`, `migration-scripts/migrating-recent-reading-sessions.test.ts` | Persisted-state migrations (guest data safety) | `node node_modules/vitest/vitest.mjs run src/redux/migrations.test.ts src/redux/migration-scripts/migrating-recent-reading-sessions.test.ts` |
| `src/redux/slices/guestBookmark.test.ts`, `QuranReader/bookmarks.test.ts`, `pinnedVerses.test.ts`, `readingTracker.test.ts`, `studyMode.test.ts`, `styles.test.ts` | Guest/server bookmark, notes-adjacent, tracker, styles contracts (Phase 9 mapping must not break) | `node node_modules/vitest/vitest.mjs run <each file>` |
| `src/redux/actions/sync-locale-dependent-settings.test.ts`, `middleware/defaultSettingsMiddleware.test.ts`, `redux/utils/getPersistedTheme.test.ts` | Locale/theme/default-settings persistence | `node node_modules/vitest/vitest.mjs run <each file>` |
| Type check | Whole-repo TS soundness | `node node_modules/typescript/bin/tsc --noEmit` |

### 10.2 Academy suites to add (reviewer phase; none exist yet — do not claim coverage)

- `booking`: slot-conflict race (concurrent creates → exactly one wins), reschedule exclusions, cancel paths.
- `pricing`: intensive `round(base × 1.2)` cents table (incl. rounding edge `x.xx5`), intro $0, subscription $0, client-amount tamper rejection.
- `intro`: once-per-teacher (create + update-except-self), duration table (`>35 → −15`), 5-day auto-complete boundary.
- `timezone`: UTC store + teacher/student IANA display matrix (incl. DST-adjacent zones), midnight-boundary slots.
- `auth/RLS/roles`: registration-policy gate (open/closed + race), teacher-pending→approved transitions, admin-only approval docs, admin-cannot-accept-booking, approved-only bookability, private-contact invisibility.
- `payments/idempotency`: duplicate session creates → single transaction; webhook/reconcile replay safety; production simulation-disabled (paid blocked); withdrawals requests-only.
- `EN/AR responsive`: `/`, `/quran`, `/ar`, `/ar/quran`, programs/teachers/booking flows; RTL logical properties; no hardcoded strings (new `academy` namespaces in `locales/en+ar/`).
- `Quran regression`: §10.1 full set + Playwright smoke (`tests/integration/**` with `tests/POM/home-page`, `tests/test-ids.ts`; prerequisites `ensureEnglishLanguage`, `clearSelectedTranslations`) after Phases 2–3.

### 10.3 Phase 1 validation actually run

- `git status --short` (dirty baseline confirmed; see plan §15).
- `node node_modules/typescript/bin/tsc --noEmit` — executed in Phase 1: FAILS on pre-existing
  errors unrelated to this phase (docs-only change adds no code): `open-next.config.ts` missing
  `@opennextjs/cloudflare` types, story mock gaps (`tests/mocks/chapters`, `tests/mocks/words`),
  FlashCard regex `es6` target flags, `QuranReaderStyles.layersFontScale` fixture gap,
  `media/utils.test.ts` verse-timing casts, `audioPlayerMachine.reset.test.ts` XState mismatch.
- Focused Vitest `ChapterCard/index.test.tsx` — executed in Phase 1: PASS (2/2).
- No production build, no installs, no broad `vitest run` (bounded-phase constraint).
- External configuration / full-suite coverage is **not** declared complete.
