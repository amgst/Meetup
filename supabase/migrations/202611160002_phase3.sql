-- Apply AFTER Phase 2. Existing records/IDs are retained.
begin;
create index if not exists invitations_active_meeting_idx on public.meeting_invitations(meeting_id,expires_at) where revoked_at is null;

create or replace function public.edit_own_meeting(p_meeting_id text,p_title text,p_notes text,p_starts_at timestamptz) returns boolean
language plpgsql security definer set search_path = '' as $$
declare m public.meetings;
begin
  select * into m from public.meetings where id=p_meeting_id and owner_id=(select auth.uid()) for update;
  if not found or m.status<>'active' then return false; end if;
  if char_length(trim(p_title)) not between 1 and 80 or char_length(p_notes)>180 or p_title is null or p_notes is null or p_starts_at is null then return false; end if;
  if m.scheduled and (m.starts_at<=now() or p_starts_at<=now()) then return false; end if;
  if not m.scheduled and p_starts_at<>m.starts_at then return false; end if;
  update public.meetings set title=trim(p_title),notes=p_notes,starts_at=p_starts_at where id=m.id;
  return true;
end $$;

create or replace function public.issue_meeting_invitation(p_meeting_id text,p_token_hash text,p_expires_at timestamptz) returns uuid
language plpgsql security definer set search_path = '' as $$
declare m public.meetings; invitation_id uuid;
begin
  select * into m from public.meetings where id=p_meeting_id and owner_id=(select auth.uid()) for update;
  if not found or m.status<>'active' or m.locked then raise exception 'Meeting unavailable' using errcode='42501'; end if;
  if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' or p_expires_at is null or p_expires_at<=now() or p_expires_at>now()+interval '30 days' then
    raise exception 'Invalid invitation' using errcode='22023';
  end if;
  if (select count(*) from public.meeting_invitations where meeting_id=m.id and revoked_at is null and expires_at>now())>=20 then
    raise exception 'Revoke an existing link before creating another' using errcode='54000';
  end if;
  insert into public.meeting_invitations(meeting_id,token_hash,expires_at) values(m.id,p_token_hash,p_expires_at) returning id into invitation_id;
  return invitation_id;
end $$;

create or replace function public.list_own_invitations(p_meeting_id text)
returns table(id uuid,expires_at timestamptz,revoked_at timestamptz,created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select i.id,i.expires_at,i.revoked_at,i.created_at
  from public.meeting_invitations i join public.meetings m on m.id=i.meeting_id
  where m.id=p_meeting_id and m.owner_id=(select auth.uid()) order by i.created_at desc limit 100;
$$;

create or replace function public.revoke_own_invitation(p_invitation_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare meeting_id text; changed integer;
begin
  select m.id into meeting_id from public.meetings m join public.meeting_invitations i on m.id=i.meeting_id
  where i.id=p_invitation_id and m.owner_id=(select auth.uid()) for update of m;
  if not found then return false; end if;
  update public.meeting_invitations set revoked_at=now() where id=p_invitation_id and revoked_at is null;
  get diagnostics changed=row_count; return changed=1;
end $$;

-- Capability lookup exposes only limited details, never notes, owner IDs, or hashes.
drop function if exists public.inspect_meeting_invitation(text,text);
create or replace function public.validate_meeting_invitation(p_meeting_id text,p_token text)
returns table(id text,title text,starts_at timestamptz,scheduled boolean,expires_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select m.id,m.title,m.starts_at,m.scheduled,i.expires_at
  from public.meeting_invitations i join public.meetings m on m.id=i.meeting_id
  where m.id=p_meeting_id and p_token ~ '^[A-Za-z0-9_-]{43}$' and i.token_hash=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p_token,'UTF8')),'hex') and i.revoked_at is null
    and i.expires_at>now() and m.status='active' and not m.locked;
$$;

-- Serializes against invitation issuance using the same meeting row lock.
create or replace function public.cancel_own_meeting(meeting_id text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare target text;
begin
  select id into target from public.meetings where id=meeting_id and owner_id=(select auth.uid())
    and scheduled and starts_at>now() and status='active' for update;
  if not found then return false; end if;
  update public.meetings set status='cancelled' where id=target;
  update public.meeting_invitations set revoked_at=now() where meeting_invitations.meeting_id=target and revoked_at is null;
  return true;
end $$;

revoke all on function public.edit_own_meeting(text,text,text,timestamptz) from public,anon;
revoke all on function public.issue_meeting_invitation(text,text,timestamptz) from public,anon;
revoke all on function public.list_own_invitations(text) from public,anon;
revoke all on function public.revoke_own_invitation(uuid) from public,anon;
revoke all on function public.validate_meeting_invitation(text,text) from public;
revoke all on function public.cancel_own_meeting(text) from public,anon;
grant execute on function public.edit_own_meeting(text,text,text,timestamptz),public.issue_meeting_invitation(text,text,timestamptz),public.list_own_invitations(text),public.revoke_own_invitation(uuid),public.cancel_own_meeting(text) to authenticated;
grant execute on function public.validate_meeting_invitation(text,text) to anon,authenticated;
commit;
