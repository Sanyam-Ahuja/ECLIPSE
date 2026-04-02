import { test, expect } from '@playwright/test';

test.describe('Marketing & Auth Navigation', () => {
  test('landing page renders correctly', async ({ page }) => {
    await page.goto('/');
    
    // Check main value prop
    await expect(page.getByText(/The unified Compute network/i)).toBeVisible();
    
    // Check call to actions
    await expect(page.getByRole('link', { name: /Start Computing/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /View Pricing/i })).toBeVisible();
  });

  test('pricing page renders correctly', async ({ page }) => {
    await page.goto('/pricing');
    
    await expect(page.getByText(/Compute cost, crushed/i)).toBeVisible();
    await expect(page.getByText(/Standard Compute/i)).toBeVisible();
    await expect(page.getByText(/Accelerated GPU/i)).toBeVisible();
  });

  test('login page has continue with google', async ({ page }) => {
    await page.goto('/login');
    
    // We expect the Continue with Google button
    await expect(page.getByRole('button', { name: /Continue with Google/i })).toBeVisible();
  });
});
