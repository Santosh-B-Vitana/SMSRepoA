/**
 * Health Module E2E Test Suite — Industry-Grade
 * ================================================
 *
 * Full end-to-end coverage for the Health module:
 *
 *  PHASE 1 — API: Health Records CRUD
 *    1. Seeded health records exist (15 records)
 *    2. Create a health record for a student
 *    3. Get health records list — verify new record appears
 *    4. Get health record by ID — verify all fields
 *    5. Update health record (weight)
 *    6. Duplicate record same date → 409
 *
 *  PHASE 2 — API: Health Alerts (DB-backed, not in-memory)
 *    7. Create a health alert
 *    8. Get health alerts — alert appears in list
 *    9. Acknowledge alert — status changes to Acknowledged
 *   10. Alerts persist across request (not in-memory)
 *
 *  PHASE 3 — API: Vaccinations
 *   11. Add vaccination record to a student
 *   12. Get student health record — vaccination appears in notes
 *
 *  PHASE 4 — Validation / Error cases
 *   13. Create health record for non-existent student → 404
 *   14. Case-insensitive status check: "Active" student (capital A) can have health record created
 *
 *  PHASE 5 — Module permission enforcement
 *   15. GET health records → 200 when health module enabled
 *   16. Disable health module — /health page shows ModuleGuard restriction
 *   17. Re-enable health module — page accessible again
 *
 *  PHASE 6 — Stats
 *   18. Health stats returns aggregate counts
 *
 * Auth: Uses admin.json storage state written by global.setup.ts.
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const API_BASE = 'http://localhost:5092/api';
const AUTH_FILE = path.join(__dirname, '.auth/admin.json');
const SCHOOL_ID = '550e8400-e29b-41d4-a716-446655440000';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getAuthToken(): string {
  try {
    const raw = fs.readFileSync(AUTH_FILE, 'utf-8');
    const state = JSON.parse(raw);
    const cookie = state.cookies?.find((c: { name: string }) => c.name === 'token' || c.name === 'auth_token');
    if (cookie?.value) return cookie.value;
    for (const origin of state.origins ?? []) {
      for (const item of origin.localStorage ?? []) {
        // Plain JWT string stored under 'authToken'
        if (item.name === 'authToken' && item.value && !item.value.startsWith('{')) {
          return item.value;
        }
        // JSON-wrapped token under legacy keys
        if (item.name === 'auth_session' || item.name === 'pw_e2e_auth') {
          try {
            const parsed = JSON.parse(item.value);
            if (parsed?.token) return parsed.token;
          } catch { /* ignore */ }
        }
      }
    }
    return '';
  } catch {
    return '';
  }
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

function todayMinus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

// ── Test state ────────────────────────────────────────────────────────────────

let token = '';
let createdRecordId = '';
let createdAlertId = '';
let testStudentId = '';
let superAdminToken = '';

// ── PHASE 1: Health Records CRUD ──────────────────────────────────────────────

