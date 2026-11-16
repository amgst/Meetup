// Test-only Auth HTTP double. REST requests execute the real migration in PGlite.
// No connection to Supabase Cloud, no production authentication guarantees.
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
const db = new PGlite();
await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
create schema auth; create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema public,auth to anon,authenticated,service_role;
grant execute on function auth.uid() to anon,authenticated,service_role;`);
await db.exec(await readFile(new URL('../../supabase/migrations/202611160001_phase2.sql',import.meta.url),'utf8'));
await db.exec(await readFile(new URL('../../supabase/migrations/202611160002_phase3.sql',import.meta.url),'utf8'));
await db.exec(await readFile(new URL('../../supabase/migrations/202611160003_phase4.sql',import.meta.url),'utf8'));
const rooms=new Map();
const fullRooms=new Set();
const accounts = new Map();
const refreshTokens = new Map();
const emailTokens = new Map();
const accessTokens = new Map();
function session(account) {
  const now = Math.floor(Date.now()/1000);
  const part = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const access_token = `${part({ alg:'HS256',typ:'JWT' })}.${part({ sub:account.user.id,exp:now+3600,iat:now,role:'authenticated',aud:'authenticated' })}.test-signature`;
  const refresh_token = randomUUID(); refreshTokens.set(refresh_token,account); accessTokens.set(access_token,account);
  return { access_token, refresh_token, token_type:'bearer', expires_in:3600, expires_at:now+3600, user:account.user };
}
const server = createServer(async (req,res) => {
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Headers','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,PATCH,OPTIONS');
  if(req.method==='OPTIONS') { res.writeHead(204);res.end();return; }
  function send(code,data) { res.writeHead(code,{'Content-Type':'application/json'});res.end(JSON.stringify(data)); }
  try {
    const url = new URL(req.url,'http://127.0.0.1:54329');
    let text='';for await (const chunk of req) text+=chunk;
    const body = text ? JSON.parse(text) : {};
    const account = accessTokens.get((req.headers.authorization || '').replace(/^Bearer /,''));
    if(url.pathname==='/_test/full-room'){fullRooms.add(body.room);return send(200,{});}
    if(url.pathname==='/_test/events')return send(200,(await db.query('select id,event from livekit_events where meeting_id=$1',[url.searchParams.get('room')])).rows);
    if(url.pathname==='/twirp/livekit.RoomService/CreateRoom'){
      const room=rooms.get(body.name)||{sid:'RM_'+randomUUID(),name:body.name,maxParticipants:body.maxParticipants};rooms.set(body.name,room);return send(200,room);
    }
    if(url.pathname==='/twirp/livekit.RoomService/ListParticipants')return send(200,{participants:fullRooms.has(body.room)?Array.from({length:10},(_,n)=>({identity:'occupied-'+n})):[]});
    if(url.pathname==='/health') return send(200,{ok:true});
    if(url.pathname==='/_test/email') {
      const token = [...emailTokens.entries()].reverse().find(([,t])=>t.email===url.searchParams.get('email'));
      return send(200, token ? {token_hash:token[0],type:token[1].type} : {});
    }
    if(url.pathname==='/auth/v1/signup') {
      if(accounts.has(body.email)) return send(400,{msg:'Account already exists'});
      const user={id:randomUUID(),aud:'authenticated',role:'authenticated',email:body.email,email_confirmed_at:null,app_metadata:{provider:'email'},user_metadata:body.data || {},identities:[],created_at:new Date().toISOString()};
      accounts.set(body.email,{ user,password:body.password });
      await db.query('insert into auth.users(id,raw_user_meta_data) values($1,$2)',[user.id,JSON.stringify(user.user_metadata)]);
      emailTokens.set(randomUUID(),{ email:body.email,type:'signup' });
      return send(200,user);
    }
    if(url.pathname==='/auth/v1/token') {
      const found = url.searchParams.get('grant_type')==='refresh_token' ? refreshTokens.get(body.refresh_token) : accounts.get(body.email);
      if(!found || (body.password && found.password!==body.password)) return send(400,{error_code:'invalid_credentials',msg:'Invalid login credentials'});
      if(!found.user.email_confirmed_at) return send(400,{error_code:'email_not_confirmed',msg:'Email not confirmed'});
      return send(200,session(found));
    }
    if(['/auth/v1/recover','/auth/v1/resend'].includes(url.pathname)) {
      if(accounts.has(body.email)) emailTokens.set(randomUUID(),{ email:body.email,type:url.pathname.endsWith('recover')?'recovery':'signup' });
      return send(200,{});
    }
    if(url.pathname==='/auth/v1/verify') {
      const token=emailTokens.get(body.token_hash); const found=accounts.get(token?.email);
      if(!found || token.type!==body.type) return send(400,{msg:'Expired link'});
      emailTokens.delete(body.token_hash);found.user.email_confirmed_at=new Date().toISOString();
      return send(200,session(found));
    }
    if(url.pathname==='/auth/v1/user') {
      if(!account) return send(401,{msg:'Not authenticated'});
      if(req.method==='PUT') account.password=body.password || account.password;
      return send(200,account.user);
    }
    if(url.pathname==='/auth/v1/logout') {
      if(account) {
        for(const [token,value] of accessTokens) if(value===account) accessTokens.delete(token);
        for(const [token,value] of refreshTokens) if(value===account) refreshTokens.delete(token);
      }
      return send(204,{});
    }
    if(url.pathname.startsWith('/rest/v1/')) {
      const serviceRole=req.headers.apikey==='local-test-service-key';
      if(!serviceRole && !account && url.pathname!=='/rest/v1/rpc/validate_meeting_invitation') return send(401,{message:'Not authenticated'});
      const table = url.pathname.slice('/rest/v1/'.length);
      const result=await db.transaction(async tx=>{
        await tx.exec(serviceRole?'set local role service_role':account ? 'set local role authenticated' : 'set local role anon');
        await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[account?.user.id || '']);
        const rpcs={
          'rpc/record_livekit_event':{args:['p_id','p_kind','p_room_id','p_room_sid','p_identity','p_name','p_when'],list:false},
          'rpc/cancel_own_meeting':{args:['meeting_id'],list:false},
          'rpc/edit_own_meeting':{args:['p_meeting_id','p_title','p_notes','p_starts_at'],list:false},
          'rpc/issue_meeting_invitation':{args:['p_meeting_id','p_token_hash','p_expires_at'],list:false},
          'rpc/list_own_invitations':{args:['p_meeting_id'],list:true},
          'rpc/revoke_own_invitation':{args:['p_invitation_id'],list:false},
          'rpc/validate_meeting_invitation':{args:['p_meeting_id','p_token'],list:true},
        };
        if(rpcs[table]){
          const rpc=rpcs[table];const params=rpc.args.map((_,index)=>'$'+(index+1)).join(',');
          const functionName=table.slice(4);
          const query=rpc.list?`select * from public.${functionName}(${params})`:`select public.${functionName}(${params}) as value`;
          const {rows}=await tx.query(query,rpc.args.map(name=>body[name]));
          return rpc.list?rows:rows[0].value;
        }
        if(table==='profiles') {
          if(req.method==='PATCH') await tx.query('update profiles set display_name=$1,timezone=$2 where id=$3',[body.display_name,body.timezone,account.user.id]);
          return (await tx.query('select * from profiles where id=$1',[account.user.id])).rows;
        }
        if(table==='meetings') {
          if(req.method==='POST') {
            await tx.query('insert into meetings(id,owner_id,title,starts_at,scheduled,notes) values($1,$2,$3,$4,$5,$6)',[body.id,body.owner_id,body.title,body.starts_at,body.scheduled,body.notes]);
            return null;
          }
          const id=url.searchParams.get('id');
          return (await tx.query('select * from meetings'+(id?' where id=$1':'')+' order by created_at desc',id?[id.slice(3)]:[])).rows;
        }
        throw new Error('Unknown test endpoint');
      });
      return send(200,req.headers.accept?.includes('application/vnd.pgrst.object+json') && Array.isArray(result) ? result[0] : result);
    }
    send(404,{message:'Unknown test endpoint'});
  } catch(err) { send(400,{message:err.message,code:err.code}); }
});
server.listen(54329,'127.0.0.1');
