# Tilawa Brand Cleanup Queue (next bounded task, before backend)

Status: **inventory only — no changes made here.** Phase 2 + reviewer-fix run rebranded the
academy surface, Quran navbar/footer/hero, SEO/manifest/icons, share URLs, and OG defaults.
The reachable surfaces below still carry legacy Quran.com brand/promotional copy and need a
dedicated branding-cleanup pass. No fabricated replacements: remove or rewrite honestly,
preserving `LICENSE` attribution and required Quran Foundation API/service references.

## Page bodies with brand/store links

- `src/pages/apps.tsx` — Quran.com app directory incl. Apple/Play store hrefs
- `src/components/HomePage/HomePageApps.tsx` — featured-apps cards with store hrefs
- `src/pages/developers/index.tsx` — `LabsSection` (`labs.quran.com`) + `CommunitySection`
  (`src/components/Navbar/NavigationDrawer/LabsSection.tsx`,
  `src/components/Navbar/NavigationDrawer/CommunitySection.tsx`)
- `src/pages/support.tsx` — iOS store href
- `src/pages/_error.tsx` — `https://feedback.quran.com/` link
- `src/components/Auth/Announcements/AuthOnboardingAnnouncement/Slides/FeedbackSlide.tsx` —
  `https://feedback.quran.com` link
- `src/pages/about-us.tsx` + `locales/*/about.json` — review `about:credits.*` (King Fahd
  Complex credit is factual third-party attribution; keep or reword, do not fabricate)
- `src/pages/ramadan2026/index.tsx`, `src/pages/ramadanchallenge/index.tsx` —
  `EXTERNAL_ROUTES` promo links (WhatsApp/Telegram channels, QuranReflect + store links)

## Promotional/owned-product surfaces (decide: remove vs Tilawa replacement)

- `src/components/DonatePopup/`, `src/components/Fundraising/`, `src/components/Banner/` —
  donate/fundraising banners and popups
- `src/redux/slices/fundraisingBanner.ts`, `src/redux/slices/session.ts` (donation popup
  triggers), `src/components/SessionIncrementor.tsx` if coupled
- `src/components/AyahWidget/` (`QuranWidget.tsx`, `WidgetFooterActions.tsx`) — embed widget
  chrome (widget title already follows `common:quran-com` = Tilawa)
- `src/pages/embed/`, `src/pages/embed/v1.tsx` — embed page metadata/chrome

## Locale copy still naming Quran.com (EN + mirrors)

- `locales/en+ar/common.json` — `announcements.auth-onboarding.*` (data-sync, feedback,
  quran-foundation-link, welcome), `fundraising*`, `fundraising-share-title`, `popup.*`
- `locales/en+ar/home.json` — `apps.*` (Quran Android/iOS/QuranReflect names; section currently
  unmounted from the homepage), `welcome.title`, `share-quran.*`
- `locales/en/about.json`, `locales/en/login.json`, `locales/en/onboarding.json` (+ mirrors)
- `locales/en/developers.json`, `locales/en/app-portal.json`, `locales/en/apps.json` —
  audit for brand/store claims

## Per-page social previews (functional QF OG service; decide per page)

- `src/pages/embed/index.tsx` (`getEmbedOgImageUrl`), `src/pages/about-the-quran/index.tsx`
  (`getAboutTheQuranImageUrl`), `src/pages/learning-plans/index.tsx`
  (`getLearningPlansImageUrl`), `src/pages/media/index.tsx`
  (`getMediaGeneratorOgImageUrl`) — all via `src/lib/og.ts` (`BASE_OG_URL og.qurancdn.com`).
  Default metadata already uses the deployment-local `/tilawa/app_icon.png`.

## Static public files (binaries untouched — need designer export, not code)

- `public/favicon.ico`, `public/logo.png`, `public/images/logo/*` — old logo bytes still on
  disk (unreferenced by `src` after this run; explicit `/tilawa/*` link/manifest tags take
  precedence). `public/twitter-verification.html` — legacy verification file.

## Internal-only references (kept deliberately; not user-visible)

- `src/utils/url.ts` comment example (`quran-com-*.vercel.app`), `src/utils/auth/*` endpoint
  paths, `src/utils/api.ts` hosts, `src/pages/api/proxy/[...path].ts`, QF font/CDN URLs,
  `pendingBookmarkModalRestore.ts` URL-parse base — functional, out of brand scope.
- `QURAN_URL` export (`src/utils/navigation.ts`) — legacy host constant retained for
  compiling old mocks only; user-visible emitters now use `getShareableVerseUrl`.

## Acceptance for the cleanup task

- `rg -l 'Quran\.com|quran\.com|feedback\.quran\.com|labs\.quran\.com'` over `src public
  locales` returns only internal/functional hits listed above.
- No invented domains, store IDs, testimonials, stats, or legal claims.
- Focused suites + `tsc` baseline comparison stay green.
