import { test, expect } from '@playwright/test';

// Regex detects Vietnamese specific letters (có dấu tiếng Việt)
// Ví dụ: à, á, ả, ã, ạ, ă, ắ, ằ, ẳ, ẵ, ặ, â, ấ, ầ, ẩ, ẫ, ậ, đ, è, é, ẻ, ẽ, ẹ, ê, ế, ề, ể, ễ, ệ, ì, í, ỉ, ĩ, ị, ò, ó, ỏ, õ, ọ, ô, ố, ồ, ổ, ỗ, ộ, ơ, ớ, ờ, ở, ỡ, ợ, ù, ú, ủ, ũ, ụ, ư, ứ, ừ, ử, ữ, ự, kỳ, ...
const VIETNAMESE_ACCENT_REGEX = /[àáảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ]/i;

// Words strictly Vietnamese that might not have accents
const VIETNAMESE_KEYWORD_REGEX = /\b(chấm công|nhân viên|quản lý|phòng ban|thiết bị|lịch sử|báo cáo|thêm mới|hành động|chỉnh sửa|xóa|đăng ký|thành công|thất bại|trực tuyến|tạm dừng)\b/i;

test.describe('V-Face AI - English Localization Integrity Test', () => {
  test.beforeEach(async ({ page }) => {
    // Set localStorage language to English and inject auth session before loading
    await page.addInitScript(() => {
      localStorage.setItem('vface_lang', 'en');
      localStorage.setItem('vface_access_token', 'mock_jwt_session');
      localStorage.setItem('vface_user_profile', JSON.stringify({
        id: '1d8000',
        username: 'admin',
        full_name: 'System Administrator',
        roles: ['superadmin'],
      }));
    });
    await page.goto('/');
    await expect(page.locator('#root')).toBeVisible();
  });

  test('TC-I18N-01: Header and Navigation in EN Mode Must NOT Contain Vietnamese Text', async ({ page }) => {
    // 1. Check Header texts
    const header = page.locator('header');
    const headerText = (await header.innerText()) || '';
    
    // Header should not contain Vietnamese accented characters
    expect(
      VIETNAMESE_ACCENT_REGEX.test(headerText),
      `Header in EN mode contains Vietnamese text: "${headerText}"`
    ).toBeFalsy();

    // 2. Check Sidebar navigation tabs
    const sidebar = page.locator('aside');
    const sidebarText = (await sidebar.innerText()) || '';
    
    expect(
      VIETNAMESE_ACCENT_REGEX.test(sidebarText),
      `Sidebar navigation in EN mode contains Vietnamese text: "${sidebarText}"`
    ).toBeFalsy();

    expect(
      VIETNAMESE_KEYWORD_REGEX.test(sidebarText),
      `Sidebar contains untranslated Vietnamese keywords: "${sidebarText}"`
    ).toBeFalsy();
  });

  test('TC-I18N-02: Realtime Dashboard in EN Mode Contains No Vietnamese UI Text', async ({ page }) => {
    const dashNav = page.locator('aside button').filter({ hasText: /Dashboard|Live/i }).first();
    await dashNav.click();
    await page.waitForTimeout(400);

    // Extract UI text from main container (ignoring dynamic user/employee names from DB if any)
    const mainContent = page.locator('main');
    const mainText = (await mainContent.innerText()) || '';

    // Check standard titles, headers, badges
    expect(
      VIETNAMESE_KEYWORD_REGEX.test(mainText),
      `Dashboard UI in EN mode contains untranslated Vietnamese keywords: "${mainText}"`
    ).toBeFalsy();
  });

  test('TC-I18N-03: Device Management Screen & Modals in EN Mode Have Pure English UI', async ({ page }) => {
    // Navigate to Devices Tab
    const devNav = page.locator('aside button').filter({ hasText: /Devices/i }).first();
    await devNav.click();
    await page.waitForTimeout(500);

    const devHeader = page.locator('main h1, main h2').first();
    const devHeaderText = (await devHeader.innerText()) || '';
    
    expect(
      VIETNAMESE_ACCENT_REGEX.test(devHeaderText),
      `Devices header in EN mode contains Vietnamese diacritics: "${devHeaderText}"`
    ).toBeFalsy();

    // Open Add Camera Modal
    const addBtn = page.getByRole('button', { name: /Add Camera/i }).first();
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await page.waitForTimeout(300);

      const modal = page.locator('form');
      const modalText = (await modal.innerText()) || '';

      // Check modal labels (Camera Name, RTSP URL, Location, Purpose, Save, Cancel)
      expect(
        VIETNAMESE_ACCENT_REGEX.test(modalText),
        `Add Camera Modal in EN mode contains Vietnamese text: "${modalText}"`
      ).toBeFalsy();

      // Close modal
      const cancelBtn = page.getByRole('button', { name: /Cancel/i }).first();
      if (await cancelBtn.isVisible()) {
        await cancelBtn.click();
      }
    }
  });

  test('TC-I18N-04: Employee Management & Request Management in EN Mode', async ({ page }) => {
    // 1. Employees Tab
    const empNav = page.locator('aside button').filter({ hasText: /Employees/i }).first();
    if (await empNav.isVisible()) {
      await empNav.click();
      await page.waitForTimeout(400);

      const empContent = page.locator('main');
      const empText = (await empContent.innerText()) || '';
      expect(
        VIETNAMESE_KEYWORD_REGEX.test(empText),
        `Employees screen in EN mode contains untranslated Vietnamese keywords`
      ).toBeFalsy();
    }

    // 2. Requests Tab
    const reqNav = page.locator('aside button').filter({ hasText: /Requests/i }).first();
    if (await reqNav.isVisible()) {
      await reqNav.click();
      await page.waitForTimeout(400);

      const reqContent = page.locator('main');
      const reqText = (await reqContent.innerText()) || '';
      expect(
        VIETNAMESE_KEYWORD_REGEX.test(reqText),
        `Requests screen in EN mode contains untranslated Vietnamese keywords`
      ).toBeFalsy();
    }
  });

  test('TC-I18N-05: Core User & IAM Screen in EN Mode Must NOT Contain Vietnamese Text', async ({ page }) => {
    const coreNav = page.locator('aside button').filter({ hasText: /Core User|IAM/i }).first();
    if (await coreNav.isVisible()) {
      await coreNav.click();
      await page.waitForTimeout(500);

      const coreContent = page.locator('main');
      const coreText = (await coreContent.innerText()) || '';
      expect(
        VIETNAMESE_KEYWORD_REGEX.test(coreText),
        `Core User screen in EN mode contains untranslated Vietnamese keywords: "${coreText.slice(0, 100)}..."`
      ).toBeFalsy();
    }
  });
});
