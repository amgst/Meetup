# WBIFY Meet architecture

## Current implementation

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