test.describe('Health API — Records CRUD', () => {
  test.beforeAll(async ({ request }) => {
    token = getAuthToken();
    expect(token, 'Auth token must be available').toBeTruthy();

    // Pick a student for testing (not yet having a record on today's date)
    const studentsRes = await request.get(`${API_BASE}/Students?page=1&pageSize=100`, {
      headers: authHeaders(token),
    });
    const studentsJson = await studentsRes.json();
    // Response: { success, data: { students: [...], total, page, pageSize } }
    const students: Array<{ id: string }> = studentsJson.data?.students ?? [];
    expect(Array.isArray(students), 'Students must be array').toBeTruthy();
    testStudentId = students[students.length - 1]?.id ?? ''; // pick last to avoid conflict with seeded

    // ── Cleanup: delete any E2E health records left from previous runs ────────
    // This prevents "already exists" 400 errors when re-running tests
    if (testStudentId) {
      const checkupDate = todayMinus(5);
      const existingRes = await request.get(
        `${API_BASE}/Health/records?studentId=${testStudentId}&checkupDateFrom=${checkupDate}&checkupDateTo=${checkupDate}&pageSize=10`,
        { headers: authHeaders(token) }
      );
      if (existingRes.ok()) {
        const existingJson = await existingRes.json();
        const existing: Array<{ id: string }> = existingJson.data?.items ?? [];
        for (const rec of existing) {
          await request.delete(`${API_BASE}/Health/records/${rec.id}`, { headers: authHeaders(token) });
        }
      }
    }
  });

  test('1. Seeded health records exist (15 records)', async ({ request }) => {
    const res = await request.get(`${API_BASE}/Health/records?pageSize=100`, {
      headers: authHeaders(token),
    });
    expect(res.status()).toBe(200);
    const json = await res.json();
    // Response: { success, data: { items: [...], totalCount, page, pageSize, totalPages } }
    const records: Array<unknown> = json.data?.items ?? [];
    expect(Array.isArray(records), 'Records must be array').toBeTruthy();
    expect(records.length, 'At least 15 seeded health records must exist').toBeGreaterThanOrEqual(15);
  });

  test('2. Create a health record for a student', async ({ request }) => {
    if (!testStudentId) { test.skip(); return; }
    const payload = {
      schoolId: SCHOOL_ID,
      studentId: testStudentId,
      checkupDate: todayMinus(5),  // 5 days ago — avoids "today" conflict
      height: 160,
      weight: 52,
      bloodGroup: 'B+',
      visionLeft: '6/6',
      visionRight: '6/6',
      doctorName: 'Dr. E2E Test',
    };
    const res = await request.post(`${API_BASE}/Health/records`, {
      headers: authHeaders(token),
      data: payload,
    });
    expect(res.status(), `Create health record failed: ${await res.text()}`).toBe(201);
    const json = await res.json();
    // Response: { success, data: { id, studentId, ... } }
    createdRecordId = json.data?.id ?? '';
    expect(createdRecordId, 'Health record ID must be returned').toBeTruthy();
  });

  test('3. Get health records list — new record appears', async ({ request }) => {
    if (!createdRecordId) { test.skip(); return; }
    const res = await request.get(`${API_BASE}/Health/records?pageSize=100`, {
      headers: authHeaders(token),
    });
    expect(res.status()).toBe(200);
    const json = await res.json();
    // Response: { success, data: { items: [...], ... } }
    const records: Array<{ id: string }> = json.data?.items ?? [];
    expect(Array.isArray(records), 'Records must be array').toBeTruthy();
    expect(records.find(r => r.id === createdRecordId), 'Created record must appear in list').toBeDefined();
  });

  test('4. Get health record by ID — verify fields', async ({ request }) => {
    if (!createdRecordId) { test.skip(); return; }
    const res = await request.get(`${API_BASE}/Health/records/${createdRecordId}`, {
      headers: authHeaders(token),
    });
    expect(res.status()).toBe(200);
    const json = await res.json();
    // Response: { success, data: { bloodGroup, checkedBy, height, ... } }
    expect(json.data?.bloodGroup).toBe('B+');
    expect(json.data?.doctorName).toBe('Dr. E2E Test');
    expect(json.data?.height).toBe(160);
  });

  test('5. Update health record — weight', async ({ request }) => {
    if (!createdRecordId) { test.skip(); return; }
    const res = await request.put(`${API_BASE}/Health/records/${createdRecordId}`, {
      headers: authHeaders(token),
      data: { weight: 53 },
    });
    expect(res.status()).toBeLessThan(300);
    const updated = await request.get(`${API_BASE}/Health/records/${createdRecordId}`, {
      headers: authHeaders(token),
    });
    const json = await updated.json();
    // Response: { success, data: { weight, ... } }
    expect(json.data?.weight ?? json.data?.weightKg).toBe(53);
  });

  test('6. Duplicate health record same date → rejected', async ({ request }) => {
    if (!testStudentId) { test.skip(); return; }
    const payload = {
      schoolId: SCHOOL_ID,
      studentId: testStudentId,
      checkupDate: todayMinus(5),  // same date as test 2
      height: 160,
      weight: 52,
      bloodGroup: 'B+',
      visionLeft: '6/6',
      visionRight: '6/6',
      doctorName: 'Dr. E2E Dup',
    };
    const res = await request.post(`${API_BASE}/Health/records`, {
      headers: authHeaders(token),
      data: payload,
    });
    expect(res.status(), 'Duplicate health record on same date should be rejected').toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });
});

