import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /login/i })).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel(/username/i).fill('invalid');
    await page.getByLabel(/password/i).fill('wrong');
    await page.getByRole('button', { name: /login/i }).click();
    await expect(page.getByText(/invalid credentials/i)).toBeVisible();
  });

  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel(/username/i).fill('admin');
    await page.getByLabel(/password/i).fill('password');
    await page.getByRole('button', { name: /login/i }).click();
    await expect(page).toHaveURL(/\/apps/);
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/');
    await page.getByLabel(/username/i).fill('admin');
    await page.getByLabel(/password/i).fill('password');
    await page.getByRole('button', { name: /login/i }).click();
    await expect(page).toHaveURL(/\/apps/);
    
    // Logout
    await page.getByRole('button', { name: /logout/i }).click();
    await expect(page).toHaveURL('/');
  });
});
