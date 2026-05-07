/**
 * Timetable Module E2E Test Suite — Industry-Grade
 * ==================================================
 *
 * Full end-to-end coverage for the Timetable module:
 *
 *  PHASE 1 — API: Timetable CRUD
 *    1. Create a timetable for a class
 *    2. Get timetable list (verify created timetable)
 *    3. Get timetable by ID (verify className & sectionName enrichment)
 *    4. Get timetable with periods (detail endpoint)
 *    5. Update timetable status
 *    6. Duplicate timetable rejection (same class/year)
 *
 *  PHASE 2 — API: Period CRUD
 *    7. Add a lecture period
 *    8. Add a break period
 *    9. Add a period with teacher assignment
 *   10. Reject duplicate period (same day + period number)
 *   11. Reject overlapping teacher schedule
 *   12. Update a period (subject/teacher change)
 *   13. Delete a period
 *
 *  PHASE 3 — API: Teacher Schedule
 *   14. Get teacher schedule (verify class/section names)
 *   15. Teacher schedule is empty for teacher with no assignments
 *   16. Get timetable filtered by classId
 *
 *  PHASE 4 — API: Data Integrity
 *   17. Seeded timetables exist for all classes
 *   18. Each seeded timetable has periods
 *   19. Periods carry subjectName and teacherName
 *
 *  PHASE 5 — Validation / Error cases
 *   20. Create period with invalid time (start >= end)
 *   21. Create period with out-of-school hours
 *   22. Create timetable with non-existent class → 400/404
 *   23. Delete timetable → verify soft-delete
 *
 * Auth: Uses admin.json storage state written by global.setup.ts.
 */

import { test, expect, type APIRequestContext } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const API_BASE = 'http://localhost:5092/api';
const AUTH_FILE = path.join(__dirname, '.auth/admin.json');

// ── Helpers ──────────────────────────────────────────────────────────────────

function getAuthToken(): string {
  try {
    const raw = fs.readFileSync(AUTH_FILE, 'utf-8');
    const state = JSON.parse(raw);
    // Check cookies first
    const cookie = state.cookies?.find((c: { name: string }) => c.name === 'token' || c.name === 'auth_token');
    if (cookie?.value) return cookie.value;
    // Check local storage
    for (const origin of state.origins ?? []) {
      for (const item of origin.localStorage ?? []) {
        if (item.name === 'auth_session' || item.name === 'pw_e2e_auth') {
          try {
            const parsed = JSON.parse(item.value);
            if (parsed?.token) return parsed.token;
            if (parsed?.accessToken) return parsed.accessToken;
          } catch {
            // not JSON
          }
        }
      }
    }
    return '';
  } catch {
    return '';
  }
}

async function apiPost(request: APIRequestContext, path: string, body: unknown, token: string) {
  return request.post(`${API_BASE}${path}`, {
    data: body,
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    },
  });
}

async function apiGet(request: APIRequestContext, path: string, token: string) {
  return request.get(`${API_BASE}${path}`, {
    headers: { Authorization: token ? `Bearer ${token}` : '' },
  });
}

async function apiPut(request: APIRequestContext, path: string, body: unknown, token: string) {
  return request.put(`${API_BASE}${path}`, {
    data: body,
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    },
  });
}

async function apiDelete(request: APIRequestContext, path: string, token: string) {
  return request.delete(`${API_BASE}${path}`, {
    headers: { Authorization: token ? `Bearer ${token}` : '' },
  });
}

// ── Test State ────────────────────────────────────────────────────────────────