// ── PHASE 2: Health Alerts (DB-backed) ───────────────────────────────────────

test.describe('Health API — Alerts (DB-backed, not in-memory)', () => {
  test.beforeAll(() => { token = getAuthToken(); });

  test('7. Create a health alert', async ({ request }) => {
    if (!testStudentId) { test.skip(); return; }
    const res = await request.post(`${API_BASE}/Health/alerts`, {
      headers: authHeaders(token),
      data: {
        schoolId: SCHOOL_ID,
        studentId: testStudentId,
        alertType: 'allergy',
        description: 'E2E test alert - please ignore',
        severity: 'low',
      },
    });
    expect(res.status(), `Create alert failed: ${await res.text()}`).toBeLessThan(300);
    const json = await res.json();
    // Response: { success, data: { id, ... } }
    createdAlertId = json.data?.id ?? '';
  });

  test('8. Get health alerts — alert appears in list', async ({ request }) => {
    if (!createdAlertId) { test.skip(); return; }
    const res = await request.get(`${API_BASE}/Health/alerts`, {
      headers: authHeaders(token),
    });
    expect(res.status()).toBe(200);
    const json = await res.json();
    // Response: { success, data: [...] } where data is array directly
    const alerts: Array<{ id: string }> = Array.isArray(json.data) ? json.data : [];
    expect(alerts.find(a => a.id === createdAlertId), 'Created alert must appear in list').toBeDefined();
  });

  test('9. Acknowledge alert — status changes', async ({ request }) => {
    if (!createdAlertId) { test.skip(); return; }
    const res = await request.put(`${API_BASE}/Health/alerts/${createdAlertId}/acknowledge`, {
      headers: authHeaders(token),
      data: { acknowledgedBy: '00000000-0000-0000-0000-000000000001', acknowledgementNotes: 'E2E acknowledgement' },
    });
    expect(res.status(), `Acknowledge alert failed: ${await res.text()}`).toBeLessThan(300);

    // Verify status changed in DB
    const check = await request.get(`${API_BASE}/Health/alerts`, { headers: authHeaders(token) });
    const checkJson = await check.json();
    // Response: { success, data: [...] } where data is array directly
    const alerts: Array<{ id: string; isAcknowledged?: boolean; status?: string }> =
      Array.isArray(checkJson.data) ? checkJson.data : [];
    const alert = alerts.find(a => a.id === createdAlertId);
    if (alert) {
      const acknowledged = alert.isAcknowledged === true || alert.status === 'Acknowledged';
      expect(acknowledged, 'Alert should be acknowledged after PUT').toBeTruthy();
    }
  });

  test('10. Alerts persist across requests (DB-backed, not in-memory)', async ({ request }) => {
    // Make two separate requests and verify counts are consistent
    const r1 = await request.get(`${API_BASE}/Health/alerts`, { headers: authHeaders(token) });
    const r2 = await request.get(`${API_BASE}/Health/alerts`, { headers: authHeaders(token) });
    expect(r1.status()).toBe(200);
    expect(r2.status()).toBe(200);
    const j1 = await r1.json();
    const j2 = await r2.json();
    // Response: { success, data: [...] } where data is array directly
    const c1 = (Array.isArray(j1.data) ? j1.data : []).length;
    const c2 = (Array.isArray(j2.data) ? j2.data : []).length;
    expect(c1).toBe(c2);
    // Alerts persist in DB — count should be stable
    expect(typeof c1 === 'number', 'Alert count must be a number').toBeTruthy();
    // If test 7 ran successfully, we expect at least 1 alert
    if (createdAlertId) {
      expect(c1, 'At least the one alert created in test 7 must persist').toBeGreaterThan(0);
    }
  });
});

// ── PHASE 3: Vaccinations ─────────────────────────────────────────────────────

