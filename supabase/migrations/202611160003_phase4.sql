begin;
alter table public.meeting_sessions add column if not exists livekit_sid text unique;
alter table public.meeting_admissions add column if not exists last_event_at timestamptz;
create table if not exists public.livekit_events (
  id text primary key, event text not null, meeting_id text not null references public.meetings(id) on delete cascade,
  provider_time timestamptz not null, created_at timestamptz not null default now()
);
create index if not exists livekit_events_meeting_idx on public.livekit_events(meeting_id,created_at);
alter table public.livekit_events enable row level security;
revoke all on public.livekit_events from public,anon,authenticated;
grant all on public.livekit_events to service_role;
create or replace function public.record_livekit_event(p_id text,p_kind text,p_room_id text,p_room_sid text,p_identity text,p_name text,p_when timestamptz)
returns boolean language plpgsql security definer set search_path='' as $$
declare sid uuid; pid uuid; inserted integer; closed timestamptz; owner uuid;
begin
  if p_kind not in ('room_started','room_finished','participant_joined','participant_left') then return false; end if;
  -- Serialize lifecycle processing for a meeting, including duplicate webhooks.
  select owner_id into owner from public.meetings where id=p_room_id for update;
  if not found then return false; end if;
  insert into public.livekit_events(id,event,meeting_id,provider_time) values(p_id,p_kind,p_room_id,p_when) on conflict(id) do nothing;
  get diagnostics inserted=row_count; if inserted=0 then return false; end if;
  select id,ended_at into sid,closed from public.meeting_sessions where livekit_sid=p_room_sid;
  if sid is null then
    -- A delayed event from an older room must not close a newer open session.
    if exists(select 1 from public.meeting_sessions where meeting_id=p_room_id and ended_at is null and started_at>p_when) then return false; end if;
    update public.meeting_admissions set state='left',disconnected_at=p_when,last_event_at=p_when
      where session_id in(select id from public.meeting_sessions where meeting_id=p_room_id and ended_at is null);
    update public.meeting_sessions set ended_at=greatest(started_at,p_when) where meeting_id=p_room_id and ended_at is null;
    insert into public.meeting_sessions(meeting_id,livekit_sid,started_at,ended_at)
    values(p_room_id,p_room_sid,p_when,case when p_kind='room_finished' then p_when else null end) returning id,ended_at into sid,closed;
  end if;
  if p_kind='room_started' then
    update public.meeting_sessions set started_at=least(started_at,p_when) where id=sid;
  elsif p_kind='room_finished' then
    update public.meeting_sessions set ended_at=greatest(started_at,ended_at,p_when) where id=sid;
    update public.meeting_admissions set state='left',disconnected_at=p_when,last_event_at=p_when where session_id=sid and (last_event_at is null or last_event_at<=p_when);
  elsif closed is null and p_identity is not null then
    insert into public.meeting_participants(meeting_id,identity,display_name,role,user_id)
    values(p_room_id,p_identity,left(coalesce(nullif(p_name,''),'Guest'),80),case when p_identity='user-'||owner::text then 'host' else 'guest' end,case when p_identity='user-'||owner::text then owner else null end)
    on conflict(meeting_id,identity) do update set display_name=excluded.display_name returning id into pid;
    insert into public.meeting_admissions(meeting_id,session_id,participant_id,state,last_event_at,disconnected_at)
    values(p_room_id,sid,pid,case when p_kind='participant_joined' then 'connected' else 'left' end,p_when,case when p_kind='participant_left' then p_when else null end)
    on conflict(session_id,participant_id) do update set state=excluded.state,last_event_at=excluded.last_event_at,disconnected_at=excluded.disconnected_at
      where meeting_admissions.last_event_at is null or meeting_admissions.last_event_at<=excluded.last_event_at;
  end if;
  return true;
end $$;
revoke all on function public.record_livekit_event(text,text,text,text,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.record_livekit_event(text,text,text,text,text,text,timestamptz) to service_role;
commit;
