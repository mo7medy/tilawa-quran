# Inactive conversation retention

## Behavior

After 60 days without a new stored message from either participant, the backend deletes all messages
in that conversation. Opening a conversation, marking it read, accepting a request or blocking a
participant does not extend this period. Old messages inside an active conversation remain until the
entire conversation becomes inactive.

The conversation ID, participants, request status and participant read/block states survive. An
accepted conversation can receive a new message after cleanup, starting another 60-day period.
Pending, rejected and blocked conversations retain their existing sending restrictions.

`tilawa-message-retention` runs every five minutes and processes at most 100 inactive conversations
per run. A backlog or a locked conversation is picked up on subsequent runs. The job is private;
anonymous and authenticated clients cannot invoke it or write the activity timestamp directly.

## Implementation

- `direct_conversations.last_message_at` is backfilled from existing messages and advanced by an
  insert trigger. Cleanup uses its partial index and locks the same conversation row as sending.
- Cleanup removes message bodies from both `direct_messages` and the duplicate command receipt
  payload. Receipt keys/results and a SHA-256 payload digest remain, so retrying an old request
  cannot recreate deleted messages; changed payloads still fail idempotency checks.
- Cleanup resets `last_message_at` to null. Its conversation UPDATE supplies a participant-scoped
  Realtime event, avoiding reliance on filtered message DELETE events. The history hook refetches
  all loaded pages so a selected conversation displays its empty history.
- The existing participant RLS policies, API history cursor and command checks stay in use.

The database migration is
`supabase/migrations/20261021125307_tilawa_inactive_conversation_retention.sql`. It also works with
the deployed schema preceding the pending student-account redesign migration. The history hook is
compatible with both the existing message screen and the separate staged messaging redesign.

## Activation status — 2026-10-21

The live website project was verified as `gsoelrejabrmzqypdchv` (`Tilawa web`). It had no
conversations or messages, participant RLS was enabled, and both message/conversation tables were
published for Realtime. After explicit user approval, the isolated deployment applied only this
retention migration. The live job is active every five minutes as `postgres`. A direct verification
returned zero deleted messages, confirmed participant RLS remains enabled, and confirmed neither
`anon` nor `authenticated` can execute cleanup.

## Verification

Run these without a production build:

```text
node scripts/supabase/verify-message-retention.mjs --deployed-schema
node scripts/supabase/verify-message-retention.mjs
node scripts/supabase/verify-backend-completion.mjs
node node_modules/vitest/vitest.mjs run src/components/Account/useConversationMessages.test.tsx src/components/Account/messages/LiveMessages.test.tsx src/components/Account/messages/useOpenConversation.test.tsx src/tilawa/backend/backend.test.ts
```

The isolated SQL checks use the existing PGlite verification runtime, or `PGLITE_MODULE` pointing to
its module. They cover the exact 60-day boundary, active history, empty inbox entries, receipt
redaction/retries, sending after cleanup, ACLs and bounded batches. They do not simulate concurrent
Postgres sessions or a live browser-to-browser send.
