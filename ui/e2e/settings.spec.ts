/**
 * Settings Page — End-to-End Test Suite
 * =========================================================================
 * Verifies that the Settings page is production-ready for admin users:
 *
 * PHASE 1 — Page structure:    Correct tabs present, Notifications tab absent
 * PHASE 2 — School tab:        School name populated from entity, identity
 *                               fields read-only for admin, contact editable
 * PHASE 3 — Profile tab:       Form renders and save is functional
 * PHASE 4 — Security tab:      Password mismatch / too-short validation fires
 * PHASE 5 — Appearance tab:    Theme switcher renders correctly
 *
 * Auth strategy:   Reads stored token from .auth/admin.json (global.setup.ts)
 * Backend target:  VITE_API_BASE_URL
 * Frontend target: PLAYWRIGHT_BASE_URL
 *
 * Run: npx playwright test e2e/settings.spec.ts
 */

import { test, expect, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const UI_BASE   = '';
const API_BASE  = process.env.VITE_API_BASE_URL ?? '';
const AUTH_FILE = path.join(__dirname, '.auth/admin.json');

// ── Auth helpers ───────────────────────────────────────────────────────────

async function injectAuth(page: Page): Promise<void> {
  try {
    if (!fs.existsSync(AUTH_FILE)) return;
    const data = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
    const entry = data.origins?.[0]?.localStorage?.find(
      (e: { name: string }) => e.name === 'pw_e2e_auth'
    );
    if (!entry?.value) return;
    await page.addInitScript((s: string) => {
      try { sessionStorage.setItem('auth_session', s); } catch { /* ignore */ }
    }, entry.value);
  } catch { /* ignore */ }
}

// ── Test suite ─────────────────────────────────────────────────────────────

test.describe('Settings — production readiness', () => {

  test.beforeEach(async ({ page }) => {
    await injectAuth(page);
    await page.goto(`${UI_BASE}/settings`, { waitUntil: 'networkidle' });
    // Wait for the tabs to appear
    await page.waitForSelector('[role="tablist"]', { timeout: 15_000 });
  });

  // ── Phase 1: Page structure ───────────────────────────────────────────────

  test('has correct tabs and no Notifications tab', async ({ page }) => {
    // Query tabs directly on the page (avoids ambiguous tablist.first())
    await expect(page.getByRole('tab', { name: /profile/i }).first()).toBeVisible();
    await expect(page.getByRole('tab', { name: /security/i }).first()).toBeVisible();
    await expect(page.getByRole('tab', { name: /appearance/i }).first()).toBeVisible();
    await expect(page.getByRole('tab', { name: /school/i }).first()).toBeVisible();
    await expect(page.getByRole('tab', { name: /academic/i }).first()).toBeVisible();

    // Notifications tab must NOT exist
    const notifTabs = await page.getByRole('tab', { name: /notifications/i }).count();
    expect(notifTabs).toBe(0);
  });

  // ── Phase 2: School tab ───────────────────────────────────────────────────

  test('school tab shows school name from entity', async ({ page }) => {
    await page.getByRole('tab', { name: /school/i }).click();
    await page.waitForLoadState('networkidle');

    // School name should be populated — not blank
    // For admin: name appears in the read-only identity card, not in an editable input
    const schoolCard = page.locator('[class*="muted"]').filter({ hasText: /vitana|school/i });
    // Alternatively look for the identity block text
    const pageText = await page.locator('body').textContent();
    expect(pageText).toMatch(/vitana/i);
  });

  test('school tab: identity fields are read-only for admin', async ({ page }) => {
    await page.getByRole('tab', { name: /school/i }).click();
    await page.waitForLoadState('networkidle');

    // The School Name input must NOT be present (admin sees read-only card)
    const schoolNameInput = page.locator('input#schoolName');
    await expect(schoolNameInput).toHaveCount(0);

    // The School Type select must NOT be present
    const schoolTypeSelect = page.locator('#schoolType');
    await expect(schoolTypeSelect).toHaveCount(0);

    // "Contact your super administrator" message should appear
    await expect(page.getByText(/contact your super administrator/i)).toBeVisible();
  });

  test('school tab: contact fields are editable for admin', async ({ page }) => {
    await page.getByRole('tab', { name: /school/i }).click();
    await page.waitForLoadState('networkidle');

    // These fields should be editable inputs
    await expect(page.locator('input#schoolPhone')).toBeVisible();
    await expect(page.locator('input#schoolEmail')).toBeVisible();
    await expect(page.locator('textarea#schoolAddress')).toBeVisible();
    await expect(page.locator('input#schoolWebsite')).toBeVisible();

    // Save button exists
    await expect(page.getByRole('button', { name: /save changes/i })).toBeVisible();
  });

  test('school tab: save contact fields calls PATCH endpoint', async ({ page }) => {
    await page.getByRole('tab', { name: /school/i }).click();
    await page.waitForLoadState('networkidle');

    // Intercept the PATCH call
    const patchPromise = page.waitForRequest(
      (req) => req.url().includes('/settings/school/') && req.url().includes('/contact') && req.method() === 'PATCH',
      { timeout: 10_000 }
    );

    const phoneInput = page.locator('input#schoolPhone');
    // Wait for the component to finish loading data from the API before interacting
    await expect(phoneInput).toBeVisible();
    await page.waitForTimeout(400);
    await phoneInput.fill('+91 98765 43210');
    await expect(phoneInput).toHaveValue('+91 98765 43210');

    await page.getByRole('button', { name: /save changes/i }).click();

    const patchReq = await patchPromise;
    expect(patchReq).toBeTruthy();
    const body = JSON.parse(patchReq.postData() ?? '{}');
    expect(body.phone).toBe('+91 98765 43210');
  });

  // ── Phase 3: Profile tab ──────────────────────────────────────────────────

  test('profile tab renders with avatar and save button', async ({ page }) => {
    // Profile tab is active by default
    await expect(page.getByRole('heading', { name: /profile information/i })).toBeVisible();

    // Avatar initials block (the large 64×64 rounded div in the profile card)
    await expect(page.locator('.h-16.w-16.rounded-full').first()).toBeVisible();

    // Name fields
    await expect(page.locator('input#firstName')).toBeVisible();
    await expect(page.locator('input#lastName')).toBeVisible();
    await expect(page.locator('input#phone')).toBeVisible();

    // Email is disabled
    const emailInput = page.locator('input#profileEmail');
    await expect(emailInput).toBeDisabled();

    // Save button
    await expect(page.getByRole('button', { name: /save changes/i })).toBeVisible();
  });

  test('profile tab: save dispatches bulkUpdate API call', async ({ page }) => {
    const reqPromise = page.waitForRequest(
      (req) => req.url().includes('/settings/bulk') && req.method() === 'POST',
      { timeout: 10_000 }
    );

    const firstName = page.locator('input#firstName');
    await firstName.fill('TestAdmin');
    await page.getByRole('button', { name: /save changes/i }).click();

    const req = await reqPromise;
    expect(req).toBeTruthy();
    const body = JSON.parse(req.postData() ?? '{}');
    expect(body.userSettings?.some((s: { settingKey: string }) => s.settingKey === 'profile_first_name')).toBe(true);
  });

  // ── Phase 4: Security tab ─────────────────────────────────────────────────

  test('security tab: password mismatch shows error, does not call API', async ({ page }) => {
    await page.getByRole('tab', { name: /security/i }).click();

    const current = page.locator('input#currentPw');
    const newPw   = page.locator('input#newPw');
    const confirm = page.locator('input#confirmPw');

    await current.fill('anypassword');
    await newPw.fill('NewPass123!');
    await confirm.fill('DifferentPass!');

    // Mismatch warning visible
    await expect(page.getByText(/passwords do not match/i)).toBeVisible();

    // Clicking save should NOT fire an API request (client-side guard)
    let apiCalled = false;
    page.on('request', (req) => {
      if (req.url().includes('/auth/change-password')) apiCalled = true;
    });
    await page.getByRole('button', { name: /save changes/i }).click();
    await page.waitForTimeout(1000);
    expect(apiCalled).toBe(false);
  });

  test('security tab: short password toasts error', async ({ page }) => {
    await page.getByRole('tab', { name: /security/i }).click();

    await page.locator('input#currentPw').fill('anypassword');
    await page.locator('input#newPw').fill('short');
    await page.locator('input#confirmPw').fill('short');

    await page.getByRole('button', { name: /save changes/i }).click();

    // Toast error should appear
    await expect(page.getByText(/at least 8 characters/i)).toBeVisible({ timeout: 5_000 });
  });

  // ── Phase 5: Appearance tab ───────────────────────────────────────────────

  test('appearance tab: theme switcher has 3 options', async ({ page }) => {
    await page.getByRole('tab', { name: /appearance/i }).click();

    await expect(page.getByRole('button', { name: /light/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /dark/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /system/i })).toBeVisible();
  });

  test('appearance tab: language selector is present', async ({ page }) => {
    await page.getByRole('tab', { name: /appearance/i }).click();

    // Language combobox should be visible (value is "English" by default)
    await expect(page.getByRole('combobox').first()).toBeVisible();
  });

  // ── Phase 6: API health check ─────────────────────────────────────────────

  test('GET /settings/school/me returns school name', async ({ request }) => {
    // Get token from auth file
    let token = '';
    try {
      const data = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
      for (const origin of data.origins ?? []) {
        for (const entry of origin.localStorage ?? []) {
          if (entry.name === 'pw_e2e_auth') {
            const session = JSON.parse(entry.value);
            token = session?.token ?? '';
          }
        }
      }
    } catch { /* ignore */ }

    if (!token) {
      test.skip(true, 'No auth token available — run global setup first');
      return;
    }

    const res = await request.get(`${API_BASE}/settings/school/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    // The API wraps responses: { success, statusCode, data: { name, ... } }
    const schoolData = body.data ?? body;
    expect(schoolData.name).toBeTruthy();
    expect(typeof schoolData.name).toBe('string');
    // Confirm it's "Vitana Schools" (or non-empty at minimum)
    console.log(`✓ School name from API: "${schoolData.name}"`);
  });

});
