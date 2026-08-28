import { test, expect } from '@playwright/test';

test.describe('V-Face AI - System Health & API Status Inspection', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('vface_access_token', 'mock_jwt_session');
      localStorage.setItem('vface_user_profile', JSON.stringify({
        id: '1d8000',
        username: 'admin',
        full_name: 'System Administrator',
        roles: ['superadmin'],
      }));
    });
    await page.goto('/');
  });

  test('HEALTH-01: System Health Dashboard displays all microservices', async ({ page }) => {
    // Navigate to Health tab
    const healthNav = page.locator('aside button').filter({ hasText: /API|Health|Kiểm tra/i }).first();
    await expect(healthNav).toBeVisible();
    await healthNav.click();
    await page.waitForTimeout(600);

    // Verify System Health overview cards
    await expect(page.getByText(/Microservices|Face AI Attendance API|Core User/i).first()).toBeVisible();

    // Check Backend 8000 and Core User 8001
    await expect(page.getByText('Port 8000').first()).toBeVisible();
    await expect(page.getByText('Port 8001').first()).toBeVisible();

    // Ensure Swagger Docs link is present
    const swaggerLink = page.getByRole('link', { name: /Swagger Docs/i }).first();
    await expect(swaggerLink).toBeVisible();
  });
});
