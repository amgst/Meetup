# WBIFY Meet

A Next.js App Router, React, TypeScript and Tailwind application using Supabase Authentication and PostgreSQL. Phases 2 and 3 implement account flows, durable meeting management and expiring, revocable invitations. Phase 4 adds LiveKit integration; real media validation and Phase 5 admission/host controls remain pending.

## Local development

Use Node.js 20.9 or later.

```powershell
npm.cmd ci
Copy-Item .env.example .env.local
npm.cmd run dev
```

Open http://localhost:3000. Use `npm` instead of `npm.cmd` on other shells. If `.env.local` already exists, keep its values instead of copying over it. Set:

```env
APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-public-key
```

A legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` is also supported. `APP_URL` records the app origin (including port); use the real HTTPS deployment origin on Vercel. Authentication redirects and token same-origin checks use the current request origin so a stale localhost setting cannot send hosted users to a different site. Server secrets stay unprefixed and uncommitted. Phase 2 does not use a service-role key. `.env.local` is ignored by Git.

## Required Supabase setup

1. Apply `supabase/migrations/202611160001_phase2.sql` using Supabase SQL Editor, or use the Supabase CLI migration workflow if managing this project with the CLI. This migration upgrades the prototype's existing `public.meetings` table additively, preserving records and IDs. It also supports a fresh project and a safe retry. Do not rerun the old `supabase/setup.sql` after this upgrade: it is only for the static prototype.
2. Apply `supabase/migrations/202611160002_phase3.sql` after Phase 2. This adds owner-only editing, invitation management and anonymous capability validation. Existing meetings are retained.
3. Under Authentication > URL Configuration, set Site URL to `http://localhost:3000` and allow these exact redirect URLs:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/auth/callback?next=/reset-password`
   - `http://localhost:3000/auth/confirm`
   Use the same hostname consistently. Add matching HTTPS URLs for your deployed app later.
4. Keep the Email provider and Confirm email enabled. Configure SMTP for reliable production delivery. Supabase's email rate limits still apply to registration, resend, sign-in and recovery.
5. For email links that work across browsers/devices, use these link targets in the Supabase Email Templates:

   Confirm signup:
   `<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup">Confirm your email</a>`

   Reset password:
   `<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">Reset your password</a>`

   The app also accepts PKCE codes at `/auth/callback`; the default code flow requires the initiating browser's verifier cookie. The token-hash templates avoid that browser dependency. Never paste verification or recovery tokens into chat.
6. Create an account at `/register`, confirm the email, then sign in. Existing verified accounts from the prototype can sign in with their existing password. Their profiles are backfilled by the migration. Existing Next.js browser-local preview records are not automatically imported.

The app shows setup errors if the migration has not been applied. Public API credentials cannot install schema or change Supabase dashboard settings.

## Implemented behavior

- Registration, login/logout, email confirmation/resend and password recovery/update, with pending states and helpful errors.
- Server-confirmed identity checks in the session-refresh proxy, workspace layout and every server action. Unverified users cannot open the workspace. Client-supplied roles are never used for authorization.
- Editable profile display name and timezone, with server-side validation. Preferred timezone is stored; meeting times currently display in the device's timezone.
- Authenticated meeting creation, scheduling, list/history, invitations and narrow owner-only cancellation through a database function. Cancelled records are retained and available through the Cancelled filter in My meetings. All their invitations are revoked atomically. Upcoming/previous classification uses scheduled time, not actual video lifecycle.
- Responsive reusable UI, loading/retry states, native modal dialogs and account-isolated in-memory state. No localStorage meeting store remains in the new app.
- Version-controlled tables: profiles, meetings, meeting_participants, meeting_invitations, meeting_sessions, meeting_admissions, recordings, subscriptions. RLS and least-privilege grants protect all tables. Future media/billing writes are closed to browser roles; invitation hashes are not browser-readable.

## Phase 3 meeting management and invitations

- Edit titles/notes for active instant meetings. Future scheduled meetings can also be rescheduled; meetings that have already started cannot be rescheduled. Database functions recheck ownership, state and dates under a row lock.
- My meetings offers Active, Upcoming, Previous and Cancelled filters plus title search. Cancellation retains history and revokes all issued links in the same database transaction.
- Select Invite and choose a 1-, 7- or 30-day expiry, then create a link. Only the SHA-256 hash of its cryptographically random 256-bit secret is stored. The database validator hashes the supplied raw secret itself; knowing the stored hash alone does not grant access.
- Links use `/room/<id>#invite=<secret>`. The fragment stays out of the initial page request and referrer. The client submits it to the validation action; never send it to analytics or log request bodies. Room pages opt out of indexing and referrers.
- Copy a new link before closing its dialog. Its secret cannot be recovered later; issue a new one if needed. Existing links remain valid until expiry, revocation or meeting cancellation. A maximum of 20 active links is enforced per meeting under a row lock. The dialog shows recent link metadata and allows individual revocation.
- Anyone holding a valid link can view only the meeting title, scheduled time/type and invitation expiry. They cannot read private notes, profiles or meeting history. Revoked, expired, wrong-room, cancelled and locked invitations fail validation. Bare room codes are sufficient only for the owner, never guest access.
- A signed-in host can open their own room without an invitation. The room verifies ownership and meeting state instead of merely validating code syntax. Guests are rechecked on refresh/focus and at expiry. A future video token endpoint must revalidate the invitation and admission at the moment of joining; the invitation preview is not authorization to publish media or reserve a seat.

