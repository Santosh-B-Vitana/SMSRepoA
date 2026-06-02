/**
 * Academic Setup E2E Test Suite — Industry-Grade
 * ================================================
 *
 * Tests the full academic setup flow:
 *
 *  PHASE 1 — Academic Year
 *    1. Navigate to Academic Setup
 *    2. Create academic year "2026-2027"
 *    3. Verify it appears in the list
 *    4. Set "2026-2027" as the current year
 *    5. Verify the nav header dropdown reflects the new current year
 *
 *  PHASE 2 — Class Management
 *    6. Navigate to Classes tab
 *    7. Create "Class 12" in academic year 2026-2027
 *    8. Verify it appears in the list
 *
 *  PHASE 3 — Section Management
 *    9. Open Class 12 detail page
 *   10. Create sections A and B under Class 12
 *   11. Verify sections appear in class detail
 *   12. Verify Section A has student management UI
 *
 *  PHASE 4 — Academic Year Nav Dropdown
 *   13. Verify year dropdown is visible
 *   14. Select a year from dropdown → updates display
 *   15. Verify selection persists across page navigations
 *
 *  PHASE 5 — API smoke tests (fast, no auth UI needed)
 *
 * Auth injection pattern matches staff-enrollment-v2.spec.ts (proven working).
 * Runs against live backend (VITE_API_BASE_URL) + Vite dev server (PLAYWRIGHT_BASE_URL).
 */

import { test, expect, type Page, type APIRequestContext } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ── Constants ─────────────────────────────────────────────────────────────────

const API_BASE = process.env.VITE_API_BASE_URL ?? '';
const UI_BASE = '';
const AUTH_FILE = path.join(__dirname, '.auth/admin.json');

const TEST_YEAR = '2026-2027';
const TEST_YEAR_START = '2026-04-01';
const TEST_YEAR_END = '2027-03-31';
const TEST_CLASS_STANDARD = 'Class 12';
const TEST_CLASS_SECTION = 'A';  // initial section in the class record
const TEST_SECTIONS = ['A', 'B'] as const;  // sections added via ClassDetail

// ── Auth Helpers (same as staff-enrollment-v2.spec.ts) ───────────────────────

function getTokenFromAuthFile(): string | null {
  try {
    if (!fs.existsSync(AUTH_FILE)) return null;
    const data = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
    const entry = data.origins?.[0]?.localStorage?.find((e: { name: string }) => e.name === 'authToken');
    return entry?.value ?? null;
  } catch {
    return null;
  }
}

async function injectAuthIntoPage(page: Page): Promise<void> {
  try {
    if (!fs.existsSync(AUTH_FILE)) return;
    const data = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
    const pwE2eAuth = data.origins?.[0]?.localStorage?.find((e: { name: string }) => e.name === 'pw_e2e_auth');
    const authToken = data.origins?.[0]?.localStorage?.find((e: { name: string }) => e.name === 'authToken');
    const schoolId = data.origins?.[0]?.localStorage?.find((e: { name: string }) => e.name === 'schoolId');

    if (pwE2eAuth && authToken && schoolId) {
      const auth_session = JSON.parse(pwE2eAuth.value);
      await page.addInitScript((auth: unknown, token: string, school: string) => {
        localStorage.setItem('pw_e2e_auth', JSON.stringify(auth));
        localStorage.setItem('authToken', token);
        localStorage.setItem('schoolId', school);
        sessionStorage.setItem('auth_session', JSON.stringify(auth));
      }, auth_session, authToken.value, schoolId.value);
    }
  } catch (err) {
    console.log('⚠ Auth injection error:', err);
  }
}

// ── Cleanup helpers (API-level) ───────────────────────────────────────────────

