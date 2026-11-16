# WBIFY Meet — source code

This is the original source of the WBIFY Meet MVP preview. It is a **static HTML/CSS/JavaScript prototype**, not yet the Next.js/Supabase/LiveKit production app.

## Open in Visual Studio Code

1. Extract the ZIP archive.
2. Open the extracted `wbify-meet` folder in VS Code (`File > Open Folder`).
3. Open `dist/index.html` with the VS Code Live Server extension, or run `python -m http.server 8000 --directory dist` in the terminal and visit `http://localhost:8000`.

No `npm install` or environment variables are required for this prototype.

## Files

- `dist/index.html` — complete dashboard, styling and browser-side logic.
- `ARCHITECTURE.md` — proposed Supabase + LiveKit architecture, 10-participant enforcement and production roadmap.
- `.openai/hosting.json` — deployment metadata; not required for local development.

## Important limitations

- Room and schedule history is saved in your browser's `localStorage`, not shared between devices.
- Video rooms load a temporary external Jitsi iframe. The third-party service may require authentication or disallow embedding.
- There is no production authentication, no server-managed meeting store, and no enforced 10-person limit.
- Shared links only work on a deployed host accessible to invitees; `localhost` links work only on your computer.

## Suggested next iteration

Create a Next.js TypeScript project. Integrate Supabase Auth and Postgres first, then add LiveKit Cloud and server-generated participant tokens. Keep API secrets server-side and enforce meeting capacity in a transaction. See `ARCHITECTURE.md`.
