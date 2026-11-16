# WBIFY Meet architecture

## Phase 4 integration

The server token route validates the current owner session or guest invitation and meeting state, then creates/checks a capped LiveKit room and signs a short-lived non-admin grant. A signed per-room guest cookie preserves identity on reconnect. The token also carries matching room creation settings, avoiding an uncapped auto-created room if it expires between creation and join. A participant snapshot provides a friendly full-room response, not an atomic admission reservation.

The client loads official LiveKit components after authorization, offers camera/mic-off device setup and connects only after user submission. SDK components handle the grid, focused screen share, chat, controls, audio playback and reconnect status. Host management and the database admission transaction remain Phase 5.

Verified webhook events are persisted through a service-role-only RPC with deduplication and lifecycle timestamps. Browser roles cannot access the event table or RPC. The service-role key is read only by the webhook route. No raw webhook payload, chat or media is stored. Provider delivery requires public HTTPS and separate configuration.

Tests cover authorization/control-plane behavior with doubles and lifecycle SQL in embedded PostgreSQL. Real WebRTC calls, reconnect behavior, immediate revocation and the 10-participant limit are unverified until real cloud configuration and multi-user testing.

## Phase 3 implementation

Owner-only RPCs manage meeting edits and invitation creation/revocation. A random 256-bit secret is returned to the host only once and stored as a SHA-256 hash. The guest validation RPC takes the raw secret and computes the hash within PostgreSQL. Anonymous roles can execute only that narrow lookup and cannot read invitation tables or host-only RPCs.

Invitation links keep the raw token in the URL fragment. The room page sends no private details until an owner session or valid capability is confirmed. Public guest results contain title, schedule and expiry only. Room metadata disables indexing and referrers. UI checks are informational; Phase 4 must recheck the same capability before token minting.

Invitation creation, cancellation and revocation lock the meeting row. Cancellation updates state and revokes existing invitations atomically. Concurrent edits and issuance check latest locked state in the database. Link expiry/lock/status are checked on every validation; no service-role key is needed. The per-meeting limit of 20 active links is not a general rate limiter or participant limit.

My meetings retains cancelled records, supports filters/search and edits future schedules. Dates are UTC in PostgreSQL and device-local in the UI. Actual meeting-session lifecycle remains a later video phase.

## Phase 2 implementation

Supabase cookie sessions now protect dashboard, meetings and settings through both the Next.js proxy and server-side layout/actions. `getUser()` validates current identity and email confirmation; client metadata is used only for display. The proxy forwards refresh cookies and private cache headers. Callback routes verify OTP hashes or exchange PKCE codes and use allowlisted local destinations; `APP_URL` supplies the trusted origin for proxy redirects.

Profiles are created through a database trigger and backfilled for existing accounts. Server actions validate profile updates and meeting input with Zod. MeetingProvider now loads from authenticated server actions and updates state only after a database success. Cancellation uses a narrow owner-checked database function instead of a broad update grant.

The additive Phase 2 migration provisions all eight requested tables with keys, constraints, indexes, timestamp triggers and RLS. Existing meeting IDs/data remain compatible. Browser roles cannot write admission, participant, recording or billing state, or read invitation hashes. No service-role credential is used by this phase. The lifecycle tables are foundations, not functioning admission enforcement.

Local PostgreSQL tests cover fresh/legacy migrations and permissions. Browser tests use an isolated Auth double plus real SQL migration; live Supabase email delivery and dashboard configuration are separate verification steps. The prototype remains in dist/. New account-owned meetings share its existing table, but the static UI does not understand cancellation.

## Phase 1 foundation (historical)

Phase 1 replaces the frontend structure with Next.js App Router, React, TypeScript, and Tailwind. The original design is retained through extracted CSS and reusable React components. The existing `dist/` prototype remains independent and unchanged by this migration.

The root redirects to `/dashboard`. A shared workspace layout contains `/dashboard`, `/meetings`, `/meetings/schedule`, and `/settings`. Browser-local meeting state lives behind `MeetingProvider`; it will be replaced with authenticated server/database access. `/room/[roomId]` is a dark placeholder with room-format validation, not a live meeting. Dashboard routes intentionally remain public in this first frontend phase.

## Target production boundaries

- Next.js on Vercel renders the UI and handles authorized server mutations and token APIs.
- Supabase Auth manages identities, verified sessions and account recovery. Protected routes must validate the session server-side, with a Next.js proxy refreshing cookies. Browser sessions from the original static prototype are not automatically SSR cookies.
- Supabase PostgreSQL stores profiles, meetings, participants, invitations, sessions and admissions. RLS limits user access. Administrative server clients must still explicitly verify host ownership before mutations.
- LiveKit Cloud transports media; official LiveKit React Components supply the meeting interface. Secrets and token generation stay server-side. The Phase 1 server module offers only room-service and webhook-receiver factories.
- Supabase Realtime may deliver waiting-room/admission changes once RLS and host permissions are defined. No additional state library is needed yet.

## Admission and lifecycle design for Phase 5

Use transactional PostgreSQL admission reservations scoped to the current meeting session. Lock the session row, reconcile valid reservations, and atomically reject reservation 11. Keep participant identity stable across reconnects; renew reservations rather than consuming another seat. Mint short-lived LiveKit grants only after a successful reservation and server-side identity/invitation checks. Configure LiveKit's room capacity as an additional guard, not the only source of admission truth.

Reservations, token validity, disconnect grace periods and reconciliation must be designed together so an expired reservation cannot admit another user while a previous token or active participant still occupies that seat. Verified idempotent webhooks update connected/disconnected state; scheduled reconciliation handles missing, duplicate and reordered events. Host removal must revoke re-entry server-side; ending must close the DB session and the LiveKit room. Test simultaneous joins and reconnects before claiming capacity enforcement.

## Migration and rollout

1. Finish the frontend foundation and verify its local browser workflows.
2. Add Supabase SSR auth, protected routes, profile UI and production SQL migrations with indexes, timestamps, constraints and RLS tests. Reconcile the prototype's existing `public.meetings` schema explicitly before changing it.
3. Replace local meeting state with durable authenticated operations and securely validated invitations.
4. Add LiveKit video and verified lifecycle webhooks.
5. Implement and stress-test waiting room, host actions, admission enforcement and rate limiting.
6. Validate multi-user video, mobile devices, reconnect behavior and Vercel staging before launch.

Recording, subscriptions, transcription, calendars and workspaces remain future extensions. Their database foundations can be added in Phase 2 without enabling paid or recording behavior.
