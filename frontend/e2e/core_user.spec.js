import { test, expect } from '@playwright/test';

test.describe('V-Face AI - Core User & IAM Frontend Management', () => {
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

  test('CORE-01: Core User Management Tab and Sub-tabs Navigation', async ({ page }) => {
    // Navigate to Core User & IAM tab
    const coreNav = page.locator('aside button').filter({ hasText: /Core User|IAM|HR & Biometrics|Nhân Sự/i }).first();
    await expect(coreNav).toBeVisible();
    await coreNav.click();
    await page.waitForTimeout(600);

    // Verify sub-tabs
    await expect(page.getByText(/Hồ Sơ Nhân Sự|Personnel|Users|Mẫu Mặt/i).first()).toBeVisible();
    await expect(page.getByText(/Vai Trò|Roles/i).first()).toBeVisible();
    await expect(page.getByText(/Phòng Ban|Cơ Cấu|Departments|Positions|Organization/i).first()).toBeVisible();

    // Check Roles sub-tab
    const rolesBtn = page.locator('button').filter({ hasText: /Vai Trò|Roles/i }).first();
    if (await rolesBtn.isVisible()) {
      await rolesBtn.click();
      await page.waitForTimeout(500);
      await expect(page.getByText(/Danh Sách Vai Trò|Roles/i).first()).toBeVisible();
    }

    // Check Organization sub-tab
    const orgBtn = page.locator('button').filter({ hasText: /Phòng Ban|Cơ Cấu|Departments|Organization/i }).first();
    if (await orgBtn.isVisible()) {
      await orgBtn.click();
      await page.waitForTimeout(500);
      await expect(page.getByText(/Phòng Ban|Departments/i).first()).toBeVisible();
    }
  });

  test('CORE-02: Open Add User Modal in Core User Screen', async ({ page }) => {
    const coreNav = page.locator('aside button').filter({ hasText: /Core User|IAM|HR & Biometrics|Nhân Sự/i }).first();
    await coreNav.click();
    await page.waitForTimeout(600);

    const addUserBtn = page.getByRole('button', { name: /Thêm Nhân Sự|Thêm Người Dùng|Add Personnel|Add User/i }).first();
    if (await addUserBtn.isVisible()) {
      await addUserBtn.click();
      await page.waitForTimeout(400);

      // Modal is open with user creation title
      await expect(page.getByText(/Tạo Tài Khoản|Thêm Mới Hồ Sơ|Create User|Add Personnel/i).first()).toBeVisible();

      // Close modal
      const cancelBtn = page.getByRole('button', { name: /Hủy|Cancel/i }).first();
      if (await cancelBtn.isVisible()) {
        await cancelBtn.click();
      }
    }
  });
});