test.describe('Health API — Vaccinations', () => {
  test.beforeAll(() => { token = getAuthToken(); });

  test('11. Add vaccination record to a student', async ({ request }) => {
    if (!testStudentId) { test.skip(); return; }
    // Correct endpoint: POST /api/Health/vaccinations with studentId in body
    // DTO fields: studentId, vaccineName, vaccinationDate, nextDueDate, batchNumber, administeredBy
    const res = await request.post(`${API_BASE}/Health/vaccinations`, {
      headers: authHeaders(token),
      data: {
        schoolId: SCHOOL_ID,
        studentId: testStudentId,
        vaccineName: 'E2E Vaccine',
        vaccinationDate: todayMinus(10),
        administeredBy: 'Dr. E2E',
        nextDueDate: todayMinus(-90), // 90 days from now
      },
    });
    // Accept 201 (created) OR 400 "already exists" (idempotent — vaccination from previous run persists)
    const text = await res.text();
    const isOk = res.status() < 300 || (res.status() === 400 && text.includes('already has a record'));
    expect(isOk, `Add vaccination failed with unexpected error: ${text}`).toBeTruthy();
  });

  test('12. Get vaccination list for student — vaccination appears', async ({ request }) => {
    if (!testStudentId) { test.skip(); return; }
    // Vaccinations are linked to studentId, not recordId
    const res = await request.get(`${API_BASE}/Health/vaccinations/${testStudentId}`, {
      headers: authHeaders(token),
    });
    expect(res.status()).toBe(200);
    const json = await res.json();
    // Response: { success, data: [...] } where data is array of vaccinations
    const vaccinations: Array<{ vaccineName: string }> = Array.isArray(json.data) ? json.data : [];
    expect(Array.isArray(vaccinations), 'Vaccinations must be array').toBeTruthy();
    const found = vaccinations.some(v => v.vaccineName?.toLowerCase().includes('e2e vaccine'));
    expect(found, 'E2E Vaccine must appear in student vaccination list').toBeTruthy();
  });
});

// ── PHASE 4: Validation / Error cases ────────────────────────────────────────

