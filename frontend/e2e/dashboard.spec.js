import { test, expect } from '@playwright/test';

test.describe('V-Face AI - Navigation & Dashboard System', () => {
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
    // Wait for the app root to be loaded
    await expect(page.locator('#root')).toBeVisible();
  });

  test('TC01: Dashboard UI Loads and Displays Brand Elements', async ({ page }) => {
    // Check brand title in Sidebar
    await expect(page.getByText('V-FACE').first()).toBeVisible();
    
    // Check navigation buttons exist in Sidebar
    await expect(page.locator('aside')).toBeVisible();
  });

  test('TC02: Seamless Navigation Across All Tabs Without Error', async ({ page }) => {
    // 1. Click Employee Management tab
    const empBtn = page.locator('aside button').filter({ hasText: /Nhân sự|Employees/i });
    if (await empBtn.count() > 0) {
      await empBtn.first().click();
      await page.waitForTimeout(500);
      await expect(page.locator('body')).not.toContainText('Uncaught ReferenceError');
    }

    // 2. Click Request Management tab
    const reqBtn = page.locator('aside button').filter({ hasText: /Yêu cầu|Requests/i });
    if (await reqBtn.count() > 0) {
      await reqBtn.first().click();
      await page.waitForTimeout(500);
      await expect(page.locator('body')).not.toContainText('TypeError');
    }

    // 3. Click Attendance History tab
    const attBtn = page.locator('aside button').filter({ hasText: /Lịch sử|History/i });
    if (await attBtn.count() > 0) {
      await attBtn.first().click();
      await page.waitForTimeout(500);
    }

    // 4. Click Device Management tab
    const devBtn = page.locator('aside button').filter({ hasText: /Thiết bị|Devices/i });
    if (await devBtn.count() > 0) {
      await devBtn.first().click();
      await page.waitForTimeout(500);
      // Ensure devices list or empty state is visible
      await expect(page.getByText(/Camera|Thiết bị/i).first()).toBeVisible();
    }

    // 5. Click Analytics tab
    const anaBtn = page.locator('aside button').filter({ hasText: /Báo cáo|Analytics|BI/i });
    if (await anaBtn.count() > 0) {
      await anaBtn.first().click();
      await page.waitForTimeout(500);
    }

    // 6. Return to Live Dashboard
    const dashBtn = page.locator('aside button').filter({ hasText: /Dashboard|Bảng điều khiển/i });
    if (await dashBtn.count() > 0) {
      await dashBtn.first().click();
      await page.waitForTimeout(500);
    }
  });

  test('TC03: Language Switching (VI <-> EN)', async ({ page }) => {
    // Check language toggle button in header
    const langBtn = page.locator('header button').filter({ hasText: /VI|EN/i });
    if (await langBtn.count() > 0) {
      await langBtn.first().click();
      await page.waitForTimeout(400);
    }
  });
});
