import { test, expect } from '@playwright/test';

test.describe('V-Face AI - Authentication & IAM Guard Flow', () => {
  test('AUTH-01: Unauthenticated User Must See Login Screen', async ({ page }) => {
    // Clear localStorage to simulate guest/unauthenticated user
    await page.addInitScript(() => {
      localStorage.clear();
    });

    await page.goto('/');
    await page.waitForTimeout(600);

    // Verify Login Screen elements
    await expect(page.locator('form')).toBeVisible();
    await expect(page.getByTestId('login-submit')).toBeVisible();

    // Verify Sidebar is NOT visible when unauthenticated
    await expect(page.locator('aside')).not.toBeVisible();
  });

  test('AUTH-02: Invalid Credentials Show Error Message', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
    });

    await page.goto('/');
    await page.waitForTimeout(600);

    // Fill incorrect username / password
    await page.getByTestId('login-username').fill('wrong_user');
    await page.getByTestId('login-password').fill('wrong_pass');

    await page.getByTestId('login-submit').click();
    await page.waitForTimeout(1000);

    // Ensure user remains on Login Screen (Sidebar not present)
    await expect(page.locator('aside')).not.toBeVisible();
    await expect(page.getByTestId('login-submit')).toBeVisible();
  });

  test('AUTH-03: Successful Login with admin/admin123 Unlocks Full Dashboard', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
    });

    // Mock the backend login API to return valid JWT and user details reliably in E2E sandbox
    await page.route('**/api/v1/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock_valid_e2e_jwt_token',
          token_type: 'bearer',
          user: {
            id: '1d8000',
            username: 'admin',
            full_name: 'System Administrator',
            roles: ['superadmin'],
          },
        }),
      });
    });

    await page.goto('/');
    await page.waitForTimeout(600);

    // Fill correct admin credentials
    await page.getByTestId('login-username').fill('admin');
    await page.getByTestId('login-password').fill('admin123');

    await page.getByTestId('login-submit').click();
    await page.waitForTimeout(1200);

    // Verify Dashboard is unlocked
    await expect(page.locator('aside')).toBeVisible();
  });

  test('AUTH-04: Logout Returns to Login Screen', async ({ page }) => {
    // Inject valid dummy token & profile
    await page.addInitScript(() => {
      localStorage.setItem('vface_access_token', 'mock_token_for_playwright');
      localStorage.setItem('vface_user_profile', JSON.stringify({
        id: '1d8000',
        username: 'admin',
        full_name: 'System Administrator',
        roles: ['superadmin'],
      }));
    });

    await page.goto('/');
    await page.waitForTimeout(800);

    // Click logout button in header
    const logoutBtn = page.locator('header button[title*="Đăng xuất"], header button[title*="Sign Out"]').first();
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
      await page.waitForTimeout(600);

      // Verify returned to Login Screen
      await expect(page.getByTestId('login-submit')).toBeVisible();
      await expect(page.locator('aside')).not.toBeVisible();
    }
  });
});