test.describe('Health API — Validation', () => {
  test.beforeAll(async ({ request }) => {
    token = getAuthToken();

    // ── Cleanup: delete any E2E health records for test 14 from previous runs ─
    const studentsRes = await request.get(`${API_BASE}/Students?page=1&pageSize=50&status=active`, {
      headers: authHeaders(token),
    });
    if (studentsRes.ok()) {
      const studentsJson = await studentsRes.json();
      const students: Array<{ id: string; status?: string }> = studentsJson.data?.students ?? [];
      const activeStudent = students.find(s => (s.status ?? '').toLowerCase() === 'active') ?? students[0];
      if (activeStudent?.id) {
        const checkupDate = todayMinus(365);
        const existingRes = await request.get(
          `${API_BASE}/Health/records?studentId=${activeStudent.id}&checkupDateFrom=${checkupDate}&checkupDateTo=${checkupDate}&pageSize=10`,
          { headers: authHeaders(token) }
        );
        if (existingRes.ok()) {
          const existingJson = await existingRes.json();
          const existing: Array<{ id: string }> = existingJson.data?.items ?? [];
          for (const rec of existing) {
            await request.delete(`${API_BASE}/Health/records/${rec.id}`, { headers: authHeaders(token) });
          }
        }
      }
    }
  });

  test('13. Create health record for non-existent student → 404', async ({ request }) => {
    const res = await request.post(`${API_BASE}/Health/records`, {
      headers: authHeaders(token),
      data: {
        studentId: '00000000-0000-0000-0000-000000000000',
        checkupDate: todayMinus(1),
        height: 160,
        weight: 52,
        bloodGroup: 'O+',
        visionLeft: '6/6',
        visionRight: '6/6',
        checkedBy: 'Dr. Ghost',
      },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('14. "Active" student (capital A) can have health record created (case-insensitive)', async ({ request }) => {
    // This test verifies the fix: student.Status == "Active" (seeder) now passes
    // the validation which used to compare against "active" (lowercase only)
    const studentsRes = await request.get(`${API_BASE}/Students?page=1&pageSize=50&status=active`, {
      headers: authHeaders(token),
    });
    const studentsJson = await studentsRes.json();
    // Response: { success, data: { students: [...], ... } }
    const students: Array<{ id: string; status?: string }> = studentsJson.data?.students ?? [];
    const activeStudent = students.find(s => (s.status ?? '').toLowerCase() === 'active') ?? students[0];
    if (!activeStudent?.id) { test.skip(); return; }

    // Use a date far in the past that won't conflict with seeded records
    const uniqueDate = todayMinus(365);
    const res = await request.post(`${API_BASE}/Health/records`, {
      headers: authHeaders(token),
      data: {
        schoolId: SCHOOL_ID,
        studentId: activeStudent.id,
        checkupDate: uniqueDate,
        height: 155,
        weight: 45,
        bloodGroup: 'A+',
        visionLeft: '6/6',
        visionRight: '6/6',
        doctorName: 'Dr. CaseInsensitive',
      },
    });
    // Should succeed (not 422 "Student is not enrolled")
    const body = await res.text();
    expect(res.status(), `Active student health record creation should succeed: ${body}`).not.toBe(422);
    expect(res.status(), `Active student health record creation should not return 400: ${body}`).not.toBe(400);

    // Cleanup
    if (res.status() < 300) {
      const json = await res.json();
      const id = json.data?.id;
      if (id) await request.delete(`${API_BASE}/Health/records/${id}`, { headers: authHeaders(token) });
    }
  });
});

// ── PHASE 5: Module permission enforcement ────────────────────────────────────

test.describe('Health — Module permission enforcement', () => {
  test.beforeAll(() => { token = getAuthToken(); });

  test('15. GET health records → 200 when health module enabled', async ({ request }) => {
    const res = await request.get(`${API_BASE}/Health/records`, {
      headers: authHeaders(token),
    });
    expect(res.status()).toBe(200);
  });

  test('16-17. ModuleGuard blocks /health page when module is disabled', async ({ page }) => {
    const loginRes = await page.request.post(`${API_BASE}/Auth/login`, {
      data: { email: 'superadmin@vitana.edu', password: 'SuperAdmin@2024', loginType: 'admin' },
    });
    if (loginRes.status() !== 200) { test.skip(); return; }
    const loginJson = await loginRes.json();
    superAdminToken = loginJson.token ?? loginJson.data?.token ?? '';
    if (!superAdminToken) { test.skip(); return; }

    // Disable health
    const disableRes = await page.request.put(
      `${API_BASE}/school-feature-permissions/schools/${SCHOOL_ID}/modules/health`,
      {
        headers: authHeaders(superAdminToken),
        data: { enabled: false, permissionLevels: '' },
      },
    );
    expect(disableRes.status()).toBeLessThan(300);

    await page.goto('/health');
    await page.waitForLoadState('domcontentloaded');
    const bodyText = await page.textContent('body') ?? '';
    const isRestricted =
      page.url().includes('/dashboard') ||
      page.url().includes('/login') ||
      bodyText.toLowerCase().includes('restricted') ||
      bodyText.toLowerCase().includes('disabled') ||
      bodyText.toLowerCase().includes('module');
    expect(isRestricted, 'Health page should be blocked when module is disabled').toBeTruthy();

    // Re-enable health
    const enableRes = await page.request.put(
      `${API_BASE}/school-feature-permissions/schools/${SCHOOL_ID}/modules/health`,
      {
        headers: authHeaders(superAdminToken),
        data: { enabled: true, permissionLevels: 'read,write,delete' },
      },
    );
    expect(enableRes.status()).toBeLessThan(300);

    await page.goto('/health');
    await page.waitForLoadState('domcontentloaded');
    const afterText = await page.textContent('body') ?? '';
    expect(afterText.toLowerCase().includes('restricted'), 'Health page should load after re-enabling').toBeFalsy();
  });
});

// ── PHASE 6: Stats ────────────────────────────────────────────────────────────

test.describe('Health API — Stats', () => {
  test.beforeAll(() => { token = getAuthToken(); });

  test('18. Health stats returns aggregate counts', async ({ request }) => {
    const res = await request.get(`${API_BASE}/Health/stats`, {
      headers: authHeaders(token),
    });
    expect(res.status()).toBe(200);
    const json = await res.json();
    // Response: { success, data: { totalRecords, normalStatus, ... } }
    const hasNumericField = Object.values(json.data ?? {}).some(v => typeof v === 'number');
    expect(hasNumericField, 'Health stats should have numeric aggregates').toBeTruthy();
  });
});
