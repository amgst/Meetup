-- Additive upgrade of the original prototype. Apply once using SQL Editor or CLI.
begin;
create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 80),
  timezone text not null default 'UTC' check (char_length(timezone) between 1 and 100),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create or replace function public.create_user_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id,display_name)
  values(new.id,left(coalesce(new.raw_user_meta_data->>'display_name',''),80))
  on conflict(id) do nothing;
  return new;
end $$;
revoke all on function public.create_user_profile() from public;
drop trigger if exists wbify_create_profile on auth.users;
create trigger wbify_create_profile after insert on auth.users for each row execute function public.create_user_profile();
insert into public.profiles(id,display_name)
select id,left(coalesce(raw_user_meta_data->>'display_name',''),80) from auth.users on conflict(id) do nothing;

create table if not exists public.meetings (
  id text primary key check (id ~ '^wbify-preview-[a-z0-9-]{8,64}$'),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  starts_at timestamptz not null, scheduled boolean not null default false,
  notes text not null default '' check (char_length(notes) <= 180),
  created_at timestamptz not null default now()
);
alter table public.meetings add column if not exists updated_at timestamptz not null default now();
alter table public.meetings add column if not exists status text not null default 'active' check(status in ('active','cancelled','ended'));
alter table public.meetings add column if not exists locked boolean not null default false;
create index if not exists meetings_owner_created_idx on public.meetings(owner_id,created_at desc);
create index if not exists meetings_owner_starts_idx on public.meetings(owner_id,starts_at);

create table if not exists public.meeting_sessions (
  id uuid primary key default gen_random_uuid(), meeting_id text not null references public.meetings(id) on delete cascade,
  started_at timestamptz, ended_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(id,meeting_id), check(ended_at is null or started_at is not null and ended_at >= started_at)
);
create index if not exists sessions_meeting_idx on public.meeting_sessions(meeting_id);
create unique index if not exists sessions_one_open_idx on public.meeting_sessions(meeting_id) where ended_at is null;

create table if not exists public.meeting_invitations (
  id uuid primary key default gen_random_uuid(), meeting_id text not null references public.meetings(id) on delete cascade,
  token_hash text not null unique, expires_at timestamptz not null, revoked_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists invitations_meeting_idx on public.meeting_invitations(meeting_id);
create table if not exists public.meeting_participants (
  id uuid primary key default gen_random_uuid(), meeting_id text not null references public.meetings(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  identity text not null, display_name text not null check(char_length(display_name) between 1 and 80),
  role text not null default 'guest' check(role in ('host','member','guest')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(meeting_id,identity), unique(id,meeting_id)
);
create index if not exists participants_user_idx on public.meeting_participants(user_id);
create table if not exists public.meeting_admissions (
  id uuid primary key default gen_random_uuid(), meeting_id text not null references public.meetings(id) on delete cascade,
  session_id uuid not null, participant_id uuid not null,
  state text not null default 'waiting' check(state in ('waiting','reserved','connected','left','rejected')),
  reservation_expires_at timestamptz, disconnected_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(session_id,meeting_id) references public.meeting_sessions(id,meeting_id) on delete cascade,
  foreign key(participant_id,meeting_id) references public.meeting_participants(id,meeting_id) on delete cascade,
  unique(session_id,participant_id)
);
create index if not exists admissions_meeting_idx on public.meeting_admissions(meeting_id);
create index if not exists admissions_session_state_idx on public.meeting_admissions(session_id,state);
create index if not exists admissions_participant_idx on public.meeting_admissions(participant_id);
create table if not exists public.recordings (
  id uuid primary key default gen_random_uuid(), meeting_id text not null references public.meetings(id) on delete cascade,
  session_id uuid not null, storage_path text, status text not null default 'pending' check(status in ('pending','ready','failed')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(session_id,meeting_id) references public.meeting_sessions(id,meeting_id) on delete cascade
);
create index if not exists recordings_meeting_idx on public.recordings(meeting_id);
create index if not exists recordings_session_idx on public.recordings(session_id);
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null unique references auth.users(id) on delete cascade,
  provider_reference text unique, status text not null default 'inactive' check(status in ('inactive','active','cancelled')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

-- New tables start closed. Future media/billing writes are server-only.
do $$ declare tbl text; begin
  foreach tbl in array array['profiles','meetings','meeting_sessions','meeting_invitations','meeting_participants','meeting_admissions','recordings','subscriptions'] loop
    execute format('alter table public.%I enable row level security',tbl);
    execute format('revoke all on public.%I from anon, authenticated',tbl);
    execute format('grant all on public.%I to service_role',tbl);
    execute format('drop trigger if exists touch_updated on public.%I',tbl);
    execute format('create trigger touch_updated before update on public.%I for each row execute function public.touch_updated_at()',tbl);
  end loop;
end $$;
grant select on public.profiles, public.meetings to authenticated;
grant update(display_name,timezone) on public.profiles to authenticated;
grant insert(id,owner_id,title,starts_at,scheduled,notes) on public.meetings to authenticated;
drop policy if exists profiles_read_own on public.profiles;
create policy profiles_read_own on public.profiles for select to authenticated using((select auth.uid())=id);
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated using((select auth.uid())=id) with check((select auth.uid())=id);
drop policy if exists meetings_read_own on public.meetings;
create policy meetings_read_own on public.meetings for select to authenticated using((select auth.uid())=owner_id);
drop policy if exists meetings_create_own on public.meetings;
create policy meetings_create_own on public.meetings for insert to authenticated with check((select auth.uid())=owner_id);
grant select on public.meeting_sessions, public.meeting_participants, public.meeting_admissions, public.recordings, public.subscriptions to authenticated;
-- Do not expose invitation hashes to the browser, including the host.
do $$ declare tbl text; begin
  foreach tbl in array array['meeting_sessions','meeting_participants','meeting_admissions','recordings'] loop
    execute format('drop policy if exists host_read on public.%I',tbl);
    execute format('create policy host_read on public.%I for select to authenticated using(exists(select 1 from public.meetings m where m.id=meeting_id and m.owner_id=(select auth.uid())))',tbl);
  end loop;
end $$;
drop policy if exists subscriptions_read_own on public.subscriptions;
create policy subscriptions_read_own on public.subscriptions for select to authenticated using((select auth.uid())=user_id);

-- Narrow cancellation operation: no general UPDATE grant to change host/lock/state.
create or replace function public.cancel_own_meeting(meeting_id text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare changed integer;
begin
  update public.meetings set status='cancelled'
  where id=meeting_id and owner_id=(select auth.uid()) and scheduled and starts_at>now() and status='active';
  get diagnostics changed = row_count;
  return changed=1;
end $$;
revoke all on function public.cancel_own_meeting(text) from public,anon;
grant execute on function public.cancel_own_meeting(text) to authenticated;
commit;
