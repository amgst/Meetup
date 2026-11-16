import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { createAccount, latestEmail, login, password } from './support/accounts';
test('protected routes reject anonymous and forged sessions', async ({ page, context }) => {
  for(const path of ['/dashboard','/meetings','/settings','/reset-password']) {
    await page.goto(path);await expect(page).toHaveURL('http://127.0.0.1:3100/login');
  }
  // A session-shaped cookie alone is insufficient: server asks Auth for the user.
  const forged = Buffer.from(JSON.stringify({access_token:'forged',refresh_token:'forged',expires_at:9999999999,user:{id:'attacker'}})).toString('base64url');
  await context.addCookies([{name:'sb-127-auth-token',value:`base64-${forged}`,domain:'127.0.0.1',path:'/'}]);
  await page.goto('/dashboard');await expect(page).toHaveURL(/\/login$/);
  await page.goto('/auth/callback?next=//evil.example');await expect(page).toHaveURL(/\/login\?error=link/);
  await page.goto('/auth/confirm?token_hash=invalid&type=signup');await expect(page).toHaveURL(/\/login\?error=link/);
});
test('register, verify email, save profile, sign out and protect cached navigation', async ({ page, request }) => {
  const email=`register-${randomUUID()}@example.test`;
  await page.goto('/register');
  await page.getByLabel('Your name').fill('New member');
  await page.getByLabel('Email',{exact:true}).fill(email);
  await page.getByLabel('Password',{exact:true}).fill(password);
  await page.getByRole('button',{name:'Create account',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Check your email');
  await page.goto('/login');
  await page.getByLabel('Email',{exact:true}).fill(email);
  await page.getByLabel('Password',{exact:true}).fill(password);
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await expect(page.locator('form').getByRole('alert')).toContainText('confirm your email');
  const token = await latestEmail(request,email);
  await page.goto(`/auth/confirm?token_hash=${token.token_hash}&type=signup`);
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading',{name:'Good to see you, New member'})).toBeVisible();
  await page.goto('/settings');
  await page.getByLabel('Display name').fill('Updated member');
  await page.getByLabel('Preferred timezone').fill('Asia/Karachi');
  await page.getByRole('button',{name:'Save profile'}).click();
  await expect(page.locator('form').getByRole('status')).toContainText('Profile saved');
  await page.reload();
  await expect(page.getByLabel('Display name')).toHaveValue('Updated member');
  await page.getByRole('button',{name:'Sign out',exact:true}).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/settings');await expect(page).toHaveURL(/\/login$/);
});
test('password recovery changes password and rejects reuse of email link', async ({ page, request }) => {
  const email = await createAccount(request);
  await page.goto('/forgot-password');
  await page.getByLabel('Email',{exact:true}).fill(email);
  await page.getByRole('button',{name:'Send reset link'}).click();
  await expect(page.getByRole('status')).toContainText('If an account exists');
  const token = await latestEmail(request,email);
  const callback=`/auth/confirm?token_hash=${token.token_hash}&type=recovery`;
  await page.goto(callback);
  await expect(page).toHaveURL(/\/reset-password$/);
  const nextPassword='Another-local-password-456!';
  await page.getByLabel('New password',{exact:true}).fill(nextPassword);
  await page.getByLabel('Confirm new password',{exact:true}).fill(nextPassword);
  await page.getByRole('button',{name:'Update password'}).click();
  await expect(page).toHaveURL(/\/login\?updated=1/);
  await login(page,email,nextPassword);
  await page.goto(callback);await expect(page).toHaveURL(/\/login\?error=link/);
});
test('accounts keep separate meetings after switching users', async ({ page, request }) => {
  const alice=await createAccount(request);const bob=await createAccount(request);
  await login(page,alice);
  await page.getByRole('button',{name:'New meeting'}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.meetingName')).toContainText('Instant meeting');
  await page.getByRole('button',{name:'Sign out',exact:true}).click();
  await expect(page).toHaveURL(/\/login$/);
  await login(page,bob);
  await expect(page.locator('.meetingName')).toHaveCount(0);
  await page.getByRole('button',{name:'Sign out',exact:true}).click();
  await expect(page).toHaveURL(/\/login$/);
  await login(page,alice);
  await expect(page.locator('.meetingName')).toContainText('Instant meeting');
});
