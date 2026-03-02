import { test, expect } from '@playwright/test';

test.describe('Config Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to an app
    await page.goto('/');
    await page.getByLabel(/username/i).fill('admin');
    await page.getByLabel(/password/i).fill('password');
    await page.getByRole('button', { name: /login/i }).click();
    await expect(page).toHaveURL(/\/apps/);
  });

  test('should set environment variable', async ({ page }) => {
    await page.getByText('test-app').click();
    await page.getByRole('tab', { name: /config/i }).click();
    await page.getByLabel(/key/i).fill('NODE_ENV');
    await page.getByLabel(/value/i).fill('production');
    await page.getByRole('button', { name: /set/i }).click();
    await expect(page.getByText('NODE_ENV')).toBeVisible();
    await expect(page.getByText('production')).toBeVisible();
  });

  test('should unset environment variable', async ({ page }) => {
    await page.getByText('test-app').click();
    await page.getByRole('tab', { name: /config/i }).click();
    await page.getByText('NODE_ENV').hover();
    await page.getByRole('button', { name: /delete/i }).click();
    await expect(page.getByText('NODE_ENV')).not.toBeVisible();
  });
});
