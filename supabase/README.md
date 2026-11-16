# Supabase database setup

For the Next.js app apply `migrations/202611160001_phase2.sql` in your existing project's SQL Editor. It is an additive upgrade: existing meetings stay intact, profiles are backfilled, and future users get a profile through a trigger. It can also initialize a fresh project.

Do not rerun `setup.sql` after applying the migration. That file describes the original static prototype and has older privilege grants.

The migration enables RLS on all eight application tables. Users can read their own profile/meetings, update their profile's display name/timezone and create their own meetings. General meeting updates and future media/billing writes are denied to browser roles. The narrow cancellation function checks owner, future scheduled time and current state. Future lifecycle/admission tables are foundations only; no video admission or capacity enforcement is implemented.

See the root README for email confirmation/recovery templates, local URL allowlists and testing instructions. `npm.cmd run test:db` validates migrations and RLS in isolated embedded PostgreSQL; it does not modify your live Supabase project. Applying the migration and confirming live email delivery remain manual steps without project administration access.
