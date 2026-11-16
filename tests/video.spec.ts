import { expect,test } from '@playwright/test';
import { AccessToken,TokenVerifier } from 'livekit-server-sdk';
import { createHash } from 'node:crypto';
import { createAccount,login } from './support/accounts';
const key='local-test-livekit-key',secret='local-test-livekit-secret-at-least-32-characters';
test('host token is scoped; guest validation and capacity errors are enforced',async({page,request,browser})=>{
  await login(page,await createAccount(request));
  await page.getByRole('button',{name:'New meeting'}).click();
  await page.getByRole('button',{name:'Create invitation link',exact:true}).click();
  const url=await page.getByLabel('Meeting link',{exact:true}).inputValue();const parsed=new URL(url);
  const roomId=parsed.pathname.split('/').pop()!;const invitationToken=new URLSearchParams(parsed.hash.slice(1)).get('invite')!;
  const payload={roomId,name:'Test host'};
  const hostResponse=await page.request.post('/api/livekit/token',{headers:{origin:'http://127.0.0.1:3100'},data:payload});
  expect(hostResponse.status()).toBe(200);
  const {token}=await hostResponse.json();await new TokenVerifier(key,secret).verify(token);
  const claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString());
  expect(claims.video.room).toBe(roomId);expect(claims.video.roomAdmin).toBe(false);expect(claims.roomConfig.maxParticipants).toBe(10);
  expect(claims.exp-claims.nbf).toBeLessThanOrEqual(300);
  const guest=await browser.newContext();
  try{
    const post=(data:unknown)=>guest.request.post('http://127.0.0.1:3100/api/livekit/token',{headers:{origin:'http://127.0.0.1:3100'},data});
    expect((await post({roomId,name:'Guest'})).status()).toBe(403);
    expect((await post({roomId,name:'Guest',invitationToken:'A'.repeat(43)})).status()).toBe(403);
    const first=await post({roomId,name:'Guest',invitationToken});expect(first.status()).toBe(200);
    const second=await post({roomId,name:'Guest renamed',invitationToken});expect(second.status()).toBe(200);
    const jwt1=(await first.json()).token,jwt2=(await second.json()).token;
    const decode=(value:string)=>JSON.parse(Buffer.from(value.split('.')[1],'base64url').toString());
    expect(decode(jwt1).sub).toBe(decode(jwt2).sub);expect(decode(jwt1).sub).toMatch(/^guest-/);
    await request.post('http://127.0.0.1:54329/_test/full-room',{data:{room:roomId}});
    expect((await post({roomId,name:'Guest',invitationToken})).status()).toBe(409);
  }finally{await guest.close();}
  expect((await page.request.post('/api/livekit/token',{headers:{origin:'https://evil.example'},data:payload})).status()).toBe(403);
});
test('device setup works without requesting media immediately; webhooks require valid signatures',async({page,request,isMobile})=>{
  await login(page,await createAccount(request));
  await page.getByRole('button',{name:'New meeting'}).click();
  const href=await page.getByRole('link',{name:'Open meeting preview'}).getAttribute('href');
  await page.goto(href!);await page.getByRole('button',{name:'Set up devices'}).click();
  await expect(page.getByRole('button',{name:'Join meeting',exact:true})).toBeVisible();
  await page.screenshot({path:`test-results/video-prejoin-${isMobile?'mobile':'desktop'}.png`,fullPage:true});
  const roomId=href!.split('/').pop()!;
  const body=JSON.stringify({id:'EV_'+crypto.randomUUID(),event:'room_started',createdAt:String(Math.floor(Date.now()/1000)),room:{name:roomId,sid:'RM_'+crypto.randomUUID()}});
  expect((await request.post('/api/webhooks/livekit',{data:body,headers:{'Content-Type':'application/webhook+json',authorization:'invalid'}})).status()).toBe(401);
  const auth=new AccessToken(key,secret,{ttl:'1m'});auth.sha256=createHash('sha256').update(body).digest('base64');
  const signature=await auth.toJwt();
  for(let i=0;i<2;i++)expect((await request.post('/api/webhooks/livekit',{data:body,headers:{'Content-Type':'application/webhook+json',authorization:signature}})).status()).toBe(200);
  const events=await (await request.get(`http://127.0.0.1:54329/_test/events?room=${roomId}`)).json();expect(events).toHaveLength(1);
});
