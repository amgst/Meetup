import { expect, test } from '@playwright/test';
test('instant invitation persists across reload and opens the room preview', async ({ page }) => {
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'New meeting' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const invitation = await dialog.getByLabel('Meeting link').inputValue();
  await expect(dialog.getByRole('link', { name: 'Open meeting preview' })).toHaveAttribute('href', /\/room\/wbify-preview-/);
  await dialog.getByRole('button', { name: 'Close dialog' }).click();
  await page.reload();
  await expect(page.getByText('Instant meeting', { exact: true }).last()).toBeVisible();
  await page.goto(invitation);
  await expect(page.getByRole('heading', { name: 'Your meeting workspace' })).toBeVisible();
  await expect(page.getByText('Live video is planned for Phase 4.', { exact: false })).toBeVisible();
});
test('schedules and cancels a future meeting', async ({ page }) => {
  await page.goto('/meetings/schedule');
  await page.getByLabel('Meeting title').fill('Product planning');
  await page.getByLabel('Date and time').fill('2099-01-10T09:00');
  await page.getByLabel('Meeting notes').fill('Roadmap review');
  await page.getByRole('button', { name: 'Create meeting link' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.goto('/meetings');
  await expect(page.getByText('Product planning', { exact: true })).toBeVisible();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByText('Product planning', { exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByText('Product planning', { exact: true })).toHaveCount(0);
});
test('join validates input and responsive navigation is available', async ({ page, isMobile }) => {
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Good to see you' })).toBeVisible();
  await page.screenshot({ path: `test-results/dashboard-${isMobile ? 'mobile' : 'desktop'}.png`, fullPage: true });
  if (isMobile) {
    const nav = page.getByRole('navigation', { name: 'Mobile navigation' });
    await expect(nav).toBeVisible();
    await nav.getByRole('link', { name: 'Settings' }).click();
    await expect(page.getByRole('heading', { name: 'Profile and settings' })).toBeVisible();
    await page.goto('/dashboard');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.getByRole('button', { name: 'Join meeting' }).click();
  await page.getByLabel('Invitation link or room code').fill('bad-code');
  await page.getByRole('button', { name: 'Open preview' }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Enter a valid');
  await page.getByLabel('Invitation link or room code').fill('wbify-preview-12345678-abcd');
  await page.getByRole('button', { name: 'Open preview' }).click();
  await expect(page).toHaveURL(/room\/wbify-preview-12345678-abcd/);
  await page.goto('/room/invalid');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
});
