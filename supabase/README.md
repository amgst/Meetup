# Supabase setup

1. Open your Supabase project > SQL Editor, paste `setup.sql`, and run it.
2. Under Authentication > URL Configuration, set the local Site URL to `http://localhost:8000`. For deployment, use the deployed website URL and configure allowed redirects as needed.
3. Keep the Email provider enabled. Open the website, select Sign in > Create account, confirm the email if required, then sign in.
4. Create a meeting, reload, and confirm it remains. Sign in with a second account and confirm the first account's meetings are not listed.

Public connection settings are in `dist/supabase-config.js`. The app uses the browser Supabase SDK via jsDelivr; an internet connection is required. Never put secret/service-role keys into this file.

Meeting records are stored in Supabase and protected by owner-only row level security. Existing browser-local history is not automatically uploaded. Joining an invitation still opens the external Jitsi room, including for guests; database ownership policies do not control access to that video service. Video and participant limits require a separate integration.

No admin credentials are included, so the website cannot create its own database tables. Run the SQL before saving meetings. The live project connection has not yet been verified.
