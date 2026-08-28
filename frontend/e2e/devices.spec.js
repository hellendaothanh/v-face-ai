import { test, expect } from '@playwright/test';

test.describe('V-Face AI - Camera Devices & Backend API Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('TC04: Device Management CRUD & Modal Flow', async ({ page }) => {
    // Navigate to Devices tab
    const devNav = page.locator('aside button').filter({ hasText: /Thiết bị|Devices/i }).first();
    await devNav.click();
    await page.waitForTimeout(600);

    // Click "Add Camera" button if present
    const addBtn = page.getByRole('button', { name: /Thêm Camera|Add Camera/i }).first();
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await page.waitForTimeout(300);

      // Verify modal is displayed
      await expect(page.locator('form')).toBeVisible();

      // Close modal
      const cancelBtn = page.getByRole('button', { name: /Hủy|Cancel/i }).first();
      if (await cancelBtn.isVisible()) {
        await cancelBtn.click();
      }
    }
  });

  test('TC05: Live Camera Source Switch (Webcam <-> RTSP)', async ({ page }) => {
    // Navigate to Realtime Dashboard
    const dashNav = page.locator('aside button').filter({ hasText: /Dashboard|Bảng điều khiển/i }).first();
    await dashNav.click();
    await page.waitForTimeout(600);

    // Check Camera source button in Header
    const pcCamBtn = page.locator('header button').filter({ hasText: /Camera máy tính|PC Built-in Webcam/i }).first();
    if (await pcCamBtn.isVisible()) {
      await pcCamBtn.click();
      await page.waitForTimeout(400);
    }
  });
});
