import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createHash,randomBytes } from 'node:crypto';
const db=new PGlite();const alice='11111111-1111-4111-8111-111111111111',bob='22222222-2222-4222-8222-222222222222';
const room='wbify-preview-control1',guest='guest-33333333-3333-4333-8333-333333333333';
try{
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated,service_role;insert into auth.users(id) values('${alice}'),('${bob}');`);
  for(const file of ['202611160001_phase2.sql','202611160002_phase3.sql','202611160004_interactions.sql','202611160004_interactions.sql'])await db.exec(await readFile(new URL(`../../supabase/migrations/${file}`,import.meta.url),'utf8'));
  await db.exec(`insert into meetings(id,owner_id,title,starts_at) values('${room}','${alice}','Permissions',now());set role authenticated;set request.jwt.claim.sub='${bob}';`);
  const set=async(enabled)=>(await db.query('select set_meeting_presenter($1,$2,$3) as ok',[room,guest,enabled])).rows[0].ok;
  assert.equal(await set(true),false);
  await db.exec(`set request.jwt.claim.sub='${alice}'`);assert.equal(await set(true),true);
  await assert.rejects(db.exec('select * from meeting_presenters'),/permission denied/);
  const token=randomBytes(32).toString('base64url');const hash=createHash('sha256').update(token).digest('hex');
  await db.query("select issue_meeting_invitation($1,$2,now()+interval '1 day')",[room,hash]);
  await db.exec("reset role;set role anon;set request.jwt.claim.sub=''");
  const access=async(raw)=>(await db.query('select meeting_presenter_access($1,$2,$3) as ok',[room,guest,raw])).rows[0].ok;
  assert.equal(await access(token),true);assert.equal(await access('invalid'),false);
  await assert.rejects(set(false),/permission denied/);
  await db.exec(`reset role;set role authenticated;set request.jwt.claim.sub='${alice}'`);assert.equal(await set(false),true);
  await db.exec("reset role;set role anon;set request.jwt.claim.sub=''");assert.equal(await access(token),false);
  console.log('PASS: presenter migration/retry, owner-only grants/revocation, no direct reads, current invitation required on rejoin');
}finally{await db.close();}
