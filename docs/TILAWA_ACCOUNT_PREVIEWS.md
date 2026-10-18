> The account pages now use the live Supabase backend by default. See
> [TILAWA_BACKEND.md](./TILAWA_BACKEND.md) for setup and deferred integrations. The scenarios below
> remain an isolated local design preview, never production authorization.

# Tilawa account interface previews

These pages implement the student and teacher account designs with explicitly illustrative data.
They do not authenticate users, submit bookings, send messages, upload files or transfer funds. All
changes live in the shared React preview provider until a full reload or Reset examples. Existing
academy and Quran navigation uses `/profile` as the common account entry point.

## Entry points

- Student: `/profile?preview=student`
- Teacher: `/dashboard/teacher?preview=teacher`
- Add `/ar` before any path for Arabic. Other site languages use English account copy.
- The preview banner switches roles without creating an authentication session or permission.

## Eight screen groups

| Group                                  | Paths                                                                                                                                                                                                                                                                                 |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Student profile and settings           | `/profile`                                                                                                                                                                                                                                                                            |
| Student learning, lessons and teachers | `/profile/learning`, `/profile/lessons`, `/profile/teachers`                                                                                                                                                                                                                          |
| Packages and renewal preview           | `/profile/packages`                                                                                                                                                                                                                                                                   |
| Private teaching profile               | `/profile/teacher`                                                                                                                                                                                                                                                                    |
| Teacher dashboard                      | `/dashboard/teacher`                                                                                                                                                                                                                                                                  |
| Teaching management                    | `/dashboard/teacher/requests`, `/dashboard/teacher/requests/request-intro`, `/dashboard/teacher/lessons`, `/dashboard/teacher/availability`, `/dashboard/teacher/students`, `/dashboard/teacher/students/preview-student`, `/dashboard/teacher/reviews`, `/dashboard/teacher/coupons` |
| Shared lesson details                  | `/lessons/lesson-next`, `/lessons/lesson-today`, `/lessons/lesson-completed`                                                                                                                                                                                                          |
| Earnings and withdrawal requests       | `/dashboard/teacher/earnings`, `/dashboard/teacher/withdrawals`                                                                                                                                                                                                                       |

Shared messages: `/profile/messages`. Append `?preview=teacher` to shared pages when inspecting the
teacher perspective. Teacher dashboard paths automatically select that perspective.

## Useful review flows

1. Accept `request-intro`; open the resulting lesson from either participant's lesson list.
2. Request completion of the finished `lesson-today` as the teacher; switch perspective, confirm as
   the student, then submit a review. The teacher's reviews page reflects it.
3. Request cancellation of a paid lesson; only the other participant can accept or decline it.
4. Reschedule a lesson; both lists reflect its UTC appointment in the selected time zone.
   Nonexistent and repeated daylight-saving local times and overlapping lessons are rejected.
5. Edit the private teaching profile, then use View public profile to inspect the existing public
   design with those changes. The normal public directory continues showing its original examples.
6. Change the dashboard's explicitly labelled approval scenario to inspect incomplete, pending,
   approved and rejected UI. Profile edits cannot grant approval.
7. Add overlapping weekly availability, duplicate coupons, or a withdrawal above the available
   example balance to inspect validation.
8. Add `view=loading`, `view=error`, or `view=empty` to inspect data states. Use an unknown record
   id to inspect missing-record handling. No external service needs to fail for these scenarios.

Academy packages continue using `academyPlans.ts`: 8/$80, 12/$100 and 16/$120, 45 minutes. The
latter two include one selectable complimentary recitation or memorization lesson. Teacher-owned
pricing is independent. No statistics charts or achievement counters are added.

## Deferred integration

- Independent website Supabase Auth, verified roles, teacher registration policy and approval.
- Durable profiles, private documents/photos, bookings, lessons, subscriptions and conversations.
- Server-side permissions, authoritative state transitions and realtime refresh.
- Meeting creation, email verification, password recovery and transactional notifications.
- Payment gateway, actual renewals, ledger settlement, refunds and withdrawal processing.

The React reducer is a preview simulator, not an authorization or accounting implementation.
Production data and credentials are never read by these new account components.

## Validation

Meaningful domain and integration tests cover role views, profile edits/reset, request idempotency,
completion/cancellation confirmation, duplicate reviews, package separation, timezone/DST
conversion, availability overlap, coupons, conversation continuity and withdrawal limits. A
bilingual route matrix exercises all sections. HTTP checks verify the actual Next routes and noindex
metadata. Existing academy and shared navigation tests remain part of the regression checks.

No dependencies were installed and no production build, Git push or deployment was performed.
