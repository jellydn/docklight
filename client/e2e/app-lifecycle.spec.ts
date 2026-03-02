import { test, expect } from '@playwright/test';

test.describe('App Lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/');
    await page.getByLabel(/username/i).fill('admin');
    await page.getByLabel(/password/i).fill('password');
    await page.getByRole('button', { name: /login/i }).click();
    await expect(page).toHaveURL(/\/apps/);
  });

  test('should display apps list', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /apps/i })).toBeVisible();
  });

  test('should create new app', async ({ page }) => {
    await page.getByRole('button', { name: /create app/i }).click();
    await page.getByLabel(/app name/i).fill('test-app');
    await page.getByRole('button', { name: /create/i }).click();
    await expect(page.getByText('test-app')).toBeVisible();
  });

  test('should restart app', async ({ page }) => {
    await page.getByText('test-app').click();
    await page.getByRole('button', { name: /restart/i }).click();
    await expect(page.getByText(/restarted/i)).toBeVisible();
  });

  test('should stop app', async ({ page }) => {
    await page.getByText('test-app').click();
    await page.getByRole('button', { name: /stop/i }).click();
    await expect(page.getByText(/stopped/i)).toBeVisible();
  });

  test('should delete app', async ({ page }) => {
    await page.getByText('test-app').click();
    await page.getByRole('button', { name: /delete/i }).click();
    await page.getByRole('button', { name: /confirm/i }).click();
    await expect(page.getByText('test-app')).not.toBeVisible();
  });
});