async function deleteAcademicYearIfExists(
  request: APIRequestContext,
  yearName: string,
  token: string,
): Promise<void> {
  try {
    const resp = await request.get(`${API_BASE}/academics/academic-years?page=1&pageSize=100`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok()) return;
    const body = await resp.json();
    const years: Array<{ id: string; name: string }> = body?.academicYears ?? [];
    const match = years.find((y) => y.name === yearName);
    if (match) {
      await request.delete(`${API_BASE}/academics/academic-years/${match.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log(`✓ Cleaned up academic year: ${yearName}`);
    }
  } catch { /* cleanup is best-effort */ }
}

async function deleteClassIfExists(
  request: APIRequestContext,
  standard: string,
  token: string,
): Promise<void> {
  try {
    const resp = await request.get(`${API_BASE}/academics/classes?page=1&pageSize=200`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok()) return;
    const body = await resp.json();
    const classes: Array<{ id: string; standard: string }> = body?.classes ?? [];
    for (const cls of classes.filter((c) => c.standard === standard)) {
      await request.delete(`${API_BASE}/academics/classes/${cls.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    }
    console.log(`✓ Cleaned up classes for standard: ${standard}`);
  } catch { /* cleanup is best-effort */ }
}

// ── Shared state across phases ────────────────────────────────────────────────

let createdYearId: string = '';
let createdClassId: string = '';
let createdSectionAId: string = '';

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 1 — Academic Year
// ══════════════════════════════════════════════════════════════════════════════

test.describe('Phase 1 — Academic Year setup', () => {
  test.beforeAll(async ({ request }) => {
    const token = getTokenFromAuthFile();
    if (token) await deleteAcademicYearIfExists(request, TEST_YEAR, token);
  });

  test('1.1 — Navigate to Academic Setup page', async ({ page }) => {
    await injectAuthIntoPage(page);
    await page.goto(`${UI_BASE}/academics`);
    await page.waitForLoadState('networkidle');

    // The page h1 says "Academic Configuration"
    await expect(
      page.getByRole('heading', { name: /Academic Configuration/i }).first(),
    ).toBeVisible({ timeout: 15_000 });

    // Tabs should be visible
    await expect(page.getByRole('tab', { name: /Academic Years/i }).first()).toBeVisible();
  });

  test('1.2 — Create academic year 2026-2027', async ({ page, request }) => {
    await injectAuthIntoPage(page);
    await page.goto(`${UI_BASE}/academics`);
    await page.waitForLoadState('networkidle');

    // "Academic Years" tab is the default active tab
    await page.getByRole('tab', { name: /Academic Years/i }).first().click();
    await page.waitForTimeout(300);

    // Click "Add Academic Year"
    await page.getByRole('button', { name: /Add Academic Year/i }).first().click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Name
    await dialog.locator('input#name').fill(TEST_YEAR);
    // Start date
    await dialog.locator('input#startDate').fill(TEST_YEAR_START);
    // End date
    await dialog.locator('input#endDate').fill(TEST_YEAR_END);

    // Submit (Create button)
    await dialog.getByRole('button', { name: /^Create$/i }).click();

    // Success toast
    await expect(page.getByText(/academic year created successfully/i).first()).toBeVisible({ timeout: 10_000 });

    // Capture created year ID via API
    const token = getTokenFromAuthFile();
    if (token) {
      const resp = await request.get(`${API_BASE}/academics/academic-years?pageSize=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok()) {
        const body = await resp.json();
        const years: Array<{ id: string; name: string }> = body?.academicYears ?? [];
        createdYearId = years.find((y) => y.name === TEST_YEAR)?.id ?? '';
        console.log(`✓ Academic year created: ${createdYearId}`);
      }
    }
  });

  test('1.3 — Year 2026-2027 appears in the table', async ({ page }) => {
    await injectAuthIntoPage(page);
    await page.goto(`${UI_BASE}/academics`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('tab', { name: /Academic Years/i }).first().click();

    await expect(page.getByRole('cell', { name: TEST_YEAR }).first()).toBeVisible({ timeout: 10_000 });
  });

  test('1.4 — Set 2026-2027 as current year', async ({ page }) => {
    await injectAuthIntoPage(page);
    await page.goto(`${UI_BASE}/academics`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('tab', { name: /Academic Years/i }).first().click();

    // Find the row for 2026-2027
    const row = page.getByRole('row').filter({ hasText: TEST_YEAR });

    // Check if "Set Current" button exists (won't exist if already current)
    const setCurrentBtn = row.getByRole('button', { name: /Set Current/i });
    const isBtn = await setCurrentBtn.isVisible({ timeout: 3_000 }).catch(() => false);

    if (isBtn) {
      await setCurrentBtn.click();
      await expect(
        page.getByText(new RegExp(`${TEST_YEAR}.*is now the current academic year`, 'i')).first(),
      ).toBeVisible({ timeout: 10_000 });
    } else {
      // Already current — verify "Current" badge
      await expect(row.getByText(/Current/i).first()).toBeVisible({ timeout: 5_000 });
    }
  });

  test('1.5 — Nav header dropdown shows a year', async ({ page }) => {
    await injectAuthIntoPage(page);
    await page.goto(`${UI_BASE}/academics`);
    await page.waitForLoadState('networkidle');

    // Year dropdown button in the header (shows "20XX-20XX" pattern)
    const headerBtn = page.locator('button').filter({ hasText: /20\d\d-20\d\d/ }).first();
    await expect(headerBtn).toBeVisible({ timeout: 15_000 });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 2 — Class Management
// ══════════════════════════════════════════════════════════════════════════════

test.describe('Phase 2 — Class management', () => {
  test.beforeAll(async ({ request }) => {
    const token = getTokenFromAuthFile();
    if (token) await deleteClassIfExists(request, TEST_CLASS_STANDARD, token);
  });

  test('2.1 — Classes tab shows Add Class button', async ({ page }) => {
    await injectAuthIntoPage(page);
    await page.goto(`${UI_BASE}/academics`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('tab', { name: /^Classes$/i }).first().click();
    await page.waitForTimeout(300);

    await expect(page.getByRole('button', { name: /Add Class/i }).first()).toBeVisible({ timeout: 10_000 });
  });

  test('2.2 — Create Class 12 with section A', async ({ page, request }) => {
    await injectAuthIntoPage(page);
    await page.goto(`${UI_BASE}/academics`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('tab', { name: /^Classes$/i }).first().click();
    await page.waitForTimeout(300);

    await page.getByRole('button', { name: /Add Class/i }).first().click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Standard field (id="standard")
    await dialog.locator('input#standard').fill(TEST_CLASS_STANDARD);
    // Section field (id="section")
    await dialog.locator('input#section').fill(TEST_CLASS_SECTION);

    // Select academic year 2026-2027 via the Select component
    const selectTrigger = dialog.locator('[role="combobox"]').first();
    await selectTrigger.click();
    await page.waitForTimeout(200);
    // Pick 2026-2027
    const yearOption = page.getByRole('option', { name: '2026-2027' });
    const optionVisible = await yearOption.isVisible({ timeout: 2_000 }).catch(() => false);
    if (optionVisible) {
      await yearOption.click();
    } else {
      // Shadcn select may render in a portal
      await page.locator('[role="listbox"] [role="option"]').filter({ hasText: '2026-2027' }).click().catch(() => {});
    }

    // Click Create
    await dialog.getByRole('button', { name: /^Create$/i }).click();

    await expect(page.getByText(/Class created successfully/i).first()).toBeVisible({ timeout: 10_000 });

    // Capture class ID via API
    const token = getTokenFromAuthFile();
    if (token) {
      const resp = await request.get(`${API_BASE}/academics/classes?pageSize=200`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok()) {
        const body = await resp.json();
        const classes: Array<{ id: string; standard: string }> = body?.classes ?? [];
        createdClassId = classes.find((c) => c.standard === TEST_CLASS_STANDARD)?.id ?? '';
        console.log(`✓ Class created: ${createdClassId}`);
      }
    }
  });

  test('2.3 — Class 12 appears in class list', async ({ page }) => {
    await injectAuthIntoPage(page);
    await page.goto(`${UI_BASE}/academics`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('tab', { name: /^Classes$/i }).first().click();

    await expect(
      page.getByRole('cell', { name: TEST_CLASS_STANDARD }).first(),
    ).toBeVisible({ timeout: 10_000 });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 3 — Section Management
// ══════════════════════════════════════════════════════════════════════════════

test.describe('Phase 3 — Section management', () => {
  async function openClass12Detail(page: Page): Promise<void> {
    if (createdClassId) {
      await page.goto(`${UI_BASE}/academics/classes/${createdClassId}`);
      await page.waitForLoadState('networkidle');
      return;
    }
    // Fallback: navigate via Settings gear button in Classes table
    await page.goto(`${UI_BASE}/academics`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('tab', { name: /^Classes$/i }).first().click();
    await page.waitForTimeout(300);
    // Click the gear / Settings button in Class 12 row
    const row = page.getByRole('row').filter({ hasText: TEST_CLASS_STANDARD });
    await row.locator('button').first().click();
    await page.waitForLoadState('networkidle');
  }

  async function addSection(page: Page, sectionName: string): Promise<void> {
    await openClass12Detail(page);

    // Ensure we're on the Sections tab (default)
    const sectionsTab = page.getByRole('tab', { name: /^Sections$/i }).first();
    if (await sectionsTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await sectionsTab.click();
      await page.waitForTimeout(200);
    }

    // Click "Add Section"
    await page.getByRole('button', { name: /Add Section/i }).first().click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Section name field (id="sectionName")
    await dialog.locator('input#sectionName').fill(sectionName);

    // Submit
    await dialog.getByRole('button', { name: /Add.*Section/i }).click();

    await expect(page.getByText(/Section added successfully/i).first()).toBeVisible({ timeout: 10_000 });
  }

  test('3.1 — Open Class 12 detail page', async ({ page }) => {
    await injectAuthIntoPage(page);
    await openClass12Detail(page);

    // Should show the class name heading
    await expect(
      page.getByText(new RegExp(TEST_CLASS_STANDARD, 'i')).first(),
    ).toBeVisible({ timeout: 10_000 });

    // Sections tab should be visible
    await expect(page.getByRole('tab', { name: /Sections/i }).first()).toBeVisible();
  });

  test('3.2 — Create Section A under Class 12', async ({ page, request }) => {
    await injectAuthIntoPage(page);
    await addSection(page, 'Section A');

    // Capture section ID
    const token = getTokenFromAuthFile();
    if (token && createdClassId) {
      const resp = await request.get(
        `${API_BASE}/academics/sections?classId=${createdClassId}&pageSize=50`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (resp.ok()) {
        const body = await resp.json();
        const sections: Array<{ id: string; name: string }> = body?.sections ?? [];
        createdSectionAId = sections.find((s) => s.name === 'Section A' || s.name === 'A')?.id ?? '';
        console.log(`✓ Section A created: ${createdSectionAId}`);
      }
    }
  });

  test('3.3 — Create Section B under Class 12', async ({ page }) => {
    await injectAuthIntoPage(page);
    await addSection(page, 'Section B');
  });

  test('3.4 — Both sections A and B appear on the Class 12 page', async ({ page }) => {
    await injectAuthIntoPage(page);
    await openClass12Detail(page);

    for (const s of ['Section A', 'Section B']) {
      await expect(page.getByRole('cell', { name: s }).first()).toBeVisible({ timeout: 10_000 });
    }
  });

  test('3.5 — Section A detail page renders with student management', async ({ page }) => {
    await injectAuthIntoPage(page);

    if (createdClassId && createdSectionAId) {
      await page.goto(`${UI_BASE}/academics/classes/${createdClassId}/sections/${createdSectionAId}`);
    } else {
      await openClass12Detail(page);
      // Click "Manage" for Section A
      const sectionRow = page.getByRole('row').filter({ hasText: /Section A/ });
      await sectionRow.getByRole('button', { name: /Manage/i }).click();
    }
    await page.waitForLoadState('networkidle');

    // Switch to Students tab if present
    const studentsTab = page.getByRole('tab', { name: /Students/i }).first();
    if (await studentsTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await studentsTab.click();
      await page.waitForTimeout(300);
    }

    // "Add Students" button must be present
    await expect(
      page.getByRole('button', { name: /Add Students/i }).first(),
    ).toBeVisible({ timeout: 10_000 });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 4 — Academic Year Nav Dropdown
// ══════════════════════════════════════════════════════════════════════════════

test.describe('Phase 4 — Academic year nav dropdown', () => {
  test('4.1 — Academic year dropdown is visible in header', async ({ page }) => {
    await injectAuthIntoPage(page);
    await page.goto(`${UI_BASE}/academics`);
    await page.waitForLoadState('networkidle');

    const headerBtn = page.locator('button').filter({ hasText: /20\d\d-20\d\d/ }).first();
    await expect(headerBtn).toBeVisible({ timeout: 15_000 });
  });

  test('4.2 — Selecting a year from the dropdown updates the display', async ({ page }) => {
    await injectAuthIntoPage(page);
    await page.goto(`${UI_BASE}/academics`);
    await page.waitForLoadState('networkidle');

    const headerBtn = page.locator('button').filter({ hasText: /20\d\d-20\d\d/ }).first();
    await expect(headerBtn).toBeVisible({ timeout: 15_000 });

    await headerBtn.click();
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible({ timeout: 5_000 });

    // Get all menu items — pick one different from the currently selected
    const items = menu.getByRole('menuitem');
    const count = await items.count();
    expect(count).toBeGreaterThan(0);

    // Click first item
    await items.first().click();
    await page.waitForTimeout(300);

    // Header should still show a year
    const updatedBtn = page.locator('button').filter({ hasText: /20\d\d-20\d\d/ }).first();
    await expect(updatedBtn).toBeVisible({ timeout: 5_000 });
  });

  test('4.3 — Year selection persists across page navigations', async ({ page }) => {
    await injectAuthIntoPage(page);
    await page.goto(`${UI_BASE}/academics`);
    await page.waitForLoadState('networkidle');

    // Select 2026-2027 if available
    const headerBtn = page.locator('button').filter({ hasText: /20\d\d-20\d\d/ }).first();
    await expect(headerBtn).toBeVisible({ timeout: 15_000 });
    await headerBtn.click();

    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible({ timeout: 5_000 });

    const yearItem = menu.getByRole('menuitem').filter({ hasText: TEST_YEAR });
    const available = await yearItem.isVisible({ timeout: 2_000 }).catch(() => false);

    if (!available) {
      test.skip(); // 2026-2027 not yet visible — skip persistence check
      return;
    }

    await yearItem.click();
    await page.waitForTimeout(300);

    // Grab the label of the currently selected year
    const selectedLabel = (await headerBtn.textContent()) ?? '';
    expect(selectedLabel).toMatch(/20\d\d/);

    // Navigate to students page
    await page.goto(`${UI_BASE}/students`);
    await page.waitForLoadState('networkidle');

    // Year button should still be visible with the same year
    const persistedBtn = page.locator('button').filter({ hasText: /20\d\d-20\d\d/ }).first();
    await expect(persistedBtn).toBeVisible({ timeout: 10_000 });
    const persistedLabel = (await persistedBtn.textContent()) ?? '';
    expect(persistedLabel).toContain(TEST_YEAR.slice(-4));
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 5 — API Smoke Tests
// ══════════════════════════════════════════════════════════════════════════════

test.describe('Phase 5 — API smoke tests', () => {
  test('5.1 — GET /academics/academic-years returns list', async ({ request }) => {
    const token = getTokenFromAuthFile();
    if (!token) { test.skip(); return; }

    const resp = await request.get(`${API_BASE}/academics/academic-years?pageSize=100`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(resp.ok()).toBeTruthy();
    const body = await resp.json();
    const years: Array<{ name: string }> = body?.academicYears ?? [];
    expect(years.some((y) => y.name === TEST_YEAR)).toBeTruthy();
  });

  test('5.2 — GET /academics/classes returns list including Class 12', async ({ request }) => {
    const token = getTokenFromAuthFile();
    if (!token) { test.skip(); return; }

    const resp = await request.get(`${API_BASE}/academics/classes?pageSize=200`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(resp.ok()).toBeTruthy();
    const body = await resp.json();
    const classes: Array<{ standard: string }> = body?.classes ?? [];
    expect(classes.some((c) => c.standard === TEST_CLASS_STANDARD)).toBeTruthy();
  });

  test('5.3 — GET /academics/sections with classId returns sections', async ({ request }) => {
    const token = getTokenFromAuthFile();
    if (!token || !createdClassId) { test.skip(); return; }

    const resp = await request.get(
      `${API_BASE}/academics/sections?classId=${createdClassId}&pageSize=50`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(resp.ok()).toBeTruthy();
    const body = await resp.json();
    const sections: Array<{ name: string }> = body?.sections ?? [];
    // Sections named "Section A" or "A", "Section B" or "B"
    const hasA = sections.some((s) => /^section a$|^a$/i.test(s.name));
    const hasB = sections.some((s) => /^section b$|^b$/i.test(s.name));
    expect(hasA).toBeTruthy();
    expect(hasB).toBeTruthy();
  });

  test('5.4 — PATCH set-current marks year as current in DB', async ({ request }) => {
    const token = getTokenFromAuthFile();
    if (!token || !createdYearId) { test.skip(); return; }

    const resp = await request.patch(
      `${API_BASE}/academics/academic-years/${createdYearId}/set-current`,
      {
        headers: { Authorization: `Bearer ${token}` },
        data: {},
      },
    );
    expect(resp.ok()).toBeTruthy();
    const body = await resp.json();
    expect(body?.isCurrent).toBe(true);
    expect(body?.name).toBe(TEST_YEAR);
  });
});
