# Staging acceptance record

Updated 2026-10-25 (Africa/Cairo). This is a staging record, not a public production release.

## Deployed scope

- Branch: `codex/video-studio`, repository `mo7medy/tilawa-quran`.
- Website: https://tilawa-video-studio-staging.muhammad5mdk.workers.dev/ar/video-studio
- Modal app: `mu7medy / main / tilawa-video-studio-staging`.
- Separate staging D1 database and asset, private-file and cache R2 buckets.
- Website deployment uses Cloudflare Builds; the restricted GitHub environment deploys Modal after
  validation. Production's Worker and deployment configuration are unchanged.
- Remotion and the matching Chromium are pinned at 4.0.538.

## Executed against real services

The public editor completed a real guest flow with the managed Turnstile widget: canonical preview,
project save, library reopen, PNG upload, remote decoder validation, translation selection, queued
render dispatch, completion and owner-authorized download. No API fixtures or administrative job
insertion were used for this flow.

The resulting MP4 has H.264 video, AAC audio, 1080 x 1920 dimensions and 30 fps. Source duration is
11,680 ms; the probed container duration is 11,712 ms (32 ms difference, within one frame). Output
size is 320,696 bytes. D1 confirms one attempt, actual dispatcher acceptance and completion:

| Measurement                            | Observed |
| -------------------------------------- | -------: |
| Queue to execution claim               |  8.158 s |
| Claim to rendering start               |  8.536 s |
| Rendering start to verified completion | 47.005 s |
| Total request to completion            | 63.699 s |

These are one short sample's wall times, including staging cold-start and network overhead. They are
not throughput guarantees. An authorized Modal billing readback for the UTC interval 2026-10-24
through 2026-10-25 attributed USD 0.04365049 to this app at read time: CPU 0.03390014, memory
0.00944489 and network egress 0.00030546. This is recorded aggregate test usage, subject to billing
reporting delay, not a per-video price or a final invoice. Costs of Cloudflare are separate.

Ten additional real Modal proof renders covered V1, V2, QPC Uthmani Hafs, IndoPak (15- and 16-line
choices across the samples) and Tajweed V4. Samples cover 720p and 1080p, portrait, square and
landscape. A V1 sample spans Al-Baqarah 2:5–6 and requires page fonts 2 and 3. All extended samples
were probed as H.264/AAC at 30 fps, with duration differences of 20–32 ms. This page-transition
proof does not claim that a single ayah spanning two pages was found and rendered.

The published index contains 1,827 source assets, including all expected page fonts and the six
existing background videos. Its SHA-256 version is
`14b0c84e7ea67f670f2e7371b99b9e670a74904a4faf8eb141d0adf54f89d7aa`. Actual decoder probes accepted
PNG and H.264 MP4 and rejected a forged PNG payload.

Public staging API checks also confirmed that a separate guest cannot read the saved project or job
or download its video (404), an untrusted request origin is rejected (403), unsigned internal
callbacks are rejected (403), and an invalid account session fails closed (401). After a valid
Turnstile-backed upload, replaying the actually consumed challenge on the same staging upload
endpoint was rejected with `CHALLENGE_FAILED` (403). Tokens were never logged or committed.

The existing `/media` page was checked on the full staging website after the Remotion upgrade: Quran
text and fonts loaded, background video decoded, preview playback controls worked, and no browser
error was observed. Its existing AWS/Lambda export service was not exercised or redeployed.

## Automated checks

- Full Vitest suite: 1,330 assertions in 171 files passed locally.
- Real SQLite concurrency/retention tests: six passed.
- R2 publisher integrity, redirect rejection and transient-error retry tests: three passed.
- Playwright: 16 studio cases cover Arabic/English, light/dark, 375/768/1024/1440 px, 200% zoom, all
  font choices, fixed font-byte verification, overflow prevention and library actions. These tests
  explicitly mock content/account APIs; they complement the real guest cycle above.
- Whole-project TypeScript and scoped ESLint passed. Changed files are formatted.

The SQLite/API tests also exercise owner isolation, explicit guest claim, atomic quota reservation,
duplicate requests, cancellation, stale attempts, retry/watchdog recovery, expiry and deletion
accounting. These are local integration proofs, not claims of every failure mode being injected into
live infrastructure.

## Acceptance scope and remaining public-release gates

- The user explicitly excluded the live registered-account sign-in test on 2026-10-25. The account
  allowance, isolation and explicit guest claim have automated coverage; do not represent them as
  having been exercised with a real signed-in account in this acceptance run.
- Profile a longer 180-second 1080p sample and observe billing at steady traffic before public
  launch.
- Review long/complex ayahs and translation layouts visually with Arabic content review.

Keep the public launch closed until these gates are resolved. The staging generation switch is
enabled only for acceptance testing; deployment configuration defaults to disabled. Private links
expire even before physical cleanup. Query strings are redacted in Worker observability. Never
commit local proof credentials, session cookies or signed URLs.
