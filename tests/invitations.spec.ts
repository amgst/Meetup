import { expect,test } from '@playwright/test';
import { createAccount,login } from './support/accounts';
test.beforeEach(async({page,request})=>{await login(page,await createAccount(request));});
test('host edits persist; anonymous invitation validates and revocation blocks it',async({page,browser})=>{
  await page.getByRole('button',{name:'New meeting'}).click();
  await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Edit',exact:true}).click();
  await page.getByLabel('Meeting title').fill('Customer kickoff');
  await page.getByLabel('Meeting notes').fill('Private account notes');
  await page.getByRole('button',{name:'Save changes'}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);await page.reload();
  await expect(page.locator('.meetingName')).toHaveText('Customer kickoff');
  await page.getByRole('button',{name:'Invite',exact:true}).click();
  await page.getByRole('button',{name:'Create invitation link',exact:true}).click();
  const url=await page.getByLabel('Meeting link',{exact:true}).inputValue();
  expect(new URL(url).hash).toMatch(/^#invite=[A-Za-z0-9_-]{43}$/);
  const guest=await browser.newContext();const guestPage=await guest.newPage();
  try{
    await guestPage.goto(url.split('#')[0]);
    await expect(guestPage.getByRole('status').filter({hasText:/Invitation|complete invitation/})).toContainText('complete invitation link');
    await expect(guestPage.getByText('Customer kickoff',{exact:true})).toHaveCount(0);
    await guestPage.goto(url);
    await expect(guestPage.getByRole('status').filter({hasText:/Invitation|complete invitation/})).toContainText('Invitation verified');
    await expect(guestPage.getByRole('heading',{name:'Customer kickoff',exact:true})).toBeVisible();
    await expect(guestPage.getByText('Private account notes')).toHaveCount(0);
    const altered=url.slice(0,-1)+(url.endsWith('A')?'B':'A');
    await guestPage.goto(altered);
    await expect(guestPage.getByRole('status').filter({hasText:/Invitation|complete invitation/})).toContainText('Invitation unavailable');
    await guestPage.goto(url);await expect(guestPage.getByRole('status').filter({hasText:/Invitation|complete invitation/})).toContainText('Invitation verified');
    await page.getByRole('button',{name:'Revoke link',exact:true}).click();
    await expect(page.getByText('Invitation revoked.',{exact:true})).toBeVisible();
    await guestPage.reload();await expect(guestPage.getByRole('status').filter({hasText:/Invitation|complete invitation/})).toContainText('Invitation unavailable');
  }finally{await guest.close();}
});
test('rescheduling persists and cancellation retains history while invalidating invitations',async({page,browser})=>{
  await page.goto('/meetings/schedule');
  await page.getByLabel('Meeting title').fill('Planning session');
  await page.getByLabel('Date and time').fill('2099-01-10T09:00');
  await page.getByRole('button',{name:'Create meeting link'}).click();
  await page.getByRole('button',{name:'Create invitation link',exact:true}).click();
  const url=await page.getByLabel('Meeting link',{exact:true}).inputValue();
  await page.keyboard.press('Escape');await page.goto('/meetings');
  await page.getByRole('button',{name:'Edit',exact:true}).click();
  await page.getByLabel('Date and time').fill('2099-02-11T10:30');
  await page.getByRole('button',{name:'Save changes'}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);await page.reload();
  const guest=await browser.newContext();const guestPage=await guest.newPage();
  try{
    await guestPage.goto(url);await expect(guestPage.getByRole('status').filter({hasText:/Invitation|complete invitation/})).toContainText('Invitation verified');
    page.once('dialog',dialog=>dialog.accept());
    await page.getByRole('button',{name:'Cancel',exact:true}).click();
    await expect(page.locator('.meetingName')).toHaveCount(0);
    await page.getByRole('button',{name:'Cancelled',exact:true}).click();
    await expect(page.locator('.meetingName')).toHaveText('Planning session');
    await expect(page.getByRole('button',{name:'Invite',exact:true})).toHaveCount(0);
    await guestPage.reload();await expect(guestPage.getByRole('status').filter({hasText:/Invitation|complete invitation/})).toContainText('Invitation unavailable');
  }finally{await guest.close();}
});
