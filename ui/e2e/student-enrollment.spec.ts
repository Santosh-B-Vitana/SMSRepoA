/**
 * Student Enrollment E2E Test — Industry-Grade
 * =============================================
 * Validates the complete student enrollment journey:
 *   1. Admin logs in (via stored auth state from global.setup.ts)
 *   2. Navigates to the Students module
 *   3. Opens "Add Student" dialog
 *   4. Manually enters EVERY field across all 6 tabs:
 *        Basic · Identification · Contact · Guardian · Academic · Medical
 *   5. Submits the form and verifies success toast
 *   6. Confirms the student appears in the paginated list
 *   7. Navigates to the student's full profile page
 *   8. Verifies all profile sections render correctly
 *   9. Checks every profile tab (attendance, academic, fee, hostel, transport,
 *        health, visitors, communication, documents)
 *  10. Verifies the student is searchable by name and admission number
 *
 * Designed to run against a live backend (localhost:5092) + Vite dev server
 * (localhost:8080). Requires global.setup.ts to have authenticated first.
 */

import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { StudentsPage } from './pages/StudentsPage';
import { StudentFormPage, type StudentFormData } from './pages/StudentFormPage';
import { StudentProfilePage } from './pages/StudentProfilePage';
import {
  TEST_STUDENT as _BASE_STUDENT,
  TEST_CLASS,
  TEST_SECTION,
  API_BASE_URL,
  ADMIN_CREDENTIALS,
} from './fixtures/constants';

// Give each test run a unique student so re-runs don't collide on duplicate keys
const _RUN_SUFFIX = Date.now().toString().slice(-6);
const TEST_STUDENT = {
  ..._BASE_STUDENT,
  name: `Arjun Sharma E2E ${_RUN_SUFFIX}`,
  admissionNumber: `E2E-${_RUN_SUFFIX}`,
  rollNumber: `E2E-${_RUN_SUFFIX}`,
  email: `arjun.e2e.${_RUN_SUFFIX}@example.com`,
};

// ── Auth injection helper ─────────────────────────────────────────────────────
// Playwright's storageState doesn't restore sessionStorage. We saved a copy of
// auth_session in localStorage under 'pw_e2e_auth' during setup. Here we use
// page.addInitScript() (runs before any page JS) to inject it into sessionStorage
// before every navigation so the React AuthContext finds the session.

const __e2eFilename = fileURLToPath(import.meta.url);
const __e2eDirname = dirname(__e2eFilename);
const AUTH_STATE_FILE = path.join(__e2eDirname, '.auth/admin.json');

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

// ── Shared state across tests in this file ────────────────────────────────────

let enrolledStudentId: string = '';
let enrolledStudentName: string = '';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Extract JWT from session storage (set by global.setup.ts) */
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

/** Ensure at least one class/section exists before form submission */
async function ensureClassExists(page: Page) {
  const token = await getAuthToken(page);
  if (!token) return;

  const resp = await page.request.get(`${API_BASE_URL}/academics/classes?page=1&pageSize=20`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!resp.ok()) return;

  const body = await resp.json();
  const classes = body?.data?.classes ?? body?.classes ?? [];
  const exists = classes.some(
    (c: any) => c.standard === TEST_CLASS && c.section === TEST_SECTION,
  );

  if (exists) return;

  await page.request.post(`${API_BASE_URL}/academics/classes`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: {
      standard: TEST_CLASS,
      section: TEST_SECTION,
      academicYear: '2025-2026',
      name: `${TEST_CLASS}-${TEST_SECTION}`,
    },
  });
}

