# Student–teacher messaging — 2026-10-21

## Delivered interface

- `/profile/messages` now uses a dedicated two-pane inbox on desktop/tablet. Phones show the
  conversation list or the selected thread, with an explicit return button.
- The directory has avatars/real initials, names, available message previews, request/block labels,
  a selected state, and search scoped to the current directory page. Existing account pagination
  remains available. Missing identities use a neutral label rather than the owner's profile.
- The thread has a compact participant header, a teacher-profile link and a Radix options menu.
  Block/unblock is in that menu. Incoming requests retain explicit accept/decline controls.
- Messages have distinct incoming/outgoing surfaces, date separators and times in the saved account
  time zone. Loading older messages preserves the scroll position. New incoming messages do not pull
  a reader away from older history; a jump-to-latest control appears instead.
- The composer keeps drafts separately per conversation. Failed sends retain the draft, repeated
  in-flight sends are locked, and success clears only the relevant draft. Enter inserts a new line;
  Ctrl/Cmd+Enter deliberately submits. The existing 2,000-character limit is retained.
- The same visual components serve the live account and isolated preview, with Arabic/English,
  RTL/LTR and the current light/dark Tilawa tokens. No new packages, images or fonts were added.

## Integration and privacy

Existing message history, cursor pagination, Realtime subscriptions and account commands are reused.
No database migration, RLS change, new API endpoint, production request or deployment is required by
this redesign. Pending/rejected/blocked eligibility remains enforced in the existing backend.

The directory stays mounted during same-account conversation navigation. Cached directory reads and
drafts are never reused across account owners. Hidden tabs do not mark new messages read; an active
conversation is marked when the document becomes visible. The read behavior is not a peer-visible
read receipt. Presence, online status, typing indicators and per-conversation unread numbers are not
fabricated from incomplete history. Current header unread counts retain their existing source.

## Verification

- 65 focused Vitest cases passed across account pages, draft failures/retry, in-flight locking,
  conversation switching, incoming/outgoing requests, hidden-tab reads, opening/retry cancellation,
  StrictMode, owner isolation and history pagination.
- 48 local browser cases cover student/teacher roles, EN/AR, both themes, and widths 360, 390, 768,
  865, 1024 and 1440. Each exercises local send, older history, list search, accept, block and
  unblock.
- 72 additional browser cases cover empty inbox, failed history/send, pending and blocked threads,
  long unbroken text and 600 px landscape height. Workspace/field width, overflow and composer
  visibility are checked explicitly.
- Source TypeScript, scoped ESLint, Stylelint, formatting and Next page-entry checks are included in
  the final validation. No local production build or real-user end-to-end send was performed.

Browser checks use an ignored Vite harness with the actual account/message/header components and a
mocked account/message transport. They validate layout and local interactions, not production
delivery. While the helper is running:

- Student thread: `http://127.0.0.1:3113/?lang=ar&theme=dark&conversation=thread-1`
- Inbox: `http://127.0.0.1:3113/?lang=ar&theme=light`
- Teacher: add `&role=teacher`.
- Empty inbox: add `&empty=1` without a conversation.

Git push and publication remain separate release steps.
