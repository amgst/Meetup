import type { APIRequestContext, Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
const base = 'http://127.0.0.1:54329';
export const password = 'Local-test-password-123!';
export async function createAccount(request: APIRequestContext, confirmed = true) {
  const email = `test-${randomUUID()}@example.test`;
  const result = await request.post(`${base}/auth/v1/signup`,{data:{email,password,data:{display_name:'Test member'}}});
  if (!result.ok()) throw new Error('Test account setup failed');
  if(confirmed) {
    const token = await latestEmail(request,email);
    await request.post(`${base}/auth/v1/verify`,{data:token});
  }
  return email;
}
export async function latestEmail(request: APIRequestContext,email: string) {
  return (await request.get(`${base}/_test/email?email=${encodeURIComponent(email)}`)).json();
}
export async function login(page: Page,email: string, value = password) {
  await page.goto('/login');
  await page.getByLabel('Email',{exact:true}).fill(email);
  await page.getByLabel('Password',{exact:true}).fill(value);
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await page.waitForURL('**/dashboard');
}
