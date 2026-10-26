# Tilawa video studio

## Automatic generation

`/video-studio/automation` controls one account's automatic generation. Buffer publishing has
separate connection and enable/pause controls on the same page (see `PUBLISHING.md`). Bind Workers
AI as `AI` and set `STUDIO_AUTOMATION_EMAIL_HASH` to the SHA-256 of the lowercase, trimmed account
email. Only a server-verified account with that confirmed email can read or change the automation.
The first activation binds its actual website user ID; an email or user ID supplied by a browser is
never accepted as ownership. Apply `0003_automation.sql` before deploying this code.

The existing minute cron advances a durable D1 state machine. Slots are 09:00, 14:00 and optionally
19:00 in `Africa/Cairo`, with IANA daylight-saving handling and a five-hour minimum between
automatic export reservations. Manual generation consumes a remaining daily slot and respects that
interval. There is no catch-up for past days. Pausing invalidates pending selection leases; existing
exports stay visible and cancellable in the normal library. The automation starts paused until the
owner activates it from their verified website session.

Qwen3-30B-A3B chooses from measured 30–70 second recordings, existing readers, portrait R2 images,
translations, Quran fonts and templates. A bounded rotating sample avoids scanning all recordings on
every run. Recently used passages are excluded for three days. The model receives identifiers and
catalogue metadata, never credentials. It does not generate Quran text, translations or audio, and
image selection currently uses collection/orientation metadata, not visual analysis. The server
checks all identifiers and resolves the canonical manifest before creating a project. The existing
renderer measures every ayah/translation before encoding and fails on overflow.

Maximum twelve model requests per UTC day, at most 450 output tokens per request and 20,000 input
characters; there is no paid model/provider fallback. This is a local automation budget, not a
reservation of the account-wide free Workers AI allocation. Platform capacity/quota failures are
reported with bounded retries. Each render uses the normal member quota, storage and concurrency
checks. The selected plan is immutable, and project/job linkage is committed atomically with the run
lease. Thirty-day automation history includes captions, selected IDs and render outcomes.

Validate with the studio Vitest suite, `test_database.py`, TypeScript/ESLint and
`tests/video-studio/automation.spec.ts`. Live verification must use this same production Worker;
never create a second website or staging resources for automation tests.

The independent pages `/video-studio` and `/video-studio/library` use the site's content gateway,
fonts, account session and design system. Cloudflare handles identity, canonical content resolution,
D1 reservations and private R2 access. Modal runs the shared Remotion scene with CPU workers.

## Production deployment

The studio runs inside the existing `tilawa-quran` Worker configured by `wrangler.jsonc`. Live
acceptance and subsequent live checks use this production website. Do not provision another staging
website or renderer. Production generation and download were verified on 2026-10-25; the former
staging Worker, build trigger, D1 database, three R2 buckets and GitHub environment were deleted.
Its Modal application was stopped and its application secret and proxy token were removed.
Historical Modal execution records may remain in the workspace; they are not an active deployment.

The production Cloudflare Builds trigger tracks only `production`. It builds the full source
checkout, creates a SHA-256 asset index, uploads all blobs before publishing its index, and deploys
the website. Never publish an index generated from an incomplete sparse checkout. D1 migrations are
additive and must be applied before deploying code using them.

The asset publisher uses the CI-provided `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` with
Cloudflare's R2 object API. It bounds concurrency and request rate, retries temporary errors, checks
content digests and reuses identical stored blobs. Local OAuth workflows use the official Wrangler
CLI fallback; the publisher never reads local OAuth credentials. The manifest is always published
last. Token permissions must cover only the intended account/resources.

