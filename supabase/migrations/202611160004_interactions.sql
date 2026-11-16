begin;
create table if not exists public.meeting_presenters (
  meeting_id text not null references public.meetings(id) on delete cascade,
  identity text not null check(identity ~ '^(user|guest)-[a-f0-9-]{36}$'),
  granted_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(meeting_id,identity)
);
alter table public.meeting_presenters enable row level security;
revoke all on public.meeting_presenters from public,anon,authenticated;
grant all on public.meeting_presenters to service_role;
create or replace function public.set_meeting_presenter(p_meeting_id text,p_identity text,p_enabled boolean) returns boolean
language plpgsql security definer set search_path='' as $$
declare owner uuid;
begin
  select owner_id into owner from public.meetings where id=p_meeting_id and owner_id=(select auth.uid()) and status='active' for update;
  if not found or p_identity='user-'||owner::text then return false; end if;
  if p_enabled then
    insert into public.meeting_presenters(meeting_id,identity,granted_by) values(p_meeting_id,p_identity,owner) on conflict do nothing;
  else delete from public.meeting_presenters where meeting_id=p_meeting_id and identity=p_identity;
  end if;
  return true;
end $$;
-- A reconnect can recover its screen-share grant only with a current invitation.
create or replace function public.meeting_presenter_access(p_meeting_id text,p_identity text,p_token text) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.meeting_presenters p join public.meetings m on m.id=p.meeting_id
    where p.meeting_id=p_meeting_id and p.identity=p_identity and m.status='active' and not m.locked
    and (m.owner_id=(select auth.uid()) or exists(select 1 from public.validate_meeting_invitation(p_meeting_id,p_token))));
$$;
revoke all on function public.set_meeting_presenter(text,text,boolean) from public,anon;
grant execute on function public.set_meeting_presenter(text,text,boolean) to authenticated;
revoke all on function public.meeting_presenter_access(text,text,text) from public;
grant execute on function public.meeting_presenter_access(text,text,text) to anon,authenticated;
commit;
