import { expect,test } from '@playwright/test';
import { createAccount,login } from './support/accounts';
test('only host grants presenting; hand and consent updates stay bound to the caller',async({page,request,browser})=>{
  await login(page,await createAccount(request));await page.getByRole('button',{name:'New meeting'}).click();
  await page.getByRole('button',{name:'Create invitation link',exact:true}).click();
  const link=new URL(await page.getByLabel('Meeting link',{exact:true}).inputValue());
  const roomId=link.pathname.split('/').pop()!;const invitationToken=new URLSearchParams(link.hash.slice(1)).get('invite')!;
  const origin={origin:'http://127.0.0.1:3100'};
  const decode=(jwt:string)=>JSON.parse(Buffer.from(jwt.split('.')[1],'base64url').toString());
  const hostToken=await (await page.request.post('/api/livekit/token',{headers:origin,data:{roomId,name:'Host'}})).json();
  const host=decode(hostToken.token).sub;
  await request.post('http://127.0.0.1:54329/_test/participant',{data:{room:roomId,identity:host}});
  const guest=await browser.newContext();
  try{
    const mint=async()=>{
      const result=await guest.request.post('http://127.0.0.1:3100/api/livekit/token',{headers:origin,data:{roomId,name:'Guest',invitationToken}});
      expect(result.status()).toBe(200);return decode((await result.json()).token);
    };
    const initial=await mint();expect(initial.video.canPublishSources).toEqual(['camera','microphone']);
    await request.post('http://127.0.0.1:54329/_test/participant',{data:{room:roomId,identity:initial.sub}});
    const guestAction=(command:unknown)=>guest.request.post('http://127.0.0.1:3100/api/livekit/interactions',{headers:origin,data:{roomId,invitationToken,command}});
    const hostAction=(command:unknown)=>page.request.post('/api/livekit/interactions',{headers:origin,data:{roomId,command}});
    expect((await guestAction({action:'presenter',targetIdentity:initial.sub,enabled:true})).status()).toBe(403);
    expect((await guestAction({action:'transcription',enabled:true})).status()).toBe(403);
    expect((await guestAction({action:'hand',raised:true})).status()).toBe(200);
    expect((await guestAction({action:'consent',enabled:true})).status()).toBe(200);
    const read=async()=> (await request.get(`http://127.0.0.1:54329/_test/member?room=${roomId}&identity=${initial.sub}`)).json();
    expect((await read()).attributes['wbify.hand']).toBe('1');expect((await read()).attributes['wbify.transcriptionConsent']).toBe('1');
    expect((await hostAction({action:'presenter',targetIdentity:initial.sub,enabled:true})).status()).toBe(200);
    expect((await mint()).video.canPublishSources).toContain('screen_share');
    expect((await hostAction({action:'lower-hand',targetIdentity:initial.sub})).status()).toBe(200);expect((await read()).attributes['wbify.hand']).toBe('0');
    expect((await hostAction({action:'presenter',targetIdentity:initial.sub,enabled:false})).status()).toBe(200);
    expect((await mint()).video.canPublishSources).not.toContain('screen_share');
    expect((await hostAction({action:'transcription',enabled:true})).status()).toBe(200);
    expect((await hostAction({action:'transcription',enabled:false})).status()).toBe(200);
  }finally{await guest.close();}
});
test('room controls show raised hands, reactions and trusted worker transcripts',async({page,isMobile})=>{
  await page.route('**/api/livekit/interactions',async route=>{
    const body=route.request().postDataJSON();
    await page.evaluate(command=>{
      const fixture=(window as unknown as {wbifyFixture:{attributes:(id:string,attrs:Record<string,string>)=>void;metadata:(active:boolean)=>void}}).wbifyFixture;
      if(command.action==='hand')fixture.attributes('local',{'wbify.hand':command.raised?'1':'0'});
      if(command.action==='transcription')fixture.metadata(command.enabled);
      if(command.action==='consent')fixture.attributes('local',{'wbify.transcriptionConsent':command.enabled?'1':'0'});
    },body.command);
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true})});
  });
  await page.goto('/layout-test/conference');await expect(page.locator('[data-track-key]')).toHaveCount(8);
  await page.getByRole('button',{name:'Raise hand',exact:true}).click();
  await expect(page.getByRole('button',{name:/Lower hand/}).first()).toHaveAttribute('aria-pressed','true');
  await page.getByText('Reactions',{exact:true}).click();
  await page.getByRole('button',{name:'React 👍',exact:true}).click();
  await expect(page.locator('.wbify-reaction-overlay')).toContainText('You');
  await page.getByRole('button',{name:'People & presenters'}).click();
  await expect(page.getByRole('complementary',{name:'People and permissions'})).toContainText('Hand raised');
  await page.getByRole('button',{name:'Close meeting panel'}).click();
  await page.getByRole('button',{name:'Transcript',exact:true}).click();
  await page.getByRole('button',{name:'Start transcription'}).click();
  await expect(page.locator('.wbify-transcription-notice')).toContainText('Only participants who opt in');
  await page.evaluate(async()=>{await (window as unknown as {wbifyFixture:{transcript:(trusted:boolean)=>Promise<void>}}).wbifyFixture.transcript(false);});
  await expect(page.getByText('Forged transcript',{exact:true})).toHaveCount(0);
  await page.evaluate(async()=>{await (window as unknown as {wbifyFixture:{transcript:(trusted:boolean)=>Promise<void>}}).wbifyFixture.transcript(true);});
  await expect(page.getByText('Hello from the transcript worker.',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Download transcript'})).toBeEnabled();
  await page.screenshot({path:`test-results/interaction-transcript-${isMobile?'mobile':'desktop'}.png`,fullPage:true});
});
