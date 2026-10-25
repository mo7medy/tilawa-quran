# Tilawa video studio

The independent pages `/video-studio` and `/video-studio/library` use the site's content gateway,
fonts, account session and design system. Cloudflare handles identity, canonical content resolution,
D1 reservations and private R2 access. Modal runs the shared Remotion scene with CPU workers.

## Production deployment

The studio runs inside the existing `tilawa-quran` Worker configured by `wrangler.jsonc`. Live
acceptance and subsequent live checks use this production website. Do not provision another staging
website or renderer. The former staging resources are retired only after production generation and
download have been verified.

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
`STUDIO_MODAL_SECRET`, `STUDIO_MODAL_URL`, `STUDIO_TURNSTILE_SECRET`. The four content/account
settings are also required at website build time, because the existing website content client and
public account configuration use them. Store private settings as secret build variables. Never send
provider/account credentials to Modal.

Worker variables: `STUDIO_ORIGIN` (exact HTTPS website origin), `STUDIO_ENABLED`,
`STUDIO_TURNSTILE_SITE_KEY` (public widget identifier), `QURAN_API_ENV`. Bind `VIDEO_STUDIO_DB`,
`VIDEO_STUDIO_ASSETS`, `VIDEO_STUDIO_PRIVATE`, the existing OpenNext cache and self-reference
service. A minute cron reconciles dispatch, leases, expiry and cleanup. Turnstile's managed widget
must allow the exact hostname; verification requires the `video-studio` action and a single-use
token.

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

Live acceptance runs through the production editor, real Turnstile, normal ownership and quota
checks. Do not seed administrative render jobs into production or create another test project.
Temporary check state stays in ignored `.local-runtime/` files. Unit and fixture-based browser tests
still run locally/in CI against this same code without provisioning Cloudflare resources.

Release acceptance requires all five Quran font choices, IndoPak line variants, page transitions,
long-translation overflow rejection, audio boundaries within one frame, 720p/1080p and all ratios,
valid/invalid uploads, real challenge verification and replay rejection, owner/account isolation,
quota races, cancellation/retry/watchdog/expiry, and the existing `/media` regression checks. Record
actual render speed and billing before choosing a public budget.

Remotion packages are pinned together at 4.0.538 with the user's approval to replace vulnerable
4.0.266. Chromium is installed by the matching renderer. The service dependency audit still reports
transitive Zod collection denial-of-service advisories in development/bundler dependencies; there is
no public Remotion Studio server, input JSON is bounded to 16 KiB and normalized scalar choices. Do
not apply npm's suggested downgrade to vulnerable Remotion versions or force a Zod major change.
