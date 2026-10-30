# Multi-account publishing operations

The existing production Worker, D1, R2, Modal renderer and minute Cron are reused. Manage
connections, destinations, daily counts and distribution at `/ar/1x2003/admin/video-studio` (or
`/en/1x2003/admin/video-studio`). Existing administrator membership and a verified MFA session are
required on every API request. The automation owner remains the existing account; administrators are
recorded separately in audit events.

## Limits and schedule

- Up to three distinct Buffer account identities and nine active TikTok/Instagram channels.
- New channels start paused at zero. Counts 1–3 and distribution changes apply tomorrow in
  `Africa/Cairo`; zero/disconnect cancels unsent work immediately. Accepted Buffer posts remain
  tracked.
- Immutable day snapshots assign slots 09:00, 14:00 and 19:00 Cairo. Independent content is the
  default; shared mode creates one render per slot with separate destination results.
- Each destination has a five-hour send interval. Work not submitted by midnight closes without
  backfill.
- Automation: 30 renders/day, 10 GiB, 60 model requests/UTC day; manual quotas remain independent.
  Both classes share the 60-minute global daily render cap and one active render per owner.
- Background selection is random and excludes each target's preceding opening image when
  alternatives exist.
- Only source-verified contiguous whole-ayah recordings of 30–70 seconds are offered to the model.
- The existing minute trigger rotates automation, publishing and maintenance, each once per three
  minutes. Each pass advances one durable phase; maintenance processes at most eight records of each
  cleanup type. This bounds Free-plan invocation work while preserving the configured publishing
  windows.

Buffer determines actual available channels and publishing eligibility. Site limits do not expand a
Buffer subscription. API credentials are encrypted using the existing server signing secret and
never returned to clients. Rotate a credential on its existing connection; the verified Buffer
account identity must match. Disconnect destinations and reconnect them through the explicit channel
picker to preserve historical identities. A credential update alone does not reactivate disconnected
destinations.

## Automatic content preferences

The automatic picker offers adult Muhammad Siddiq al-Minshawi whenever that source recording is
available, alongside rotating established reciters from Tilawa's existing catalogue (including
AbdulBaset, Mishari al-Afasy, Yasser ad-Dussary and al-Husary). Abdur-Rahman as-Sudais is excluded
at candidate selection and decision validation. A previously prepared excluded-reader selection is
stopped before reserving another render. The manual studio catalogue is independent of this policy.

Featured ayah anchors are editorial preferences, not live TikTok/Instagram trend measurements. They
include An-Najm 53:39–41 from the
[user's reference video](https://www.tiktok.com/@abo.3aid/video/7671728791101689096). Up to two
featured surahs and one rotating source surah are offered per selection pass. Candidate recordings
still require complete consecutive ayah timings and 30–70 seconds; short anchors can be extended
with following whole ayahs. Three-day overlap exclusion and random background selection remain
enforced. Model instructions prohibit inventing current trend rankings or view counts.

## Production cutover

1. Run the automated checks and deploy the compatible code through production CI. Confirm 100% of
   the Worker deployment uses that revision before applying the additive D1 migration.
2. Capture a D1 Time Travel bookmark, then run the project-local Wrangler command against the
   existing database:
   `wrangler d1 migrations apply tilawa-video-studio --remote --config wrangler.jsonc`. Migration
   `0006_multi_publishing.sql` defaults to inactive. Legacy queues still run until the explicit
   gate.
3. Record non-secret legacy counts/statuses and confirm no sending or planning lease is active. Set
   `studio_multi_control.maintenance=1` with `active=0` and an empty `cutover_day`. The next
   automation Cron lane performs the migration. Do not copy tokens through an operator machine.
4. The Worker probes Buffer account/channel data read-only, decrypts/re-encrypts credentials
   internally, deduplicates Buffer identities and commits copied connections, destinations, tasks
   and deliveries atomically. Publication IDs, Buffer post IDs, external links and media paths
   remain unchanged. Expired sending leases become `unknown`; accepted pending posts remain pending.
   Current-day distribution stays shared, with existing counts retained; independent distribution
   begins the following Cairo day.
5. Confirm `active=1`, `maintenance=0`, a nonempty `cutover_day`, and `migration_error IS NULL`.
   Compare old/new publication IDs, statuses, post IDs and URLs through equality/count queries
   without displaying credentials or private media URLs. Confirm old automation jobs have the
   automation quota class.
6. Verify guest API denial, protected admin navigation, studio/catalog and `/media` regression
   behavior. Follow the next ordinary scheduled cycle. Do not create extra test posts or grant
   administrator access.

The migration waits for active legacy leases and retries at most three times with 15-minute backoff.
An error leaves maintenance enabled and stores only a sanitized error code. Investigate before
resetting `migration_attempt`/`migration_until`; no partially copied rows are committed on a
transactional failure. The current-day task snapshot fills only remaining slots; missed slots are
explicitly marked skipped.

## Failure handling and rollback

- Buffer 429 cooldown and request accounting are scoped to a connection; channel metadata is cached
  five minutes per credential revision. Other connections continue independently.
- The outbox fixes connection, platform, channel and caption at creation and deduplicates
  `(run_id,destination_id)`.
- `unknown` means Buffer may have accepted a create. Review it in Buffer; never automatically
  resubmit it. Published/accepted records are not rerouted by subsequent destination or credential
  edits.
- To stop new work immediately, disable automation from the admin page or the owner's emergency
  stop.
- To pause a cutover for code rollback, set control `maintenance=1,active=0` while retaining
  `cutover_day`. Deploy only a version that understands this fence. Do not deploy a pre-fence legacy
  worker after cutover, clear `cutover_day`, or run the old outbox on new tasks. Preserve accepted
  records for reconciliation.
- Resume the multi-account engine by clearing maintenance and setting active=1 after checks. Never
  drop the new tables as a rollback. Time Travel restore is an operator recovery step that requires
  considering all concurrent user writes, not a routine publishing rollback.

MP4s remain private seven days and projects thirty days; published media capability URLs are
shortened to one day. History is retained thirty days and admin audit ninety days. No credential or
signed media URL belongs in logs.
