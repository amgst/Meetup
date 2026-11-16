import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const migration = await readFile(new URL('../../supabase/migrations/202611160001_phase2.sql',import.meta.url),'utf8');
const legacy = await readFile(new URL('../../supabase/setup.sql',import.meta.url),'utf8');
const alice = '11111111-1111-4111-8111-111111111111';
const bob = '22222222-2222-4222-8222-222222222222';
async function run(upgrade) {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth,public to anon,authenticated,service_role;
      grant execute on function auth.uid() to anon,authenticated,service_role;
      insert into auth.users values ('${alice}','{"display_name":"Alice"}');`);
    if (upgrade) {
      await db.exec(legacy);
      await db.exec(`insert into public.meetings(id,owner_id,title,starts_at,scheduled) values('wbify-preview-legacy01','${alice}','Legacy meeting',now()+interval '1 day',true)`);
    }
    await db.exec(migration);
    await db.exec(migration); // Safe retry after interruption/manual SQL use.
    assert.equal((await db.query('select display_name from profiles where id=$1',[alice])).rows[0].display_name,'Alice');
    await db.query('insert into auth.users(id) values($1)',[bob]);
    assert.equal((await db.query('select count(*)::int as n from profiles')).rows[0].n,2);
    if (upgrade) assert.equal((await db.query("select status from meetings where id='wbify-preview-legacy01'")).rows[0].status,'active');
    await db.exec(`set role authenticated; set request.jwt.claim.sub='${alice}';`);
    await db.query(`insert into meetings(id,owner_id,title,starts_at,scheduled) values('wbify-preview-alicemeet',$1,'Alice meeting',now()+interval '1 day',true)`,[alice]);
    await assert.rejects(db.query(`insert into meetings(id,owner_id,title,starts_at) values('wbify-preview-forged01',$1,'Forged',now())`,[bob]), /row-level security/);
    await assert.rejects(db.exec("update meetings set owner_id='22222222-2222-4222-8222-222222222222'"), /permission denied/);
    await db.query("update profiles set display_name='Alice updated' where id=$1",[alice]);
    assert.equal((await db.query('select count(*)::int as n from profiles')).rows[0].n,1);
    await db.exec(`set request.jwt.claim.sub='${bob}';`);
    assert.equal((await db.query('select count(*)::int as n from meetings')).rows[0].n,0);
    assert.equal((await db.query("select cancel_own_meeting('wbify-preview-alicemeet') as ok")).rows[0].ok,false);
    const changed = await db.query("update profiles set display_name='Hacked' where id=$1 returning id",[alice]);
    assert.equal(changed.rows.length,0);
    for (const table of ['meeting_sessions','meeting_participants','meeting_admissions','recordings','subscriptions']) {
      await assert.rejects(db.exec(`insert into ${table} default values`),/permission denied/);
    }
    await assert.rejects(db.exec('select * from meeting_invitations'),/permission denied/);
    await db.exec(`set request.jwt.claim.sub='${alice}';`);
    assert.equal((await db.query("select cancel_own_meeting('wbify-preview-alicemeet') as ok")).rows[0].ok,true);
    assert.equal((await db.query("select cancel_own_meeting('wbify-preview-alicemeet') as ok")).rows[0].ok,false);
    await db.exec('reset role;');
    const rls = await db.query("select count(*)::int as n from pg_tables where schemaname='public' and rowsecurity");
    assert.equal(rls.rows[0].n,8);
    await db.exec('set role anon;');
    await assert.rejects(db.exec('select * from profiles'),/permission denied/);
    await assert.rejects(db.exec('select * from meetings'),/permission denied/);
    await assert.rejects(db.exec("select cancel_own_meeting('wbify-preview-alicemeet')"),/permission denied/);
    console.log(`PASS: ${upgrade ? 'legacy upgrade' : 'fresh schema'}; trigger, backfill, RLS, ownership, cancellation, closed future writes, anonymous access`);
  } finally { await db.close(); }
}
await run(false);
await run(true);
