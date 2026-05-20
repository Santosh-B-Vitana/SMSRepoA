/**
 * Admission Creation E2E Test
 * ===========================
 * Validates the full admission application creation flow:
 *   1. Admin logs in (via stored auth state)
 *   2. Navigates to /admissions
 *   3. Clicks "New Application"
 *   4. Fills all 5 steps of the form:
 *        Student Info → Contact → Academic → Parents → Additional
 *   5. Clicks "Submit Application" on the final step
 *   6. Verifies a success toast/message is shown
 *   7. Verifies the new application appears in the list
 *
 * Runs against live backend (localhost:5092) + Vite dev server (localhost:8080).
 * Requires global.setup.ts to have authenticated first.
 */

import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import {
  API_BASE_URL,
  ADMIN_CREDENTIALS,
} from './fixtures/constants';

const __e2eFilename = fileURLToPath(import.meta.url);
const __e2eDirname  = dirname(__e2eFilename);
const AUTH_STATE_FILE = path.join(__e2eDirname, '.auth/admin.json');

// ── Unique per run so reruns don't collide ────────────────────────────────────
const RUN_SUFFIX = Date.now().toString().slice(-6);
const TEST_APPLICANT = {
  firstName:    `E2EFirst${RUN_SUFFIX}`,
  lastName:     `E2ELast${RUN_SUFFIX}`,
  dateOfBirth:  '2010-06-15',
  gender:       'Male',
  email:        `e2e.admission.${RUN_SUFFIX}@test.com`,
  phone:        '9876543210',
  address:      '42 Test Colony, Test City',
  city:         'Delhi',
  state:        'Delhi',
  pincode:      '110001',
  classApplied: '10',
  academicYear: '2025-26',
  fatherName:   `E2EFather${RUN_SUFFIX}`,
};

// ── Auth helpers ──────────────────────────────────────────────────────────────
function getStoredAuthSession(): string | null {
  try {
    const state = JSON.parse(fs.readFileSync(AUTH_STATE_FILE, 'utf-8'));
    const origin = state.origins?.find((o: any) => o.origin === 'http://localhost:8080');
    return origin?.localStorage?.find((item: any) => item.name === 'pw_e2e_auth')?.value ?? null;
  } catch {
    return null;
  }
}

async function injectAuthSession(page: Page): Promise<void> {
  const session = getStoredAuthSession();
  if (session) {
    await page.addInitScript((s) => {
      sessionStorage.setItem('auth_session', s);
    }, session);
  }
}

async function getAuthToken(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    try {
      const raw = sessionStorage.getItem('auth_session');
      if (raw) {
        const s = JSON.parse(raw);
        return s?.token ?? null;
      }
      return localStorage.getItem('authToken');
    } catch {
      return null;
    }
  });
}