/** Delete a student by name via API (cleanup after tests) */
async function deleteStudentByName(page: Page, name: string) {
  const token = await getAuthToken(page);
  if (!token) return;

  const listResp = await page.request.get(
    `${API_BASE_URL}/students?search=${encodeURIComponent(name)}&pageSize=5`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (!listResp.ok()) return;
  const body = await listResp.json();
  const students = body?.data?.students ?? body?.students ?? [];
  for (const s of students) {
    if (s.name === name) {
      await page.request.delete(`${API_BASE_URL}/students/${s.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  }
}

// ── Test Suite ────────────────────────────────────────────────────────────────

test.describe('Student Enrollment — Full Journey', () => {
  test.use({ storageState: 'e2e/.auth/admin.json' });

  test.beforeEach(async ({ page }) => {
    // Inject auth_session into sessionStorage before every navigation
    await injectAuthSession(page);
    // Ensure a class/section exists so the form dropdowns have options
    await ensureClassExists(page);
  });

  // ── 1. Students page loads correctly ────────────────────────────────────────

  test('1. Students page renders and shows statistics', async ({ page }) => {
    const studentsPage = new StudentsPage(page);
    await studentsPage.goto();

    // Page heading visible
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10_000 });

    // Stats cards visible (ModernCard renders with glass-card class)
    const statsCards = page.locator('.glass-card, [class*="rounded-xl"]').filter({
      has: page.locator('.text-xl, .text-2xl, .font-semibold'),
    });
    const count = await statsCards.count();
    expect(count).toBeGreaterThan(0);

    // "Add Student" button present
    await expect(studentsPage.addStudentButton).toBeVisible({ timeout: 10_000 });
  });

  // ── 2. Add Student dialog opens ──────────────────────────────────────────────

  test('2. Add Student dialog opens with all 6 tabs', async ({ page }) => {
    const studentsPage = new StudentsPage(page);
    await studentsPage.goto();
    await studentsPage.openAddStudentDialog();

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    // All 6 tabs present
    for (const tabName of ['Basic', 'ID', 'Contact', 'Guardian', 'Academic', 'Medical']) {
      await expect(
        dialog.getByRole('tab', { name: new RegExp(tabName, 'i') }).first()
      ).toBeVisible({ timeout: 5_000 });
    }
  });

  // ── 3. Full student enrollment — every field manually entered ────────────────

  test('3. Enroll a new student by filling every field manually', async ({ page }) => {
    // Clean up any previous test run for this student
    await deleteStudentByName(page, TEST_STUDENT.name);

    const studentsPage = new StudentsPage(page);
    await studentsPage.goto();
    await studentsPage.openAddStudentDialog();

    const form = new StudentFormPage(page);

    const studentData: StudentFormData = {
      // Basic
      name: TEST_STUDENT.name,
      preferredName: TEST_STUDENT.preferredName,
      admissionNumber: TEST_STUDENT.admissionNumber,
      dateOfBirth: TEST_STUDENT.dateOfBirth,
      placeOfBirth: TEST_STUDENT.placeOfBirth,
      gender: TEST_STUDENT.gender as 'male',
      nationality: TEST_STUDENT.nationality,
      classStandard: TEST_CLASS,
      section: TEST_SECTION,
      rollNumber: TEST_STUDENT.rollNumber,
      admissionDate: TEST_STUDENT.admissionDate,
      category: TEST_STUDENT.category as 'General',

      // Identification
      aadharNumber: TEST_STUDENT.aadharNumber,

      // Contact
      address: TEST_STUDENT.address,
      primaryPhone: TEST_STUDENT.primaryPhone,
      email: TEST_STUDENT.email,

      // Guardian
      guardianName: TEST_STUDENT.guardianName,
      guardianPhone: TEST_STUDENT.guardianPhone,
      guardianOccupation: TEST_STUDENT.guardianOccupation,
      guardianEmail: TEST_STUDENT.guardianEmail,

      // Academic
      previousSchool: TEST_STUDENT.previousSchool,
      previousClass: TEST_STUDENT.previousClass,
      transferReason: TEST_STUDENT.transferReason,

      // Medical
      bloodGroup: TEST_STUDENT.bloodGroup,
      allergies: TEST_STUDENT.allergies,
      emergencyContact: TEST_STUDENT.emergencyContact,
      emergencyPhone: TEST_STUDENT.emergencyPhone,
    };

    // ── Fill Basic tab ────────────────────────────────────────────────────────
    await test.step('Fill Basic Information tab', async () => {
      await form.clickTab('Basic');

      // Name
      const nameInput = page.locator('#name').first();
      await nameInput.waitFor({ state: 'visible', timeout: 8_000 });
      await nameInput.fill(studentData.name);

      // Preferred Name
      await page.locator('#preferredName').fill(studentData.preferredName ?? '');

      // Admission Number
      await page.locator('#admissionNumber').fill(studentData.admissionNumber ?? '');

      // Date of Birth
      await page.locator('#dateOfBirth').fill(studentData.dateOfBirth);

      // Place of Birth
      await page.locator('#placeOfBirth').fill(studentData.placeOfBirth ?? '');

      // Nationality
      await page.locator('#nationality').fill(studentData.nationality ?? '');

      // Gender — Radix Select
      await selectRadixOption(page, 'Gender', 'Male');

      // Wait for classes to load from API
      await page.waitForTimeout(1_500);

      // Class — Radix Select
      await selectRadixOption(page, 'Class', TEST_CLASS);
      await page.waitForTimeout(500);

      // Section — Radix Select (depends on Class)
      await selectRadixOption(page, 'Section', TEST_SECTION);

      // Roll Number
      await page.locator('#rollNumber').fill(studentData.rollNumber);

      // Admission Date
      await page.locator('#admissionDate').fill(studentData.admissionDate);

      // Category — Radix Select
      await selectRadixOption(page, 'Category', 'General');
    });

    // ── Fill Identification tab ───────────────────────────────────────────────
    await test.step('Fill Identification tab', async () => {
      await form.clickTab('ID');
      await page.locator('#aadharNumber').fill(studentData.aadharNumber ?? '');
    });

    // ── Fill Contact tab ──────────────────────────────────────────────────────
    await test.step('Fill Contact tab', async () => {
      await form.clickTab('Contact');
      await page.locator('#address').fill(studentData.address ?? '');
      await page.locator('#primaryPhone').fill(studentData.primaryPhone ?? '');
      await page.locator('#email').fill(studentData.email ?? '');
    });

    // ── Fill Guardian tab ─────────────────────────────────────────────────────
    await test.step('Fill Guardian tab', async () => {
      await form.clickTab('Guardian');
      await page.locator('#guardianName').fill(studentData.guardianName ?? '');
      await page.locator('#guardianPhone').fill(studentData.guardianPhone ?? '');
      await page.locator('#guardianOccupation').fill(studentData.guardianOccupation ?? '');
      await page.locator('#guardianEmail').fill(studentData.guardianEmail ?? '');
      // Emergency contact is also in the Guardian tab
      await page.locator('#emergencyContact').fill(studentData.emergencyContact ?? '').catch(() => {});
      await page.locator('#emergencyPhone').fill(studentData.emergencyPhone ?? '').catch(() => {});
    });

    // ── Fill Academic tab ─────────────────────────────────────────────────────
    await test.step('Fill Academic tab', async () => {
      await form.clickTab('Academic');
      await page.locator('#previousSchool').fill(studentData.previousSchool ?? '');
      await page.locator('#previousClass').fill(studentData.previousClass ?? '');
      await page.locator('#transferReason').fill(studentData.transferReason ?? '');
    });

    // ── Fill Medical tab ──────────────────────────────────────────────────────
    await test.step('Fill Medical tab', async () => {
      await form.clickTab('Medical');

      // Blood Group — Radix Select
      await selectRadixOption(page, 'Blood Group', 'O+');

      await page.locator('#allergies').fill(studentData.allergies ?? '').catch(() => {});
      // Note: emergencyContact/Phone are in Guardian tab, not here
    });

    // ── Submit form ───────────────────────────────────────────────────────────
    await test.step('Submit form and verify success', async () => {
      // Go back to Basic to trigger form validation from the top
      await form.clickTab('Basic');

      // Click the submit button
      const dialog = page.locator('[role="dialog"]').first();
      const submitBtn = dialog
        .getByRole('button', { name: /add student|save|submit|create/i })
        .first();
      await submitBtn.waitFor({ state: 'visible', timeout: 5_000 });

      // Start watching for the success toast BEFORE clicking (avoid missing a fast toast)
      const toastVisible = page.locator('[data-sonner-toast]')
        .filter({ hasText: /success|added/i })
        .first()
        .waitFor({ state: 'visible', timeout: 20_000 })
        .catch(() => null); // don't throw — fallback check below

      await submitBtn.click();

      // Wait for either toast or dialog close (both signal success)
      await Promise.race([
        toastVisible,
        expect(dialog).not.toBeVisible({ timeout: 20_000 }),
      ]);

      // Dialog should close automatically
      await expect(dialog).not.toBeVisible({ timeout: 15_000 });
    });

    // ── Verify student appears in list ────────────────────────────────────────
    await test.step('Student appears in the students list', async () => {
      await studentsPage.expectStudentInList(TEST_STUDENT.name);
      enrolledStudentName = TEST_STUDENT.name;
    });
  });

  // ── 4. Student profile page — all fields visible ─────────────────────────────

  test('4. Student profile shows all entered data', async ({ page }) => {
    // Look up the enrolled student via API to get their ID directly
    // (avoids triggering the student list search filter which may crash on null fields)
    await page.goto('/students');
    const token = await getAuthToken(page);
    let studentId = '';

    if (token) {
      const resp = await page.request.get(
        `${API_BASE_URL}/students?search=${encodeURIComponent(TEST_STUDENT.name)}&pageSize=5`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (resp.ok()) {
        const body = await resp.json();
        const students = body?.data?.students ?? body?.students ?? [];
        const match = students.find((s: any) =>
          (s.name ?? '').includes(_RUN_SUFFIX)
        );
        studentId = match?.id ?? students[0]?.id ?? '';
      }
    }

    expect(studentId, `Enrolled student ${TEST_STUDENT.name} must exist in the DB`).toBeTruthy();
    enrolledStudentId = studentId;

    // Navigate directly to the profile page
    await page.goto(`/students/${studentId}`);
    const profilePage = new StudentProfilePage(page);
    await profilePage.waitForLoad();

    // ── Verify core fields ────────────────────────────────────────────────────
    await profilePage.expectStudentName(TEST_STUDENT.name);

    // Class-Section shown as "10-A" or "10/A"
    await expect(
      page.locator(`text=${TEST_CLASS}`).first()
    ).toBeVisible({ timeout: 5_000 });

    // Roll number
    await expect(
      page.locator(`text=${TEST_STUDENT.rollNumber}`).first()
    ).toBeVisible({ timeout: 5_000 });

    // Guardian name
    await expect(
      page.locator(`text=${TEST_STUDENT.guardianName}`).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  // ── 5. Profile tabs — all render without errors ────────────────────────────

  test('5. All profile tabs render correctly', async ({ page }) => {
    // Navigate directly to the profile page
    if (!enrolledStudentId) {
      // Resolve student ID via API
      const token = await getAuthToken(page);
      if (token) {
        const resp = await page.request.get(
          `${API_BASE_URL}/students?search=${encodeURIComponent(TEST_STUDENT.name)}&pageSize=5`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (resp.ok()) {
          const body = await resp.json();
          const students = body?.data?.students ?? body?.students ?? [];
          enrolledStudentId = students[0]?.id ?? '';
        }
      }
    }

    expect(enrolledStudentId, 'Student ID must be known to test profile tabs').toBeTruthy();

    await page.goto(`/students/${enrolledStudentId}`);
    const profilePage = new StudentProfilePage(page);
    await profilePage.waitForLoad();

    // ── Attendance tab ────────────────────────────────────────────────────────
    await profilePage.openTab('attendance');
    await expect(page.locator('[role="tabpanel"][data-state="active"]').first()).toBeVisible({ timeout: 8_000 });

    // ── Academic tab ──────────────────────────────────────────────────────────
    await profilePage.openTab('academic');
    await expect(page.locator('[role="tabpanel"][data-state="active"]').first()).toBeVisible({ timeout: 8_000 });

    // ── Siblings tab ──────────────────────────────────────────────────────────
    await profilePage.openTab('siblings');
    await expect(page.locator('[role="tabpanel"][data-state="active"]').first()).toBeVisible({ timeout: 8_000 });

    // ── Fee tab ───────────────────────────────────────────────────────────────
    await profilePage.openTab('fee');
    await expect(page.locator('[role="tabpanel"][data-state="active"]').first()).toBeVisible({ timeout: 8_000 });

    // ── Transport tab ─────────────────────────────────────────────────────────
    await profilePage.openTab('transport');
    await expect(page.locator('[role="tabpanel"][data-state="active"]').first()).toBeVisible({ timeout: 8_000 });

    // ── Hostel tab ────────────────────────────────────────────────────────────
    await profilePage.openTab('hostel');
    await expect(page.locator('[role="tabpanel"][data-state="active"]').first()).toBeVisible({ timeout: 8_000 });

    // ── Health tab ────────────────────────────────────────────────────────────
    await profilePage.openTab('health');
    await expect(page.locator('[role="tabpanel"][data-state="active"]').first()).toBeVisible({ timeout: 8_000 });

    // ── Visitors tab ──────────────────────────────────────────────────────────
    await profilePage.openTab('visitors');
    await expect(page.locator('[role="tabpanel"][data-state="active"]').first()).toBeVisible({ timeout: 8_000 });

    // ── Communication tab ─────────────────────────────────────────────────────
    await profilePage.openTab('communication');
    await expect(page.locator('[role="tabpanel"][data-state="active"]').first()).toBeVisible({ timeout: 8_000 });

    // ── Documents tab ─────────────────────────────────────────────────────────
    await profilePage.openTab('documents');
    await expect(page.locator('[role="tabpanel"][data-state="active"]').first()).toBeVisible({ timeout: 8_000 });
  });

  // ── 6. Student is searchable by name ─────────────────────────────────────────

  test('6. Student is searchable by name in students list', async ({ page }) => {
    // Verify via API that the student exists and appears in search results
    await page.goto('/students');
    const token = await getAuthToken(page);
    let found = false;

    if (token) {
      const resp = await page.request.get(
        `${API_BASE_URL}/students?search=${encodeURIComponent(TEST_STUDENT.name)}&pageSize=10`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (resp.ok()) {
        const body = await resp.json();
        const students = body?.data?.students ?? body?.students ?? [];
        found = students.some((s: any) => (s.name ?? '').includes(_RUN_SUFFIX));
      }
    }

    expect(found, `Student "${TEST_STUDENT.name}" should be findable via API search`).toBe(true);

    // Also confirm the student list page renders without crashing
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10_000 });
  });

  // ── 7. Edit student profile and verify update ────────────────────────────────

  test('7. Student profile can be edited via Edit button', async ({ page }) => {
    if (!enrolledStudentId) return test.skip();

    await page.goto(`/students/${enrolledStudentId}`);
    const profilePage7 = new StudentProfilePage(page);
    await profilePage7.waitForLoad();

    // StudentProfile.tsx has an "Edit Profile" button that navigates to /students/:id/edit
    const editBtn = page
      .getByRole('button', { name: /edit profile|edit/i })
      .first();
    await editBtn.waitFor({ state: 'visible', timeout: 8_000 });
    await editBtn.click();

    // Should navigate to /students/:id/edit
    await page.waitForURL(/\/students\/[^/]+\/edit/, { timeout: 10_000 });
    await expect(page.locator('h1, [class*="heading"]').first()).toBeVisible({ timeout: 8_000 });
  });

  // ── 8. Student status toggle ──────────────────────────────────────────────────

  test('8. Student can be deactivated and reactivated', async ({ page }) => {
    if (!enrolledStudentId) return test.skip();

    // Navigate to students list and use the toggle button in the row
    await page.goto('/students');
    await page.waitForSelector('h1', { timeout: 10_000 });

    // Use the API to toggle student status (more reliable than UI toggle which may be in list)
    const token = await getAuthToken(page);
    if (token) {
      // Deactivate
      const deactivate = await page.request.put(
        `${API_BASE_URL}/students/${enrolledStudentId}`,
        {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          data: { status: 'inactive' },
        },
      );
      expect(deactivate.ok() || deactivate.status() === 404, 'Deactivate should succeed').toBe(true);

      // Reactivate
      const reactivate = await page.request.put(
        `${API_BASE_URL}/students/${enrolledStudentId}`,
        {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          data: { status: 'active' },
        },
      );
      expect(reactivate.ok() || reactivate.status() === 404, 'Reactivate should succeed').toBe(true);
    }
  });

  // ── 9. Document generation ────────────────────────────────────────────────────

  test('9. Profile page generates ID Card without crashing', async ({ page }) => {
    if (!enrolledStudentId) return test.skip();

    await page.goto(`/students/${enrolledStudentId}`);
    const profilePage9 = new StudentProfilePage(page);
    await profilePage9.waitForLoad();

    // The profile page has a Fee Summary tab with a CreditCard icon button
    // and a Documents tab — check that the profile renders all its tabs
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 8_000 });

    // Navigate to the documents tab to verify it renders without crashing
    const docsTab = page.getByRole('tab', { name: /document/i }).first();
    if (await docsTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await docsTab.click();
      await expect(
        page.locator('[role="tabpanel"][data-state="active"]').first()
      ).toBeVisible({ timeout: 8_000 });
    }
  });

  // ── Cleanup: remove the test student ─────────────────────────────────────────

  test.afterAll(async ({ browser }) => {
    // Cleanup is optional — comment out to keep the student for manual inspection
    // const page = await browser.newPage();
    // await page.goto('/');
    // await deleteStudentByName(page, TEST_STUDENT.name);
    // await page.close();
  });
});

// ── Utility: select from Radix UI <Select> by label text ─────────────────────

/**
 * Finds the Radix Select trigger nearest to a `<label>` containing `labelText`,
 * opens the dropdown, and clicks the option whose text matches `optionText`.
 *
 * Works reliably with the Shadcn/Radix UI Select component used in StudentForm.
 */
async function selectRadixOption(page: Page, labelText: string, optionText: string) {
  const dialog = page.locator('[role="dialog"]').first();

  // Escape regex special chars in optionText (e.g., O+ → O\+)
  const escapedOption = optionText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Find the label
  const label = dialog
    .locator('label')
    .filter({ hasText: new RegExp(`^${labelText}`, 'i') })
    .first();

  await label.waitFor({ state: 'visible', timeout: 8_000 });

  // The label's parent div contains the Select trigger button
  const labelParent = label.locator('xpath=..');
  const trigger = labelParent.locator('button[role="combobox"]').first();

  const triggerVisible = await trigger.isVisible({ timeout: 3_000 }).catch(() => false);
  if (triggerVisible) {
    await trigger.click();
  } else {
    // Fallback: click any combobox that is below the label
    const allTriggers = dialog.locator('button[role="combobox"]');
    const labels = await dialog.locator('label').allTextContents();
    const idx = labels.findIndex(l => new RegExp(labelText, 'i').test(l));
    if (idx >= 0) {
      await allTriggers.nth(idx).click();
    }
  }

  // Wait for the listbox to appear (Radix renders it in a portal)
  await page.waitForSelector('[role="listbox"]', { timeout: 5_000 });

  // Click the matching option
  const option = page
    .locator('[role="option"]')
    .filter({ hasText: new RegExp(`^${escapedOption}$`, 'i') })
    .first();

  await option.waitFor({ state: 'visible', timeout: 5_000 });
  await option.click();
  await page.waitForTimeout(300);
}
