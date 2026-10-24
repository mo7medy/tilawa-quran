# Tilawa video studio

The independent pages `/video-studio` and `/video-studio/library` use the site's content gateway,
fonts, account session and design system. Cloudflare handles identity, canonical content resolution,
D1 reservations and private R2 access. Modal runs the shared Remotion scene with CPU workers.

## Environments

`wrangler.video-studio.website.staging.jsonc` is the complete isolated website deployment.
`wrangler.video-studio.staging.jsonc` is an API-only integration harness; deploying it replaces the
website, so do not use it for a full website release. Production's `wrangler.jsonc` is unchanged.
`wrangler.website.example.jsonc` documents bindings for a separately provisioned environment.

The staging Cloudflare Builds trigger tracks only `codex/video-studio`. It builds the full source
checkout, creates a SHA-256 asset index, uploads all blobs before publishing its index, and deploys
the website. Never publish an index generated from an incomplete sparse checkout. D1 migrations are
additive and must be applied before deploying code using them.

Worker secrets: `QURAN_CLIENT_ID`, `QURAN_CLIENT_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `STUDIO_SIGNING_SECRET`, `STUDIO_MODAL_KEY`,
`STUDIO_MODAL_SECRET`, `STUDIO_MODAL_URL`, `STUDIO_TURNSTILE_SECRET`, `STUDIO_TURNSTILE_SITE_KEY`.
The four content/account settings are also required at website build time, because the existing
website content client and public account configuration use them. Store private settings as secret
build variables. Never send provider/account credentials to Modal.

Worker variables: `STUDIO_ORIGIN` (exact HTTPS website origin), `STUDIO_ENABLED` (`0` initially),
`QURAN_API_ENV`. Bind `VIDEO_STUDIO_DB`, `VIDEO_STUDIO_ASSETS`, `VIDEO_STUDIO_PRIVATE`, the existing
OpenNext cache and self-reference service. A minute cron reconciles dispatch, leases, expiry and
cleanup. Turnstile's managed widget must allow the exact hostname; verification requires the
`video-studio` action and a single-use token.

Modal secret: only `STUDIO_ORIGIN` and the matching `STUDIO_SIGNING_SECRET`. Set `STUDIO_MODAL_APP`
and `STUDIO_MODAL_SECRET_NAME` to the isolated environment names, then run
`modal deploy services/video-renderer/app.py` with Modal SDK 1.6.2. Its private dispatcher requires
a Modal proxy token; put that token only in the Worker secrets. Temporary job directories are
removed after execution. No GPU is needed. Default limits: 2 CPU, 4 GiB, 20 minutes, two containers.

The GitHub workflow validates the implementation and can deploy Modal from the protected
`video-studio-staging` environment when its Modal credentials are configured. Website deployment
uses Cloudflare Builds; this avoids two pipelines overwriting the same Worker.

## Policy and operations

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
Separate staging/production resources and secrets. Deployment success alone does not authorize
opening the public launch gate.

## Validation

Run `yarn test`, `python services/video-renderer/test_database.py`,
`yarn tsc --project tsconfig.build.json --noEmit`, scoped ESLint, Prettier and Stylelint. For
browser checks start `yarn dev --port 3001`, then run
`yarn playwright test --config tests/video-studio/playwright.config.ts` (CI starts its own dev
server). The browser fixtures mock API responses explicitly; they use real verified font bytes.

The staging proof utility targets only the isolated staging origin. It seeds administrative proof
jobs while public generation stays disabled, then exercises real Modal leases, rendering, R2 upload
and owner-authorized downloads. Proof state and secrets stay in ignored `.local-runtime/` files.
This does not replace the release acceptance cycle through the real editor and Turnstile.

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
