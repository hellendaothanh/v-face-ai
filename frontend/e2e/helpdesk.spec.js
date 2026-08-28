import { test, expect } from '@playwright/test';

test.describe('ITIL Helpdesk & Knowledge Base (KB) Module Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('vface_access_token', 'mock_jwt_session');
      localStorage.setItem(
        'vface_user_profile',
        JSON.stringify({
          id: '1d8000',
          username: 'admin',
          full_name: 'System Administrator',
          roles: ['superadmin'],
        })
      );
    });
    await page.goto('/');
    await expect(page.locator('#root')).toBeVisible();
  });

  test('TC-HD-01: Navigate to Helpdesk & Service Desk Tab', async ({ page }) => {
    // 1. Click on Helpdesk tab in sidebar
    const helpdeskNav = page.locator('aside button').filter({ hasText: /Helpdesk|Service Desk/i }).first();
    await expect(helpdeskNav).toBeVisible();
    await helpdeskNav.click();
    await page.waitForTimeout(400);

    // 2. Verify Helpdesk Header & Sub-tabs
    const headerTitle = page.locator('header');
    await expect(headerTitle).toContainText(/Helpdesk|Service Desk/i);

    const main = page.locator('main');
    await expect(main.getByRole('button', { name: /Tickets Roster|Danh Sách Yêu Cầu/i }).first()).toBeVisible();
    await expect(main.getByRole('button', { name: /Knowledge Base|Cơ Sở Tri Thức|KB/i }).first()).toBeVisible();
    await expect(main.getByRole('button', { name: /Submit Incident|Gửi Sự Cố|Tạo Ticket/i }).first()).toBeVisible();
  });

  test('TC-HD-02: Search & Read Knowledge Base (KB) Article', async ({ page }) => {
    const helpdeskNav = page.locator('aside button').filter({ hasText: /Helpdesk|Service Desk/i }).first();
    await helpdeskNav.click();
    await page.waitForTimeout(400);

    // Click KB Subtab
    const kbTab = page.locator('main button').filter({ hasText: /Knowledge Base|Cơ Sở Tri Thức|KB/i }).first();
    await kbTab.click();
    await page.waitForTimeout(400);

    // Search input should be visible
    const searchInput = page.locator('input[placeholder*="Search solutions"], input[placeholder*="Tìm kiếm"]').first();
    await expect(searchInput).toBeVisible();
  });

  test('TC-HD-03: Advanced KB Article Create Modal & Markdown Toolbar', async ({ page }) => {
    const helpdeskNav = page.locator('aside button').filter({ hasText: /Helpdesk|Service Desk/i }).first();
    await helpdeskNav.click();
    await page.waitForTimeout(400);

    // Click KB Subtab
    const kbTab = page.locator('main button').filter({ hasText: /Knowledge Base|Cơ Sở Tri Thức|KB/i }).first();
    await kbTab.click();
    await page.waitForTimeout(400);

    // Click Add Article button
    const addBtn = page.getByRole('button', { name: /Thêm Bài Viết|Write New Article|New Article/i }).first();
    await expect(addBtn).toBeVisible();
    await addBtn.click();
    await page.waitForTimeout(300);

    // Verify Modal & Markdown formatting buttons
    const modal = page.locator('div.fixed.inset-0');
    await expect(modal).toBeVisible();
    await expect(modal.getByRole('button', { name: /Bold/i })).toBeVisible();
    await expect(modal.getByRole('button', { name: /Code/i })).toBeVisible();
    await expect(modal.getByRole('button', { name: /Note/i })).toBeVisible();
    await expect(modal.getByRole('button', { name: /Warning/i })).toBeVisible();

    // Close modal
    const cancelBtn = modal.getByRole('button', { name: /Hủy|Cancel/i }).first();
    await cancelBtn.click();
    await expect(modal).not.toBeVisible();
  });

  test('TC-HD-04: AI Helpdesk Agent Auto-Resolution & Timeline Diagnostics', async ({ page }) => {
    const helpdeskNav = page.locator('aside button').filter({ hasText: /Helpdesk|Service Desk/i }).first();
    await helpdeskNav.click();
    await page.waitForTimeout(400);

    // Verify tickets exist and click the first ticket to open details
    const firstTicketRow = page.locator('tbody tr').first();
    await expect(firstTicketRow).toBeVisible();
    await firstTicketRow.click();
    await page.waitForTimeout(400);

    // Verify AI re-diagnose button is present in the discussion timeline
    const reDiagnoseBtn = page.getByRole('button', { name: /Yêu cầu AI|AI Chẩn Đoán|Re-diagnosis|AI/i }).first();
    await expect(reDiagnoseBtn).toBeVisible();
  });
});