Participant waiting-room admission, host moderation/termination, atomic database capacity reservations, distributed application rate limiting, recordings and billing remain unimplemented. Guest invitation links are bearer capabilities; sharing a link intentionally shares access to its limited details. Production deployment should add abuse monitoring/rate limiting before open public traffic.

## Verification

```powershell
npm.cmd run test:db
npm.cmd run typecheck
npm.cmd run build
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

`test:db` runs the real migration in embedded PostgreSQL for both fresh and legacy-upgrade paths, testing triggers, backfill, cross-account RLS, anonymous denial, privileged-write denial and cancellation. Phase 3 tests additionally cover repeatable migrations, cross-account edit/issue/revoke denial, guest detail minimization, token/hash distinction, expiry, wrong-room tokens, link bounds, lock handling and cancellation invalidation. It does not apply anything to Supabase Cloud.

`test:e2e` builds a separate `.next-test` application with an isolated local Auth HTTP test double and embedded PostgreSQL. It never sends test users or passwords to the live project. Tests cover account UI flows, confirmation/recovery links, profile updates, sign-out, forged/anonymous sessions, account separation, creation/persistence, scheduling/cancellation, editing/rescheduling, guest link validation/revocation, cancelled history and mobile navigation. Mock Auth does not verify real email delivery or Supabase's production JWT, PKCE or refresh implementation. On restricted Windows environments the runner may require permission to start/stop its temporary server processes. If installing the browser to a custom path, set `PLAYWRIGHT_BROWSERS_PATH` to the same path when running tests.

For a production build, `npm.cmd run start` serves port 3000. Rebuild and restart after source or environment changes, or use `npm.cmd run dev` for live editing. No deployment is performed by these commands.

## Structure and next phases

- `app/(auth)`: account pages; `app/auth`: confirmation/code-exchange handlers.
- `app/(workspace)`: protected layout, pages and authorized server actions.
- `components/`: reusable dashboard, meeting, account and UI components.
- `lib/auth`, `lib/supabase`, `lib/livekit`: validation, session and integration boundaries.
- `types/database.ts`: application-used schema subset; regenerate full database types with Supabase CLI when access is available.
- `supabase/migrations/`: version-controlled production schema changes.
- `tests/database`, `tests/support`: PostgreSQL security tests and isolated Auth test service.

Phase 3 adds persistent meeting/invitation lifecycle. Phase 4 implements LiveKit React Components and server-issued tokens; configure and validate real media before launch. Phase 5 adds host controls, waiting room and atomic capacity enforcement. Phase 6 validates real multi-user/mobile calls and prepares Vercel deployment. Never claim that video or the 10-person cap works before those tests pass.

The original static Supabase/Jitsi prototype remains in `dist/`, runnable using `python -m http.server 8000 --bind 127.0.0.1 --directory dist`. Its database reads/inserts remain compatible with the migration, but its UI does not understand cancellation or the new production account flow. `.openai/hosting.json` still refers to this old static app; Vercel should deploy the Next.js project root later.

## Phase 4: LiveKit Cloud

Add your own values to ignored `.env.local` (never paste server secrets into chat):

```env
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
SUPABASE_SERVICE_ROLE_KEY=
```

The first three values enable media. The Supabase service-role key is used only for verified webhook persistence; it is not used to authorize participant token requests and is never bundled into the browser. Apply `supabase/migrations/202611160003_phase4.sql` after earlier migrations for webhook event/session tracking. Rebuild and restart the production server after configuring credentials. Without LiveKit configuration, room pages clearly show video setup is pending.

### Implemented integration

- A host or valid invitation can open device setup. Camera/microphone start off; users choose their name and devices before joining.
- Official LiveKit React Components provide the participant grid/focus layout, speaker indicators, microphone/camera controls, screen sharing, nonpersistent chat and a leave button. Additional UI shows participant names and connection state. Settings expose microphone, camera and speaker choices where the browser supports them. Camera capture targets 720p; actual quality depends on device, bandwidth and LiveKit adaptation.
- `POST /api/livekit/token` checks same-origin requests, validates input, confirms the owner session or invitation against PostgreSQL, rejects unavailable/locked meetings, and mints a five-minute room-scoped token. Browser tokens have no room-administrator grant. Host identity comes from the verified user; guests get a signed HttpOnly per-room identity cookie so rejoining from the same browser does not invent another identity.
- The endpoint creates/checks a LiveKit room with `maxParticipants=10`, rejects a full-room snapshot for a new identity, and embeds the same room configuration in tokens for automatic recreation. These are integration guards, not proof of race-safe admission. Phase 5 still needs atomic database reservations and full concurrency/reconnect tests; do not advertise the 10-person cap as verified yet.
- Tokens are held in component memory. The SDK handles connection/reconnection; a terminal disconnect returns to device setup and a new join requests fresh authorization. Existing issued tokens can remain valid until their five-minute expiry after invitation revocation. Phase 5 must address immediate removal/termination and token invalidation. Host controls now include presenter permissions and lowering raised hands; removal and full room moderation remain pending.
- LiveKit SDK 2.22.0 is pinned for compatibility with the installed Node runtime. Server and UI SDK versions are pinned in the lockfile.

### Verified webhooks

When hosted on public HTTPS, configure LiveKit Cloud to send webhooks to `https://YOUR_APP/api/webhooks/livekit`. It cannot send events to localhost; test webhook delivery after Vercel deployment or using an explicitly configured HTTPS development tunnel. Ensure the webhook's signing key matches `LIVEKIT_API_KEY`/`LIVEKIT_API_SECRET`.

