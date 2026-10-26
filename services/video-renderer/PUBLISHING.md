# Automatic TikTok publishing

The production Worker sends **new automatic runs only** through Buffer's GraphQL API. The minute
cron reconciles a D1 outbox; it does not need a running browser, MCP client, new Worker, container
or GPU. The model chooses content; it cannot choose credentials, provider endpoints or the
destination account.

## Setup

1. Apply `migrations/0004_publishing.sql` to the existing studio D1 database.
2. Connect TikTok in Buffer, select automatic publishing, and ensure the queue is running.
3. The configured, verified Tilawa owner opens `/video-studio/automation`, enters a Buffer API key,
   checks accounts, selects an eligible TikTok channel and saves the connection.
4. Enable automatic TikTok publishing separately. Only runs reserved after that activation are
   eligible; earlier library videos are excluded. Pausing cancels unsent queue items.

The site stores keys with AES-GCM and an owner-bound HKDF key derived from `STUDIO_SIGNING_SECRET`.
Rotating that secret requires reconnecting Buffer. Keys are never returned through the API or sent
to Workers AI or Modal.

For an operator-managed connection, the same production Worker may hold `STUDIO_BUFFER_TOKEN` as a
`secret_text` binding. A manually provisioned, owner-bound `studio_publisher` row then uses the
literal marker `worker-secret:v1`, never the token. The row must contain the verified Buffer
channel/organization, a fresh revision, and an activation cutoff. This route does not bootstrap or
silently re-enable a disconnected connection. Remove the optional Worker secret when retiring it;
disconnecting the site removes its configuration but cannot delete Worker bindings.

## Delivery and failure semantics

- A unique automation run ID prevents duplicate local queue entries; a D1 lease allows one sender.
  Requests use `mode: shareNow`, `schedulingType: automatic`, one video, and the fixed connected
  TikTok channel. Existing recordings and backgrounds are used; `aiAssisted` describes AI-assisted
  post preparation, not synthesized recitation.
- Only Buffer status `sent` means published. Drafts and approval requests need review.
- Buffer's create mutation has no documented idempotency key. A lost response, 5xx, malformed
  success or an expired send lease becomes `unknown`, **never an automatic resend**. Check Buffer
  manually before creating another post. Explicit HTTP 429 can retry with backoff, at most four send
  attempts. Read-only status polls use increasing backoff (one minute to four hours) and stop after
  24 hours with an uncertain outcome.
- Pausing/disconnecting cannot retract an in-flight or already accepted Buffer post. Pending posts
  keep their media access until expiry so disconnect does not break them.
- Buffer gets an unguessable, stable HTTPS `/api/video-studio/publication-media/<uuid>.mp4` URL for
  that output only. The bucket stays private. GET/HEAD and byte ranges stream from R2; there is no
  object-key passthrough. Source ownership, completion and expiry are checked on every read. Unsent
  queue items are inaccessible. Links expire no later than the existing seven-day output retention,
  or 24 hours after confirmed publication. Queueing requires at least 24 hours of source retention
  remaining.
- Outbox records are retained 30 days. Error logs contain categories only. Provider tokens, media
  URLs and raw provider errors must never be logged.

## Verification

`publishing.test.ts` uses real SQLite and mocked Buffer requests, including concurrent cron,
ownership isolation, encryption, ambiguous writes, explicit rate limiting, pause, draft status,
media expiry and ranges. `tests/video-studio/publishing.spec.ts` checks account selection, separate
enablement, mobile layout, AR/EN, pause and disconnect. These are not proof of a live TikTok post:
confirm one completed automatic run reaches Buffer `sent` and its TikTok link before claiming
end-to-end publication.

Official references: [Buffer API](https://developers.buffer.com/reference.html),
[authentication](https://developers.buffer.com/guides/authentication.html),
[media hosting](https://developers.buffer.com/guides/hosting-media.html).
