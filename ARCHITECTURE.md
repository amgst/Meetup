# WBIFY Meet — SaaS architecture

## MVP boundary

The deployed preview is a static, browser-local prototype. It supports creating and sharing room links, joining via links, scheduling locally, and a *temporary* third-party Jitsi meeting iframe. Meeting records are stored only in the creator's browser. It does **not** provide production authentication, durable shared scheduling, LiveKit, or an enforced 10-user room cap. Jitsi availability and host authentication depend on the external provider.

## Production architecture (10 participants per room)

- Frontend: Next.js, TypeScript, Tailwind; dashboard, meeting prejoin, room grid, host UI.
- API: Next.js server routes (or a separate Node service) for authentication, rooms, invitations, participants, recording metadata and billing.
- Identity: Auth.js with verified email login, session cookies, CSRF controls and role checks.
- PostgreSQL (Neon): `users`, `organizations`, `memberships`, `rooms`, `room_invites`, `room_sessions`, `room_participants`, `recordings`, `subscriptions`, `audit_events`.
- RTC: LiveKit Cloud initially; all token minting happens server-side; never expose API secret to browser. LiveKit connects users through its SFU and TURN services.
- Admission: issue short-lived room grants only after authentication/guest-invite validation. Enforce <=10 with an atomic admission reservation in PostgreSQL (unique room/session/participant, transactional lock) and reconcile with LiveKit webhooks. Do not rely on client count; reject 11th connection, including reconnect edge cases.
- Media: LiveKit participant state and WebRTC tracks. Data channel for chat; optional persistent chat to PostgreSQL.
- Recording (phase 2): LiveKit Egress -> private S3/R2 with signed download URLs, retention controls and recording consent.
- Scheduling: server-side timestamps in UTC, client-local display; email invites and reminders from a transactional provider.
- Security: rate limiting, room ID entropy, account/guest permissions, host roles, moderation, audit events, data retention, encrypted transport, webhook signature verification.
- Operations: error tracking, media quality metrics, structured logging, LiveKit concurrency and egress usage alerts, automated database backups.

## First production milestones

1. Bootstrap Next.js + PostgreSQL schema and migrations; add Auth.js.
2. Replace localStorage records with authenticated room CRUD and invitation routes.
3. Add LiveKit server API and signed short-lived access tokens; implement web meeting grid and controls.
4. Implement atomic 10-seat admission with reconnect handling and test with 11 concurrent clients.
5. Harden, monitor, test mobile/network interruptions and launch limited private pilot.

## Deployment separation

Vercel serves UI and REST APIs; Neon persists data; LiveKit Cloud transports video. Recordings should use private object storage. A self-hosted LiveKit instance can be evaluated later for cost/control, but needs a publicly accessible UDP/TCP media path and TURN/TLS.
