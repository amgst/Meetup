# WBIFY Meet

WBIFY Meet is being migrated from a static prototype to Next.js App Router, React, TypeScript, and Tailwind CSS. Phase 1 is a working frontend foundation, not a production conferencing service.

## Run the new frontend

Requires Node.js 20.9 or later and npm. Dependencies are pinned; commit `package-lock.json` and use `npm ci` for repeatable installs.

```powershell
npm.cmd ci
Copy-Item .env.example .env.local
npm.cmd run dev
```

Open http://localhost:3000. On shells without PowerShell execution restrictions, `npm` works in place of `npm.cmd`. No credentials are required for the Phase 1 dashboard.

For production-build verification:

```powershell
npm.cmd run typecheck
npm.cmd run build
npm.cmd run start
```

After editing source while the production server is running, rebuild and restart it, or use `npm.cmd run dev` for live updates.

## Implemented in Phase 1

- Reusable responsive workspace shell, dashboard hero, action cards, meeting lists, accessible native dialogs, loading and error states.
- Instant meeting links, scheduling with future-date validation, notes, upcoming/recent views, cancellation, invitation copying and parsing.
- Preview data persists in this browser under a separate storage key; it is not uploaded or shared with other devices. A scheduled meeting becomes previous when its scheduled time passes, not when a video session ends.
- `/room/[roomId]` validates the room-code format and displays an explicit video placeholder. It does not verify meeting existence or connect media.
- Supabase browser and cookie-based server client factories; server-only LiveKit room-service and verified-webhook receiver factories, with configuration validation. These are preparation modules, not exposed API endpoints.

## Environment configuration

Copy `.env.example` to ignored `.env.local`. Add your Supabase project URL and publishable key (or legacy anon key) when Phase 2 is enabled. `NEXT_PUBLIC_*` variables are browser-visible. Keep `SUPABASE_SERVICE_ROLE_KEY`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` server-only. Set `LIVEKIT_URL` to the project's `wss://` URL when adding video. Do not commit `.env.local` or real server secrets.

The app does not require or use administrative credentials during Phase 1. No LiveKit token endpoint exists yet. Before exposing one, implement identity and invitation validation, server-side host authorization, rate limiting, and transactional admission. Never grant access from client-supplied roles.

## Preserved prototype

The original Supabase/Jitsi prototype remains in `dist/` and can run independently:

```powershell
python -m http.server 8000 --bind 127.0.0.1 --directory dist
```

Open http://localhost:8000. Its prior public connection settings and `supabase/setup.sql` remain unchanged. The old SQL only supports that prototype; it is not the production schema. The Next.js frontend does not consume its account sessions or meeting storage. Jitsi is retained only in this prototype.

## Structure

- `app/`: App Router pages, workspace layout, room placeholder, error/loading views.
- `components/dashboard/`, `components/meetings/`, `components/ui/`: reusable React components.
- `lib/supabase/`: public config and browser/server factories.
- `lib/livekit/`: server-only integration factories.
- `lib/meetings/`: Zod validation and invitation parsing.
- `types/`: shared meeting types.
- `tests/`: browser regression checks for preview workflows.
- `supabase/`: preserved prototype schema; production migrations arrive in Phase 2.

## Phased implementation

1. **Frontend foundation:** this implementation.
2. **Identity and database:** registration/login/logout, email verification, password recovery, profiles, session-refresh proxy and protected dashboard routes. Version-controlled migrations for profiles, meetings, participants, invitations, sessions, admissions, recordings and subscriptions; owner/guest RLS policies and indexes. Plan a deliberate migration of the existing `meetings` table before applying production changes.
3. **Persistent meeting management:** authenticated creation, scheduling, signed invitations, cancellation, and account-owned history.
4. **LiveKit media:** official React Components, secure token route, devices, grid, screen sharing, chat and reconnection; verified webhooks.
5. **Host controls and admission:** waiting room, reject/remove/mute, lock/end, distributed rate limiting, and atomic 10-seat reservations with reconnect/disconnect reconciliation.
6. **Launch validation:** real desktop/mobile multi-user calls, parallel joins beyond capacity, permission tests, webhook replay/reordering, reconnect tests, monitoring and Vercel staging deployment.

Authentication, production persistence, live video, host permissions, and the 10-person limit are not implemented or verified in this new frontend. Do not use it for confidential or production meetings yet.

## Browser checks

```powershell
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

Tests start a separate production server on port 3100, so run `npm.cmd run build` first. They cover creation, reload persistence, scheduling/cancellation, invitation parsing, invalid room paths and mobile navigation. Build/type checks do not verify real video, database permissions, or concurrency.

## Deployment target

Deploy the new Next.js application to Vercel in Phase 6 with this directory as the root, the standard Next.js framework preset and environment values in Vercel settings. Preview deployments should be access-restricted until authentication is implemented. `.openai/hosting.json` still describes the old static prototype and is not the Next.js deployment configuration. Nothing has been deployed by this migration.

# Meetup
