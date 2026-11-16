# WBIFY Meet

A Next.js App Router, React, TypeScript and Tailwind application using Supabase Authentication and PostgreSQL. Phase 2 implements account flows and durable account-owned meetings. LiveKit video and admission/host controls remain later phases.

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

A legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` is also supported. `APP_URL` must be the exact trusted app origin (including port); use the real HTTPS deployment origin on Vercel. Server secrets stay unprefixed and uncommitted. Phase 2 does not use a service-role key. `.env.local` is ignored by Git.

## Required Supabase setup

1. Apply `supabase/migrations/202611160001_phase2.sql` using Supabase SQL Editor, or use the Supabase CLI migration workflow if managing this project with the CLI. This migration upgrades the prototype's existing `public.meetings` table additively, preserving records and IDs. It also supports a fresh project and a safe retry. Do not rerun the old `supabase/setup.sql` after this upgrade: it is only for the static prototype.
2. Under Authentication > URL Configuration, set Site URL to `http://localhost:3000` and allow these exact redirect URLs:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/auth/callback?next=/reset-password`
   - `http://localhost:3000/auth/confirm`
   Use the same hostname consistently. Add matching HTTPS URLs for your deployed app later.
3. Keep the Email provider and Confirm email enabled. Configure SMTP for reliable production delivery. Supabase's email rate limits still apply to registration, resend, sign-in and recovery.
4. For email links that work across browsers/devices, use these link targets in the Supabase Email Templates:

   Confirm signup:
   `<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup">Confirm your email</a>`

   Reset password:
   `<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">Reset your password</a>`

   The app also accepts PKCE codes at `/auth/callback`; the default code flow requires the initiating browser's verifier cookie. The token-hash templates avoid that browser dependency. Never paste verification or recovery tokens into chat.
5. Create an account at `/register`, confirm the email, then sign in. Existing verified accounts from the prototype can sign in with their existing password. Their profiles are backfilled by the migration. Existing Next.js browser-local preview records are not automatically imported.

The app shows setup errors if the migration has not been applied. Public API credentials cannot install schema or change Supabase dashboard settings.

## Implemented behavior

- Registration, login/logout, email confirmation/resend and password recovery/update, with pending states and helpful errors.
- Server-confirmed identity checks in the session-refresh proxy, workspace layout and every server action. Unverified users cannot open the workspace. Client-supplied roles are never used for authorization.
- Editable profile display name and timezone, with server-side validation. Preferred timezone is stored; meeting times currently display in the device's timezone.
- Authenticated meeting creation, scheduling, list/history, invitations and narrow owner-only cancellation through a database function. Cancelled records are retained but hidden from the active list. Upcoming/previous classification uses scheduled time, not actual video lifecycle.
- Responsive reusable UI, loading/retry states, native modal dialogs and account-isolated in-memory state. No localStorage meeting store remains in the new app.
- Version-controlled tables: profiles, meetings, meeting_participants, meeting_invitations, meeting_sessions, meeting_admissions, recordings, subscriptions. RLS and least-privilege grants protect all tables. Future media/billing writes are closed to browser roles; invitation hashes are not browser-readable.

`/room/[roomId]` remains a clearly labelled placeholder. It checks room-code syntax, not meeting existence or guest admission. Invitation access, video, host controls, capacity enforcement, distributed application rate limiting, recordings and billing are not implemented yet.

## Verification

```powershell
npm.cmd run test:db
npm.cmd run typecheck
npm.cmd run build
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

`test:db` runs the real migration in embedded PostgreSQL for both fresh and legacy-upgrade paths, testing triggers, backfill, cross-account RLS, anonymous denial, privileged-write denial and cancellation. It does not apply anything to Supabase Cloud.

`test:e2e` builds a separate `.next-test` application with an isolated local Auth HTTP test double and embedded PostgreSQL. It never sends test users or passwords to the live project. Tests cover account UI flows, confirmation/recovery links, profile updates, sign-out, forged/anonymous sessions, account separation, creation/persistence, scheduling/cancellation, and mobile navigation. Mock Auth does not verify real email delivery or Supabase's production JWT, PKCE or refresh implementation. On restricted Windows environments the runner may require permission to start/stop its temporary server processes. If installing the browser to a custom path, set `PLAYWRIGHT_BROWSERS_PATH` to the same path when running tests.

For a production build, `npm.cmd run start` serves port 3000. Rebuild and restart after source or environment changes, or use `npm.cmd run dev` for live editing. No deployment is performed by these commands.

## Structure and next phases

- `app/(auth)`: account pages; `app/auth`: confirmation/code-exchange handlers.
- `app/(workspace)`: protected layout, pages and authorized server actions.
- `components/`: reusable dashboard, meeting, account and UI components.
- `lib/auth`, `lib/supabase`, `lib/livekit`: validation, session and integration boundaries.
- `types/database.ts`: application-used schema subset; regenerate full database types with Supabase CLI when access is available.
- `supabase/migrations/`: version-controlled production schema changes.
- `tests/database`, `tests/support`: PostgreSQL security tests and isolated Auth test service.

Phase 3 hardens persistent meeting/invitation lifecycle. Phase 4 integrates LiveKit React Components and server-issued tokens. Phase 5 adds host controls, waiting room and atomic capacity enforcement. Phase 6 validates real multi-user/mobile calls and prepares Vercel deployment. Never claim that video or the 10-person cap works before those tests pass.

The original static Supabase/Jitsi prototype remains in `dist/`, runnable using `python -m http.server 8000 --bind 127.0.0.1 --directory dist`. Its database reads/inserts remain compatible with the migration, but its UI does not understand cancellation or the new production account flow. `.openai/hosting.json` still refers to this old static app; Vercel should deploy the Next.js project root later.
