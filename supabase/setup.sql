-- Run once in your Supabase project's SQL Editor.
begin;
create table if not exists public.meetings (
  id text primary key check (id ~ '^wbify-preview-[a-z0-9-]{8,64}$'),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  starts_at timestamptz not null,
  scheduled boolean not null default false,
  notes text not null default '' check (char_length(notes) <= 180),
  created_at timestamptz not null default now()
);
create index if not exists meetings_owner_created_idx on public.meetings(owner_id,created_at desc);
alter table public.meetings enable row level security;
revoke all on public.meetings from anon, authenticated;
grant select, insert on public.meetings to authenticated;
drop policy if exists meetings_read_own on public.meetings;
create policy meetings_read_own on public.meetings for select to authenticated
  using ((select auth.uid()) = owner_id);
drop policy if exists meetings_create_own on public.meetings;
create policy meetings_create_own on public.meetings for insert to authenticated
  with check ((select auth.uid()) = owner_id);
commit;