// ── Cleanup: delete the test application after the test ───────────────────────
async function deleteTestApplication(page: Page, applicantName: string) {
  const token = await getAuthToken(page);
  if (!token) return;

  const resp = await page.request.get(
    `${API_BASE_URL}/admissions/applications?search=${encodeURIComponent(applicantName)}&pageSize=5`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!resp.ok()) return;

  const body = await resp.json();
  const items = body?.data?.items ?? body?.items ?? [];
  for (const item of items) {
    if ((item.firstName + ' ' + item.lastName) === applicantName ||
        item.studentName === applicantName) {
      await page.request.delete(`${API_BASE_URL}/admissions/applications/${item.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => { /* ignore cleanup errors */ });
    }
  }
}

// ── Helper: fill a visible input by label text ────────────────────────────────
async function fillByLabel(page: Page, labelText: string | RegExp, value: string) {
  const input = page.getByLabel(labelText, { exact: false });
  await input.first().waitFor({ state: 'visible', timeout: 8_000 });
  await input.first().fill(value);
}

// ── Helper: select a value from a shadcn Select component ────────────────────
async function selectByLabel(page: Page, labelText: string | RegExp, value: string) {
  // Click the trigger button associated with the label
  const trigger = page
    .locator('label')
    .filter({ hasText: labelText })
    .locator('~ button, + button, ~ [role="combobox"], + [role="combobox"]')
    .first();

  // Fallback: find button containing the label text nearby
  if (!(await trigger.isVisible().catch(() => false))) {
    const formField = page.locator('[class*="space-y"]').filter({
      has: page.locator('label').filter({ hasText: labelText }),
    }).first();
    await formField.locator('button[role="combobox"], [role="combobox"]').first().click();
  } else {
    await trigger.click();
  }

  await page.getByRole('option', { name: value }).first().click();
}

// ── Test Suite ────────────────────────────────────────────────────────────────
test.describe('Admission Creation — Full Form Flow', () => {
  test.use({ storageState: 'e2e/.auth/admin.json' });

  test.beforeEach(async ({ page }) => {
    await injectAuthSession(page);
  });

  test.afterEach(async ({ page }) => {
    const fullName = `${TEST_APPLICANT.firstName} ${TEST_APPLICANT.lastName}`;
    await deleteTestApplication(page, fullName);
  });

  test('Creates a new admission application through all 5 steps and sees success', async ({ page }) => {
    // ── Navigate to Admissions ────────────────────────────────────────────────
    await page.goto('/admissions');
    await page.waitForLoadState('networkidle');

    // Confirm page loaded
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15_000 });

    // ── Open "New Application" dialog ─────────────────────────────────────────
    const newAppBtn = page.getByRole('button', { name: /new application/i }).first();
    await expect(newAppBtn).toBeVisible({ timeout: 10_000 });
    await newAppBtn.click();

    // Dialog should appear
    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    // Confirm we're on Step 1 "Student Info"
    await expect(dialog.getByText(/student info/i).first()).toBeVisible({ timeout: 8_000 });

    // ── Step 1: Student Info ──────────────────────────────────────────────────
    await fillByLabel(dialog, /first name/i, TEST_APPLICANT.firstName);
    await fillByLabel(dialog, /last name/i, TEST_APPLICANT.lastName);
    await fillByLabel(dialog, /date of birth/i, TEST_APPLICANT.dateOfBirth);

    // Gender select
    const genderTrigger = dialog.locator('button[role="combobox"]').filter({
      hasText: /gender|select/i,
    }).first();
    if (await genderTrigger.isVisible().catch(() => false)) {
      await genderTrigger.click();
      await page.getByRole('option', { name: TEST_APPLICANT.gender }).first().click();
    } else {
      // Try native select
      await dialog.locator('select').filter({ has: dialog.locator('option[value="Male"]') })
        .first().selectOption(TEST_APPLICANT.gender);
    }

    // Click "Next"
    await dialog.getByRole('button', { name: /next/i }).first().click();

    // ── Step 2: Contact ───────────────────────────────────────────────────────
    await expect(dialog.getByText(/contact/i).first()).toBeVisible({ timeout: 8_000 });

    await fillByLabel(dialog, /email/i, TEST_APPLICANT.email);
    await fillByLabel(dialog, /phone/i, TEST_APPLICANT.phone);
    await fillByLabel(dialog, /address/i, TEST_APPLICANT.address);
    await fillByLabel(dialog, /city/i, TEST_APPLICANT.city);
    await fillByLabel(dialog, /state/i, TEST_APPLICANT.state);
    await fillByLabel(dialog, /pincode|pin code|zip/i, TEST_APPLICANT.pincode);

    await dialog.getByRole('button', { name: /next/i }).first().click();

    // ── Step 3: Academic ──────────────────────────────────────────────────────
    await expect(dialog.getByText(/academic/i).first()).toBeVisible({ timeout: 8_000 });

    // Class applied for — try combobox first, then input
    const classCombo = dialog.locator('button[role="combobox"]').first();
    if (await classCombo.isVisible().catch(() => false)) {
      await classCombo.click();
      const classOption = page.getByRole('option', { name: new RegExp(`^${TEST_APPLICANT.classApplied}$`) });
      if (await classOption.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await classOption.click();
      } else {
        await page.getByRole('option').first().click();
      }
    } else {
      await fillByLabel(dialog, /class.*applied|applying for/i, TEST_APPLICANT.classApplied);
    }

    // Academic year
    const yearInput = dialog.getByLabel(/academic year/i, { exact: false }).first();
    if (await yearInput.isVisible().catch(() => false)) {
      await yearInput.fill(TEST_APPLICANT.academicYear);
    }

    await dialog.getByRole('button', { name: /next/i }).first().click();

    // ── Step 4: Parents ───────────────────────────────────────────────────────
    await expect(dialog.getByText(/parent|guardian/i).first()).toBeVisible({ timeout: 8_000 });

    await fillByLabel(dialog, /father.*name|dad.*name/i, TEST_APPLICANT.fatherName);

    await dialog.getByRole('button', { name: /next/i }).first().click();

    // ── Step 5: Additional ────────────────────────────────────────────────────
    await expect(dialog.getByText(/additional/i).first()).toBeVisible({ timeout: 8_000 });

    // Step 5 fields are optional — go straight to submit
    // Submit button text: "Submit Application"
    const submitBtn = dialog.getByRole('button', { name: /submit application/i }).first();
    await expect(submitBtn).toBeVisible({ timeout: 8_000 });
    await submitBtn.click();

    // ── Assert: success message shown ────────────────────────────────────────
    // The form calls onSuccess() which closes the dialog and shows a toast
    const successIndicator = page.locator(
      '[role="status"], [data-sonner-toast], [class*="toast"], [class*="Toast"]'
    ).filter({ hasText: /application|submitted|success/i }).first();

    await expect(successIndicator).toBeVisible({ timeout: 20_000 });

    // ── Assert: dialog closed ─────────────────────────────────────────────────
    await expect(dialog).not.toBeVisible({ timeout: 10_000 });

    // ── Assert: application appears in the list ───────────────────────────────
    // Re-load or wait for list to refresh
    const fullName = `${TEST_APPLICANT.firstName} ${TEST_APPLICANT.lastName}`;
    const studentCell = page.getByText(fullName, { exact: false });
    await expect(studentCell.first()).toBeVisible({ timeout: 15_000 });
  });
});