Worker secrets: `QURAN_CLIENT_ID`, `QURAN_CLIENT_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `STUDIO_SIGNING_SECRET`, `STUDIO_MODAL_KEY`,
`STUDIO_MODAL_SECRET`, `STUDIO_MODAL_URL`. The four content/account settings are also required at
website build time, because the existing website content client and public account configuration use
them. Store private settings as secret build variables. Never send provider/account credentials to
Modal.

Worker variables: `STUDIO_ORIGIN` (exact HTTPS website origin), `STUDIO_ENABLED`, `QURAN_API_ENV`.
Bind `VIDEO_STUDIO_DB`, `VIDEO_STUDIO_ASSETS`, `VIDEO_STUDIO_PRIVATE`, the existing OpenNext cache
and self-reference service. A minute cron reconciles dispatch, leases, expiry and cleanup. Turnstile
was removed from the studio at the user's request. Guest uploads and generation require no challenge
token; owner isolation, origin checks, request limits, quotas, storage limits and execution leases
remain enforced.

Repeated Supabase sign-in and token-refresh confirmations for the same owner refresh quota without
unmounting the editor. A temporary session refresh failure keeps unsaved settings and the prepared
preview visible with a retryable error. Account switches, sign-out and rejected authentication still
invalidate the previous owner immediately, and aborted responses cannot restore that owner's state.

Modal secret: only `STUDIO_ORIGIN` and the matching `STUDIO_SIGNING_SECRET`. Set `STUDIO_MODAL_APP`
and `STUDIO_MODAL_SECRET_NAME` to `tilawa-video-studio`, then run
`modal deploy services/video-renderer/app.py` with Modal SDK 1.6.2. Its private dispatcher requires
a Modal proxy token; put that token only in the Worker secrets. Temporary job directories are
removed after execution. No GPU is needed. Default limits: 4 CPU, 4 GiB, 20 minutes, two containers.
Each job renders two frames concurrently inside one export. The initial 2-CPU, one-frame setting was
too slow near the 180-second output ceiling in the staging benchmark.

The GitHub workflow validates the implementation and deploys Modal only from pushes to `production`
(or an explicitly requested manual production run on that branch). Its `video-studio-production`
GitHub Environment accepts only that exact branch and holds a dedicated 90-day Modal CI token.
Rotate it before expiry in the platform secret manager. This is a dedicated workspace credential;
the GitHub environment and workflow enforce the production deployment scope. Website deployment uses
Cloudflare Builds; this avoids two pipelines overwriting the same Worker.

## Policy and operations

The optional `VIDEO_STUDIO_BACKGROUNDS` binding reads the existing `tilawa-video-backgrounds`
bucket's `manifest.json`. It lists its curated portrait/landscape JPEG, PNG and WebP images
alongside the six legacy videos. Only manifest-listed image keys are served through the site's
streaming `/api/video-studio/backgrounds/:id` route; browser and Modal use this same route.
Selection is stored as a stable `r2-` identifier. Resolution freezes the object's ETag and
conditional reads reject a changed image rather than silently altering an already prepared or queued
video. The source bucket is read only by the studio. No R2 credentials or new external host
permissions are sent to Modal.

Guest: 2 videos/day, 60 seconds each, 100 MiB active storage, projects/files retained 24 hours.
Account: 10/day, 180 seconds each, 1 GiB active storage, projects 30 days after save, files 7 days.
Days reset in Africa/Cairo including DST. Global output is capped at 60 minutes/day; one active job
per owner and two rendering leases globally. Failed service attempts refund the reservation;
cancellation after rendering starts remains charged. Deleting files cannot reset today's quota.

The client sends selections, never authoritative Quran text or timing. Preview manifests are hashed;
generation resolves them again and rejects changed previews. Jobs freeze the selected revision. Font
bytes are verified in the browser and renderer. Missing glyph data, timing, audio or fonts fail
explicitly. Uploaded files remain unusable until the remote decoder validates their actual format,
dimensions and duration. Uploaded background audio is muted.

Set `STUDIO_ENABLED=0` to stop new generation without interrupting library downloads or job
reconciliation. Monitor D1 job status/error, `created_at`, `started_at`, `render_started_at`,
`finished_at`, duration, attempts and output bytes. Never log signed URLs or private content.
Production has its own D1 database and asset/private buckets. The user's production activation
request authorizes the configured launch limits; a deployment result alone does not prove rendering.

## Validation

Run `yarn test`, `python services/video-renderer/test_database.py`,
`yarn tsc --project tsconfig.build.json --noEmit`, scoped ESLint, Prettier and Stylelint. For
browser checks start `yarn dev --port 3001`, then run
`yarn playwright test --config tests/video-studio/playwright.config.ts` (CI starts its own dev
server). The browser fixtures mock API responses explicitly; they use real verified font bytes.

Live acceptance runs through the production editor, normal ownership and quota checks. Do not seed
administrative render jobs into production or create another test project. Temporary check state
stays in ignored `.local-runtime/` files. Unit and fixture-based browser tests still run locally/in
CI against this same code without provisioning Cloudflare resources.

Release acceptance covers all five Quran font choices, IndoPak line variants, page transitions,
long-translation overflow rejection, audio boundaries within one frame, 720p/1080p and all ratios,
valid/invalid uploads, owner/account isolation, quota races, cancellation/retry/watchdog/expiry, and
the existing `/media` regression checks. Record actual render speed and billing when adjusting the
public budget. See `ACCEPTANCE.md` for the live production proof, the earlier font/format samples,
and remaining verification limits. Live account sign-in and another administrative long-render
benchmark were explicitly excluded by the user.

Remotion packages are pinned together at 4.0.538 with the user's approval to replace vulnerable
4.0.266. Chromium is installed by the matching renderer. The service dependency audit still reports
transitive Zod collection denial-of-service advisories in development/bundler dependencies; there is
no public Remotion Studio server, input JSON is bounded to 16 KiB and normalized scalar choices. Do
not apply npm's suggested downgrade to vulnerable Remotion versions or force a Zod major change.

## Scene version 2

Newly resolved projects use `studio-2`: the ayah and translation form a centered group, including
the translation template. Image backgrounds can include up to five version-pinned site images, with
frame-driven 1.2-second crossfades every 6–12 seconds and optional gentle zoom/pan. The browser and
renderer use the same scene and timeline. Every image is loaded before the preview becomes
exportable; Modal downloads the bounded sequence locally and renews its preparation lease between
images.

The renderer also accepts immutable `studio-1` jobs with their original text layout. The font/media
index schema remains `studio-1` (`ASSET_SCHEMA_VERSION`), independently of the scene version,
because the existing font assets and hashes have not changed.