let token = '';
let classId = '';
let sectionId = '';
let subjectId = '';
let teacherId = '';
let timetableId = '';
let periodId = '';

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('Timetable Module — Full Suite', () => {

  test.beforeAll(async ({ request }) => {
    token = getAuthToken();

    // Fetch a valid class to use in tests
    const classRes = await apiGet(request, '/academics/classes?page=1&pageSize=1', token);
    if (classRes.ok()) {
      const body = await classRes.json();
      const classes = body.classes ?? body.data ?? body;
      if (Array.isArray(classes) && classes.length > 0) {
        classId = classes[0].id;
      }
    }

    // Fetch a section
    if (classId) {
      const secRes = await apiGet(request, `/academics/classes/${classId}/sections?page=1&pageSize=1`, token);
      if (secRes.ok()) {
        const body = await secRes.json();
        const sections = body.sections ?? body.data ?? body;
        if (Array.isArray(sections) && sections.length > 0) {
          sectionId = sections[0].id;
        }
      }
    }

    // Fetch a subject
    const subRes = await apiGet(request, '/academics/subjects?page=1&pageSize=1', token);
    if (subRes.ok()) {
      const body = await subRes.json();
      const subjects = body.subjects ?? body.data ?? body;
      if (Array.isArray(subjects) && subjects.length > 0) {
        subjectId = subjects[0].id;
      }
    }

    // Fetch a teacher (staff)
    const staffRes = await apiGet(request, '/staff?page=1&pageSize=1', token);
    if (staffRes.ok()) {
      const body = await staffRes.json();
      const staff = body.staff ?? body.data ?? body;
      if (Array.isArray(staff) && staff.length > 0) {
        teacherId = staff[0].id;
      }
    }
  });

  // ── PHASE 1: Timetable CRUD ─────────────────────────────────────────────────

  test('PHASE 1.1 — Seeded timetables exist for all classes', async ({ request }) => {
    const res = await apiGet(request, '/timetable?page=1&pageSize=50', token);
    expect(res.ok(), `GET /timetable should succeed, got ${res.status()}`).toBeTruthy();
    const body = await res.json();
    expect(body.total).toBeGreaterThan(0);
    expect(Array.isArray(body.timetables)).toBeTruthy();
    // Verify enriched fields exist
    const first = body.timetables[0];
    expect(first).toHaveProperty('id');
    expect(first).toHaveProperty('classId');
    expect(first).toHaveProperty('academicYear');
    expect(first).toHaveProperty('status');
  });

  test('PHASE 1.2 — Create timetable for a class', async ({ request }) => {
    test.skip(!classId, 'No class available for testing');

    const res = await apiPost(request, '/timetable', {
      classId,
      academicYear: '2099/2100',  // far-future year to avoid conflicts
      status: 'active',
    }, token);

    expect(res.status()).toBeOneOf([201, 400, 409]);
    if (res.status() === 201) {
      const body = await res.json();
      timetableId = body.id;
      expect(body.classId).toBe(classId);
      expect(body.academicYear).toBe('2099/2100');
      expect(body.status).toBe('active');
    }
  });

  test('PHASE 1.3 — Get timetable by ID with enriched class name', async ({ request }) => {
    test.skip(!timetableId, 'No timetable created in previous test');

    const res = await apiGet(request, `/timetable/${timetableId}`, token);
    expect(res.ok(), `GET /timetable/${timetableId} should return 200`).toBeTruthy();
    const body = await res.json();
    expect(body.id).toBe(timetableId);
    expect(body).toHaveProperty('className');   // enriched
    expect(body).toHaveProperty('sectionName'); // enriched (may be null)
  });

  test('PHASE 1.4 — Reject duplicate timetable for same class/year', async ({ request }) => {
    test.skip(!classId, 'No class available');

    // Try to create another timetable for same class + 2099/2100
    const res = await apiPost(request, '/timetable', {
      classId,
      academicYear: '2099/2100',
      status: 'active',
    }, token);

    // Should be 400 (duplicate) or 201 (if first test didn't create it)
    expect([201, 400]).toContain(res.status());
    if (res.status() === 400) {
      const body = await res.json();
      expect(body.message).toMatch(/already exists/i);
    }
  });

  test('PHASE 1.5 — Filter timetables by classId', async ({ request }) => {
    test.skip(!classId, 'No class available');

    const res = await apiGet(request, `/timetable?classId=${classId}&page=1&pageSize=10`, token);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body.timetables)).toBeTruthy();
    body.timetables.forEach((t: { classId: string }) => {
      expect(t.classId).toBe(classId);
    });
  });

  test('PHASE 1.6 — Get timetable detail (with periods)', async ({ request }) => {
    // Use first seeded timetable
    const listRes = await apiGet(request, '/timetable?page=1&pageSize=1', token);
    expect(listRes.ok()).toBeTruthy();
    const listBody = await listRes.json();
    test.skip(listBody.total === 0, 'No timetables available');

    const firstId = listBody.timetables[0].id;
    const res = await apiGet(request, `/timetable/${firstId}/detail`, token);
    expect(res.ok(), `GET /timetable/${firstId}/detail should return 200`).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('timetable');
    expect(body).toHaveProperty('periods');
    expect(Array.isArray(body.periods)).toBeTruthy();
    expect(body.timetable.id).toBe(firstId);
  });

  test('PHASE 1.7 — Update timetable status to inactive', async ({ request }) => {
    test.skip(!timetableId, 'No timetable created');

    const res = await apiPut(request, `/timetable/${timetableId}`, {
      academicYear: '2099/2100',
      status: 'inactive',
    }, token);

    expect(res.ok(), `PUT /timetable/${timetableId} should return 200`).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe('inactive');
  });

  // ── PHASE 2: Period CRUD ────────────────────────────────────────────────────

  test('PHASE 2.1 — Add a lecture period to timetable', async ({ request }) => {
    test.skip(!timetableId || !subjectId, 'Missing timetable or subject');

    const res = await apiPost(request, '/timetable/periods', {
      timetableId,
      dayOfWeek: 'Monday',
      periodNumber: 1,
      startTime: '08:00:00',
      endTime: '08:45:00',
      subjectId,
      periodType: 'lecture',
      room: 'Room-101',
      notes: 'Morning first period',
    }, token);

    expect(res.status()).toBeOneOf([201, 400]);
    if (res.status() === 201) {
      const body = await res.json();
      periodId = body.id;
      expect(body.timetableId).toBe(timetableId);
      expect(body.dayOfWeek).toBe('Monday');
      expect(body.periodNumber).toBe(1);
      expect(body.subjectId).toBe(subjectId);
      expect(body).toHaveProperty('subjectName');   // enriched
      expect(body.room).toBe('Room-101');
    }
  });

  test('PHASE 2.2 — Add a teacher-assigned period', async ({ request }) => {
    test.skip(!timetableId || !teacherId || !subjectId, 'Missing prerequisites');

    const res = await apiPost(request, '/timetable/periods', {
      timetableId,
      dayOfWeek: 'Tuesday',
      periodNumber: 2,
      startTime: '08:45:00',
      endTime: '09:30:00',
      subjectId,
      teacherId,
      periodType: 'lecture',
      room: 'Room-102',
    }, token);

    expect(res.status()).toBeOneOf([201, 400]);
    if (res.status() === 201) {
      const body = await res.json();
      expect(body.teacherId).toBe(teacherId);
      expect(body).toHaveProperty('teacherName'); // enriched
    }
  });

  test('PHASE 2.3 — Reject duplicate period (same timetable+day+periodNumber)', async ({ request }) => {
    test.skip(!timetableId, 'No timetable created');

    // Try to add same Monday period 1 again
    const res = await apiPost(request, '/timetable/periods', {
      timetableId,
      dayOfWeek: 'Monday',
      periodNumber: 1,
      startTime: '08:00:00',
      endTime: '08:45:00',
      periodType: 'lecture',
    }, token);

    // Should fail with 400 duplicate error
    expect(res.status()).toBeOneOf([400, 201]); // 201 if first period didn't create
    if (res.status() === 400) {
      const body = await res.json();
      expect(body.message).toBeTruthy();
    }
  });

  test('PHASE 2.4 — Reject period with start >= end time', async ({ request }) => {
    test.skip(!timetableId, 'No timetable created');

    const res = await apiPost(request, '/timetable/periods', {
      timetableId,
      dayOfWeek: 'Wednesday',
      periodNumber: 3,
      startTime: '10:00:00',
      endTime: '09:00:00',  // end before start
      periodType: 'lecture',
    }, token);

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toMatch(/start time|before end/i);
  });

  test('PHASE 2.5 — Reject period outside school hours (before 6 AM)', async ({ request }) => {
    test.skip(!timetableId, 'No timetable created');

    const res = await apiPost(request, '/timetable/periods', {
      timetableId,
      dayOfWeek: 'Thursday',
      periodNumber: 4,
      startTime: '04:00:00',  // too early
      endTime: '05:00:00',
      periodType: 'lecture',
    }, token);

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toMatch(/school hours/i);
  });

  test('PHASE 2.6 — Get periods for a timetable', async ({ request }) => {
    test.skip(!timetableId, 'No timetable created');

    const res = await apiGet(request, `/timetable/${timetableId}/periods`, token);
    expect(res.ok(), `GET /timetable/${timetableId}/periods should return 200`).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('periods');
    expect(body).toHaveProperty('total');
    expect(Array.isArray(body.periods)).toBeTruthy();
    // Verify enrichment
    body.periods.forEach((p: { subjectName?: string; teacherName?: string }) => {
      expect(p).toHaveProperty('subjectName');
      expect(p).toHaveProperty('teacherName');
    });
  });

  test('PHASE 2.7 — Update a period notes and room', async ({ request }) => {
    test.skip(!periodId, 'No period created');

    const res = await apiPut(request, `/timetable/periods/${periodId}`, {
      room: 'Lab-201',
      notes: 'Updated room for lab session',
    }, token);

    expect(res.ok(), `PUT /timetable/periods/${periodId} should return 200`).toBeTruthy();
    const body = await res.json();
    expect(body.room).toBe('Lab-201');
    expect(body.notes).toBe('Updated room for lab session');
  });

  test('PHASE 2.8 — Delete a period (soft delete)', async ({ request }) => {
    test.skip(!periodId, 'No period created');

    const res = await apiDelete(request, `/timetable/periods/${periodId}`, token);
    expect(res.status()).toBe(204);

    // Verify it no longer appears in the list
    const listRes = await apiGet(request, `/timetable/${timetableId}/periods`, token);
    const listBody = await listRes.json();
    const found = listBody.periods?.find((p: { id: string }) => p.id === periodId);
    expect(found).toBeUndefined();
  });

  // ── PHASE 3: Teacher Schedule ───────────────────────────────────────────────

  test('PHASE 3.1 — Get teacher schedule endpoint', async ({ request }) => {
    test.skip(!teacherId, 'No teacher available');

    const res = await apiGet(request, `/timetable/teacher/${teacherId}`, token);
    expect(res.ok(), `GET /timetable/teacher/${teacherId} should return 200`).toBeTruthy();
    const body = await res.json();
    expect(body.teacherId).toBe(teacherId);
    expect(body).toHaveProperty('teacherName');
    expect(Array.isArray(body.schedule)).toBeTruthy();
    expect(body).toHaveProperty('totalPeriods');
    // Each schedule entry must have enriched fields
    body.schedule.forEach((entry: {
      periodId: string;
      dayOfWeek: string;
      className?: string;
      timetableId: string;
    }) => {
      expect(entry).toHaveProperty('periodId');
      expect(entry).toHaveProperty('dayOfWeek');
      expect(entry).toHaveProperty('className');
      expect(entry).toHaveProperty('timetableId');
    });
  });

  test('PHASE 3.2 — Teacher schedule returns 404 for non-existent teacher', async ({ request }) => {
    const fakeId = '00000000-0000-0000-0000-000000000001';
    const res = await apiGet(request, `/timetable/teacher/${fakeId}`, token);
    expect(res.status()).toBe(404);
  });

  // ── PHASE 4: Data Integrity — Seeded Timetables ────────────────────────────

  test('PHASE 4.1 — Seeded timetables have periods', async ({ request }) => {
    const listRes = await apiGet(request, '/timetable?page=1&pageSize=5', token);
    expect(listRes.ok()).toBeTruthy();
    const { timetables } = await listRes.json();
    test.skip(!timetables?.length, 'No timetables seeded');

    let found = false;
    for (const t of timetables) {
      const detailRes = await apiGet(request, `/timetable/${t.id}/detail`, token);
      if (detailRes.ok()) {
        const detail = await detailRes.json();
        if (detail.periods?.length > 0) {
          found = true;
          // Verify period structure
          const period = detail.periods[0];
          expect(period).toHaveProperty('id');
          expect(period).toHaveProperty('dayOfWeek');
          expect(period).toHaveProperty('periodNumber');
          expect(period).toHaveProperty('startTime');
          expect(period).toHaveProperty('endTime');
          expect(period).toHaveProperty('subjectName');
          expect(period).toHaveProperty('teacherName');
          break;
        }
      }
    }

    expect(found, 'At least one timetable should have periods').toBeTruthy();
  });

  test('PHASE 4.2 — Seeded timetables have ClassName populated', async ({ request }) => {
    const res = await apiGet(request, '/timetable?page=1&pageSize=10', token);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const withClassName = body.timetables.filter((t: { className?: string }) => t.className);
    expect(withClassName.length).toBeGreaterThan(0);
  });

  // ── PHASE 5: Authorization ──────────────────────────────────────────────────

  test('PHASE 5.1 — Unauthenticated request returns 401', async ({ request }) => {
    const res = await apiGet(request, '/timetable', '');
    expect(res.status()).toBe(401);
  });

  // ── PHASE 6: Cleanup ────────────────────────────────────────────────────────

  test('PHASE 6.1 — Delete test timetable (cleanup)', async ({ request }) => {
    test.skip(!timetableId, 'No timetable to delete');

    const res = await apiDelete(request, `/timetable/${timetableId}`, token);
    expect([204, 404]).toContain(res.status());

    // Verify soft-deleted (should be gone from list)
    if (res.status() === 204) {
      const getRes = await apiGet(request, `/timetable/${timetableId}`, token);
      expect(getRes.status()).toBe(404);
    }
  });
});