The endpoint verifies the exact raw body and authorization signature with the official SDK before any database write. Room and participant lifecycle events are recorded through a service-role-only RPC. Event IDs deduplicate retries, meeting row locks serialize updates, timestamps prevent older participant events from overriding newer state, and closed sessions are not reopened by delayed joins. Missing persistence settings or database errors return 503 for provider retry; invalid signatures return 401. The event log stores event IDs/types/time, not raw media or chat.

### What tests establish

Local database tests cover event privileges, replay/idempotency and out-of-order lifecycle updates. Browser tests use an isolated LiveKit control-plane double; they verify token signatures/grants/TTL, owner/guest authorization, stable guest identity, a full-room response, cross-origin rejection, device setup and verified webhook ingestion. They do not transport WebRTC media. No fake credentials are used outside isolated tests, and no live cloud calls are made by that test suite.

Before launch, verify an actual host and guest call on separate devices: audio both ways, camera toggle, screen sharing, chat, speaker/device choice, reconnect and leaving. Then test 11 simultaneous participants, same-user reconnects and moderation in Phase 5. Localhost invitation links only work on the same machine; use the hosted HTTPS domain for other participants.

## Vercel redirect configuration

For the production deployment, set `APP_URL=https://meet.wbify.com` in Vercel environment settings and redeploy. The proxy now preserves the current request origin independently of APP_URL, including preview deployment domains. Same-origin video token checks follow the same rule. Arbitrary forwarded-host headers are not used to choose redirect targets.

In Supabase Authentication > URL Configuration, set Site URL to `https://meet.wbify.com` and add the exact deployed `/auth/callback`, `/auth/callback?next=/reset-password` and `/auth/confirm` redirect URLs. Email templates using SiteURL still depend on the Supabase setting and cannot be corrected by frontend code. Keep localhost URLs as additional allowed URLs only while local development is needed.

Authentication/video browser regression checks deliberately use a stale localhost APP_URL and assert that anonymous navigation stays on the current deployment origin.

## Meeting views and mobile stability

The in-call View selector offers Grid, Spotlight and Sidebar. Click a tile or choose Focus to select the main participant/screen manually. Grid shows every tile in a scrollable area; it does not auto-page or slide when speakers change. Spotlight and Sidebar retain the selected focus until it leaves. Mobile Sidebar uses a main tile with smaller tiles below it.

The conference uses stable identity/source keys and first-seen ordering, a single persistent LiveKit Room instance, and a small-viewport-height layout. Speaking updates affect tile indicators rather than participant ordering. Screen shares appear as additional tiles and can be focused manually. Chat overlays the stage without resizing the tile grid. Camera/microphone/share/chat/device/leave controls remain available.

`tests/layouts.spec.ts` uses SDK-simulated participants in a build-gated test route. It checks that speaker/track-list updates do not remove tile nodes, change order, reset mobile scrolling, or replace a manually chosen focus. Real-device media/OS/browser flicker still needs validation after deployment; these tests do not simulate a real mobile WebRTC call.


## Hands, reactions, presenters and transcription

Apply migration `202611160004_interactions.sql`. Participants can raise/lower their hands and send temporary emoji reactions. People & presenters lists raised hands in order; the host can lower hands and grant/revoke screen sharing. Guests initially have camera/microphone permission only. Presenter grants persist across rejoining with the same signed guest identity. The server validates the host account or invitation and derives identity from the session/cookie for every command; browser input cannot select its own role. Old issued presenter tokens may retain their grant until the five-minute expiry, so immediate revocation across all reconnect cases remains part of Phase 5.

The Transcript panel dispatches a separate LiveKit-hosted speech-to-text worker. Participants explicitly opt in before their microphone is subscribed. The host can stop transcription; each browser can download speaker-labelled text as TXT. Text is session-only, capped at 2,000 segments, and not replayed to late joiners. No audio recording or transcript database is added.

Set `TRANSCRIPTION_ENABLED=true` and `TRANSCRIPTION_AGENT_NAME=wbify-transcriber` in Vercel and redeploy this code. The cloud worker is deployed separately; see [worker setup and verification](agents/transcription/README.md). Desktop/mobile interaction tests, database permission tests and worker consent tests cover implementation behavior. A real meeting with spoken audio remains necessary to validate end-to-end transcription after deployment.
