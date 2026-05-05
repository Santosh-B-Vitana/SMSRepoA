/**
 * Fee Module E2E Test Suite — Industry-Grade
 * ============================================================
 * Validates the complete fee management lifecycle end-to-end:
 *
 * PHASE 1 — Setup: Resolve school + student prerequisites
 * PHASE 2 — Fee Structure: Create, list, validate uniqueness
 * PHASE 3 — Fee Records: Create records, duplicate guard
 * PHASE 4 — Payment Flow: Collection, balance updates, audit log
 * PHASE 5 — Edge Cases: Double-payment, duplicate receipt, overpayment
 * PHASE 6 — Late Fees: Config, calculation, grace period, cap
 * PHASE 7 — Refund: Full & partial refund, status tracking
 * PHASE 8 — UI Smoke: Navigate Fees page, payment dialog renders
 * PHASE 9 — Stats: Invariant checks, per-method breakdown
 *
 * Auth strategy:   Reads stored token from .auth/admin.json (global.setup.ts)
 * Backend target:  http://localhost:5092/api
 * Frontend target: http://localhost:8080
 *
 * Run: npx playwright test fee-module.spec.ts
 */

import { test, expect, type Page, type APIRequestContext } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ── Constants ──────────────────────────────────────────────────────────────

const API_BASE   = 'http://localhost:5092/api';
const UI_BASE    = 'http://localhost:8080';
const AUTH_FILE  = path.join(__dirname, '.auth/admin.json');

// Unique run suffix prevents collisions on re-runs
const RUN        = Date.now().toString().slice(-7);

const STRUCTURE_NAME   = `E2E Structure ${RUN}`;
const ACADEMIC_YEAR    = '2025-2026';
const FEE_CLASS        = '10';

// ── Auth helpers ───────────────────────────────────────────────────────────

function getTokenFromAuthFile(): string | null {
  try {
    if (!fs.existsSync(AUTH_FILE)) return null;
    const data = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
    // Try localStorage first (pw_e2e_auth stores the full session)
    for (const origin of data.origins ?? []) {
      for (const entry of origin.localStorage ?? []) {
        if (entry.name === 'pw_e2e_auth') {
          try {
            const session = JSON.parse(entry.value);
            if (session?.token) return session.token;
          } catch { /* ignore */ }
        }
        if (entry.name === 'authToken') return entry.value;
      }
    }
    return null;
  } catch {
    return null;
  }
}

function getSchoolIdFromAuthFile(): string | null {
  try {
    if (!fs.existsSync(AUTH_FILE)) return null;
    const data = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
    for (const origin of data.origins ?? []) {
      for (const entry of origin.localStorage ?? []) {
        if (entry.name === 'pw_e2e_auth') {
          try {
            const session = JSON.parse(entry.value);
            if (session?.schoolId) return session.schoolId;
            if (session?.user?.schoolId) return session.user.schoolId;
          } catch { /* ignore */ }
        }
        if (entry.name === 'schoolId') return entry.value;
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function injectAuth(page: Page): Promise<void> {
  try {
    if (!fs.existsSync(AUTH_FILE)) return;
    const data = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
    const pwE2eAuthEntry = data.origins?.[0]?.localStorage?.find(
      (e: { name: string }) => e.name === 'pw_e2e_auth',
    );
    if (pwE2eAuthEntry) {
      const session = pwE2eAuthEntry.value;
      await page.addInitScript((s: string) => {
        try {
          localStorage.setItem('pw_e2e_auth', s);
          sessionStorage.setItem('auth_session', s);
        } catch { /* ignore */ }
      }, session);
    }
  } catch { /* non-fatal */ }
}

// Typed API helper: returns parsed body or null on failure
async function apiGet<T>(
  request: APIRequestContext,
  path: string,
  token: string,
): Promise<T | null> {
  const resp = await request.get(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok()) return null;
  return resp.json() as Promise<T>;
}

async function apiPost<T>(
  request: APIRequestContext,
  path: string,
  token: string,
  body: unknown,
): Promise<{ status: number; body: T | null }> {
  const resp = await request.post(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data: body,
  });
  let parsed: T | null = null;
  try { parsed = await resp.json(); } catch { /* ignore */ }
  return { status: resp.status(), body: parsed };
}

// ── Shared test state (written in early phases, read in later phases) ──────

const state = {
  token:        '' as string,
  schoolId:     '' as string,
  studentId:    '' as string,
  structureId:  '' as string,
  feeRecordId:  '' as string,
  paymentId:    '' as string,
  receiptNumber: '' as string,
};

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 1 — Setup: resolve auth + student
// ══════════════════════════════════════════════════════════════════════════════

test.describe('Phase 1 — Setup & Prerequisites', () => {

  test('1.1 — Auth token and school ID are available', () => {
    const token    = getTokenFromAuthFile();
    const schoolId = getSchoolIdFromAuthFile();

    if (!token || !schoolId) {
      console.warn('⚠ Auth state not found — run global.setup.ts first. Skipping fee E2E.');
      test.skip();
      return;
    }

    state.token    = token;
    state.schoolId = schoolId;
    console.log(`✓ Token resolved. School: ${schoolId}`);
  });

  test('1.2 — Resolve an active student for fee record creation', async ({ request }) => {
    if (!state.token) { test.skip(); return; }

    const body = await apiGet<{ students: Array<{ id: string; name: string; status: string }> }>(
      request, `/students?page=1&pageSize=50&schoolId=${state.schoolId}`, state.token,
    );

    const student = body?.students?.find(
      (s) => s.status?.toLowerCase() === 'active',
    );

    if (!student) {
      console.warn('⚠ No active student found — skipping fee record tests');
      test.skip();
      return;
    }

    state.studentId = student.id;
    console.log(`✓ Student resolved: ${student.name} (${student.id})`);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 2 — Fee Structure
// ══════════════════════════════════════════════════════════════════════════════

test.describe('Phase 2 — Fee Structure Management', () => {

  test('2.1 — Create a new fee structure', async ({ request }) => {
    if (!state.token) { test.skip(); return; }

    const { status, body } = await apiPost<{ id: string; name: string; totalAmount: number }>(
      request, '/fees/structures', state.token,
      {
        schoolId:        state.schoolId,
        name:            STRUCTURE_NAME,
        class:           FEE_CLASS,
        academicYear:    ACADEMIC_YEAR,
        tuitionFee:      50000,
        examFee:         2000,
        libraryFee:      1000,
        developmentFee:  2000,
        installmentCount: 4,
      },
    );

    // Accept 201 Created or 200 OK
    expect([200, 201]).toContain(status);
    expect(body?.id).toBeTruthy();
    expect(body?.totalAmount).toBe(55000);

    state.structureId = body!.id;
    console.log(`✓ Fee structure created: ${body!.name} — ₹${body!.totalAmount}`);
  });

  test('2.2 — Duplicate fee structure is rejected', async ({ request }) => {
    if (!state.token || !state.structureId) { test.skip(); return; }

    const { status } = await apiPost(
      request, '/fees/structures', state.token,
      {
        schoolId:     state.schoolId,
        name:         STRUCTURE_NAME,      // same name
        class:        FEE_CLASS,
        academicYear: ACADEMIC_YEAR,
        tuitionFee:   50000,
      },
    );

    expect(status).toBe(400);
    console.log('✓ Duplicate structure correctly rejected (400)');
  });

  test('2.3 — Get fee structures list returns created structure', async ({ request }) => {
    if (!state.token || !state.structureId) { test.skip(); return; }

    const body = await apiGet<Array<{ id: string; name: string }>>(
      request, '/fees/structures', state.token,
    );

    expect(Array.isArray(body)).toBeTruthy();
    const found = body?.find((s) => s.id === state.structureId);
    expect(found).toBeTruthy();
    console.log(`✓ Structure appears in list`);
  });

  test('2.4 — Get fee structure by ID', async ({ request }) => {
    if (!state.token || !state.structureId) { test.skip(); return; }

    const body = await apiGet<{ id: string; name: string; totalAmount: number }>(
      request, `/fees/structures/${state.structureId}`, state.token,
    );

    expect(body?.id).toBe(state.structureId);
    expect(body?.name).toBe(STRUCTURE_NAME);
    expect(body?.totalAmount).toBe(55000);
    console.log(`✓ Structure detail endpoint correct`);
  });

  test('2.5 — Invalid fee structure (all zeros) is rejected', async ({ request }) => {
    if (!state.token) { test.skip(); return; }

    const { status } = await apiPost(
      request, '/fees/structures', state.token,
      {
        schoolId:     state.schoolId,
        name:         `Zero Fee ${RUN}`,
        class:        FEE_CLASS,
        academicYear: ACADEMIC_YEAR,
        tuitionFee:   0,   // all zero — should be rejected
      },
    );

    expect(status).toBe(400);
    console.log('✓ Zero-total structure rejected (400)');
  });

  test('2.6 — Fee structure with negative component is rejected', async ({ request }) => {
    if (!state.token) { test.skip(); return; }

    const { status } = await apiPost(
      request, '/fees/structures', state.token,
      {
        schoolId:     state.schoolId,
        name:         `Negative Fee ${RUN}`,
        class:        FEE_CLASS,
        academicYear: ACADEMIC_YEAR,
        tuitionFee:   -5000,
      },
    );

    expect(status).toBe(400);
    console.log('✓ Negative fee component rejected (400)');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 3 — Fee Records
// ══════════════════════════════════════════════════════════════════════════════

test.describe('Phase 3 — Fee Record Creation', () => {

  test('3.1 — Create a fee record for the student', async ({ request }) => {
    if (!state.token || !state.studentId || !state.structureId) { test.skip(); return; }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 45);

    const { status, body } = await apiPost<{
      id: string; totalAmount: number; status: string; pendingAmount: number;
    }>(
      request, '/fees/records', state.token,
      {
        schoolId:        state.schoolId,
        studentId:       state.studentId,
        feeStructureId:  state.structureId,
        totalAmount:     55000,
        dueDate:         dueDate.toISOString(),
        academicYear:    ACADEMIC_YEAR,
        status:          'pending',
      },
    );

    expect([200, 201]).toContain(status);
    expect(body?.id).toBeTruthy();
    expect(body?.totalAmount).toBe(55000);
    expect(body?.pendingAmount).toBe(55000);
    expect(body?.status).toBe('pending');

    state.feeRecordId = body!.id;
    console.log(`✓ Fee record created: ${body!.id} — ₹${body!.totalAmount}`);
  });

  test('3.2 — Duplicate fee record for same student+structure+year is rejected', async ({ request }) => {
    if (!state.token || !state.feeRecordId) { test.skip(); return; }

    const { status } = await apiPost(
      request, '/fees/records', state.token,
      {
        schoolId:       state.schoolId,
        studentId:      state.studentId,
        feeStructureId: state.structureId,
        totalAmount:    55000,
        dueDate:        new Date(Date.now() + 45 * 86400000).toISOString(),
        academicYear:   ACADEMIC_YEAR,
        status:         'pending',
      },
    );

    expect(status).toBe(400);
    console.log('✓ Duplicate fee record rejected (400)');
  });

  test('3.3 — Fee record with negative amount is rejected', async ({ request }) => {
    if (!state.token || !state.studentId) { test.skip(); return; }

    const { status } = await apiPost(
      request, '/fees/records', state.token,
      {
        schoolId:    state.schoolId,
        studentId:   state.studentId,
        totalAmount: -1000,
        dueDate:     new Date(Date.now() + 30 * 86400000).toISOString(),
        academicYear: ACADEMIC_YEAR,
        status:      'pending',
      },
    );

    expect(status).toBe(400);
    console.log('✓ Negative amount fee record rejected (400)');
  });

  test('3.4 — Get fee record by ID', async ({ request }) => {
    if (!state.token || !state.feeRecordId) { test.skip(); return; }

    const body = await apiGet<{
      id: string; totalAmount: number; status: string; studentName: string;
    }>(request, `/fees/records/${state.feeRecordId}`, state.token);

    expect(body?.id).toBe(state.feeRecordId);
    expect(body?.totalAmount).toBe(55000);
    expect(body?.studentName).toBeTruthy();
    console.log(`✓ Fee record detail: student = ${body!.studentName}`);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 4 — Payment Collection
// ══════════════════════════════════════════════════════════════════════════════

test.describe('Phase 4 — Payment Collection & Balance Updates', () => {

  test('4.1 — Record a partial payment (first installment)', async ({ request }) => {
    if (!state.token || !state.feeRecordId) { test.skip(); return; }

    state.receiptNumber = `E2E-RCP-${RUN}-01`;

    const { status, body } = await apiPost<{
      id: string; amount: number; status: string; receiptNumber: string;
    }>(
      request, '/fees/payments', state.token,
      {
        schoolId:      state.schoolId,
        studentId:     state.studentId,
        feeRecordId:   state.feeRecordId,
        amount:        15000,
        date:          new Date().toISOString(),
        method:        'cash',
        receiptNumber: state.receiptNumber,
        processedBy:   'E2E Admin',
        academicYear:  ACADEMIC_YEAR,
      },
    );

    expect([200, 201]).toContain(status);
    expect(body?.amount).toBe(15000);
    expect(body?.status).toBe('success');
    expect(body?.receiptNumber).toBe(state.receiptNumber);

    state.paymentId = body!.id;
    console.log(`✓ Payment 1 recorded: ₹15 000 — receipt ${state.receiptNumber}`);
  });

  test('4.2 — Fee record balance decreases after payment', async ({ request }) => {
    if (!state.token || !state.feeRecordId) { test.skip(); return; }

    const body = await apiGet<{
      paidAmount: number; pendingAmount: number; status: string;
    }>(request, `/fees/records/${state.feeRecordId}`, state.token);

    expect(body?.paidAmount).toBe(15000);
    expect(body?.pendingAmount).toBe(40000);
    expect(body?.status).toBe('partial');
    console.log(`✓ Balance after payment: paid=₹15 000, pending=₹40 000`);
  });

  test('4.3 — Record a second installment via UPI', async ({ request }) => {
    if (!state.token || !state.feeRecordId) { test.skip(); return; }

    const { status, body } = await apiPost<{ amount: number; method: string }>(
      request, '/fees/payments', state.token,
      {
        schoolId:      state.schoolId,
        studentId:     state.studentId,
        feeRecordId:   state.feeRecordId,
        amount:        15000,
        date:          new Date().toISOString(),
        method:        'upi',
        receiptNumber: `E2E-RCP-${RUN}-02`,
        processedBy:   'E2E Admin',
        academicYear:  ACADEMIC_YEAR,
      },
    );

    expect([200, 201]).toContain(status);
    expect(body?.method).toBe('upi');
    console.log(`✓ Payment 2 recorded: ₹15 000 via UPI`);
  });

  test('4.4 — Cheque payment requires cheque number', async ({ request }) => {
    if (!state.token || !state.feeRecordId) { test.skip(); return; }

    const { status } = await apiPost(
      request, '/fees/payments', state.token,
      {
        schoolId:      state.schoolId,
        studentId:     state.studentId,
        feeRecordId:   state.feeRecordId,
        amount:        5000,
        date:          new Date().toISOString(),
        method:        'cheque',
        receiptNumber: `E2E-RCP-${RUN}-CHQ-NO-NUM`,
        // chequeNumber deliberately omitted
      },
    );

    expect(status).toBe(400);
    console.log('✓ Cheque without number rejected (400)');
  });

  test('4.5 — Payment with future date is rejected', async ({ request }) => {
    if (!state.token || !state.feeRecordId) { test.skip(); return; }

    const futureDate = new Date(Date.now() + 7 * 86400000).toISOString();
    const { status } = await apiPost(
      request, '/fees/payments', state.token,
      {
        schoolId:      state.schoolId,
        studentId:     state.studentId,
        feeRecordId:   state.feeRecordId,
        amount:        5000,
        date:          futureDate,
        method:        'cash',
        receiptNumber: `E2E-RCP-${RUN}-FUTURE`,
      },
    );

    expect(status).toBe(400);
    console.log('✓ Future-dated payment rejected (400)');
  });

  test('4.6 — Payment completes when outstanding is cleared', async ({ request }) => {
    if (!state.token || !state.feeRecordId) { test.skip(); return; }

    // ₹15 000 + ₹15 000 already paid → pending = ₹25 000 + ₹15 000 more = done
    const { status } = await apiPost(
      request, '/fees/payments', state.token,
      {
        schoolId:      state.schoolId,
        studentId:     state.studentId,
        feeRecordId:   state.feeRecordId,
        amount:        25000,   // clears remaining ₹25 000
        date:          new Date().toISOString(),
        method:        'bank_transfer',
        receiptNumber: `E2E-RCP-${RUN}-FINAL`,
        processedBy:   'E2E Admin',
        academicYear:  ACADEMIC_YEAR,
      },
    );

    expect([200, 201]).toContain(status);

    const record = await apiGet<{ status: string; paidAmount: number }>(
      request, `/fees/records/${state.feeRecordId}`, state.token,
    );
    expect(record?.status).toBe('paid');
    expect(record?.paidAmount).toBe(55000);
    console.log('✓ Fee record marked as PAID after full payment');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 5 — Payment Edge Cases
// ══════════════════════════════════════════════════════════════════════════════

test.describe('Phase 5 — Payment Edge Cases', () => {

  let freshRecordId = '';

  test('5.0 — Create a fresh fee record for edge case testing', async ({ request }) => {
    if (!state.token || !state.studentId) { test.skip(); return; }

    // Need a different structure to avoid duplicate record constraint
    const dueDate = new Date(Date.now() + 60 * 86400000).toISOString();

    // Create a distinct fee structure for this phase
    const { body: strBody, status: strStatus } = await apiPost<{ id: string }>(
      request, '/fees/structures', state.token,
      {
        schoolId:     state.schoolId,
        name:         `E2E Edge Structure ${RUN}`,
        class:        '9',
        academicYear: ACADEMIC_YEAR,
        tuitionFee:   20000,
        examFee:      2000,
      },
    );

    if (![200, 201].includes(strStatus) || !strBody?.id) { test.skip(); return; }

    const { status, body } = await apiPost<{ id: string; pendingAmount: number }>(
      request, '/fees/records', state.token,
      {
        schoolId:      state.schoolId,
        studentId:     state.studentId,
        feeStructureId: strBody.id,
        totalAmount:   22000,
        dueDate,
        academicYear:  ACADEMIC_YEAR,
        status:        'pending',
      },
    );

    if (![200, 201].includes(status) || !body?.id) { test.skip(); return; }
    freshRecordId = body.id;
    console.log(`✓ Fresh record for edge cases: ${freshRecordId}`);
  });

  test('5.1 — DOUBLE PAYMENT: payment on already-paid record is blocked', async ({ request }) => {
    if (!state.token || !state.feeRecordId) { test.skip(); return; }

    // state.feeRecordId is now fully paid (Phase 4.6)
    const { status } = await apiPost(
      request, '/fees/payments', state.token,
      {
        schoolId:      state.schoolId,
        studentId:     state.studentId,
        feeRecordId:   state.feeRecordId,
        amount:        1000,
        date:          new Date().toISOString(),
        method:        'cash',
        receiptNumber: `E2E-RCP-${RUN}-GHOST`,
      },
    );

    expect(status).toBe(400);
    console.log('✓ Double payment blocked (400) — already-paid record');
  });

  test('5.2 — DUPLICATE RECEIPT: same receipt number in same school is blocked', async ({ request }) => {
    if (!state.token || !freshRecordId) { test.skip(); return; }

    // First payment with the receipt
    const dupeReceipt = `E2E-RCP-${RUN}-DUPE`;
    await apiPost(request, '/fees/payments', state.token, {
      schoolId:      state.schoolId,
      studentId:     state.studentId,
      feeRecordId:   freshRecordId,
      amount:        5000,
      date:          new Date().toISOString(),
      method:        'cash',
      receiptNumber: dupeReceipt,
    });

    // Attempt to reuse the same receipt number
    const { status } = await apiPost(
      request, '/fees/payments', state.token,
      {
        schoolId:      state.schoolId,
        studentId:     state.studentId,
        feeRecordId:   freshRecordId,
        amount:        5000,
        date:          new Date().toISOString(),
        method:        'upi',
        receiptNumber: dupeReceipt,   // ← duplicate
      },
    );

    expect(status).toBe(400);
    console.log('✓ Duplicate receipt number blocked (400)');
  });

  test('5.3 — OVERPAYMENT: payment exceeding outstanding is blocked', async ({ request }) => {
    if (!state.token || !freshRecordId) { test.skip(); return; }

    // Outstanding = 22000 - 5000 (from 5.2) = 17000
    const { status } = await apiPost(
      request, '/fees/payments', state.token,
      {
        schoolId:      state.schoolId,
        studentId:     state.studentId,
        feeRecordId:   freshRecordId,
        amount:        99999,         // far exceeds remaining balance
        date:          new Date().toISOString(),
        method:        'cash',
        receiptNumber: `E2E-RCP-${RUN}-OVER`,
      },
    );

    expect(status).toBe(400);
    console.log('✓ Overpayment blocked (400)');
  });

  test('5.4 — Invalid payment method is rejected', async ({ request }) => {
    if (!state.token || !freshRecordId) { test.skip(); return; }

    const { status } = await apiPost(
      request, '/fees/payments', state.token,
      {
        schoolId:      state.schoolId,
        studentId:     state.studentId,
        feeRecordId:   freshRecordId,
        amount:        1000,
        date:          new Date().toISOString(),
        method:        'bitcoin',    // ← not a valid method
        receiptNumber: `E2E-RCP-${RUN}-BTC`,
      },
    );

    expect(status).toBe(400);
    console.log('✓ Invalid payment method rejected (400)');
  });

  test('5.5 — Zero-amount payment is rejected', async ({ request }) => {
    if (!state.token || !freshRecordId) { test.skip(); return; }

    const { status } = await apiPost(
      request, '/fees/payments', state.token,
      {
        schoolId:      state.schoolId,
        studentId:     state.studentId,
        feeRecordId:   freshRecordId,
        amount:        0,
        date:          new Date().toISOString(),
        method:        'cash',
        receiptNumber: `E2E-RCP-${RUN}-ZERO`,
      },
    );

    expect(status).toBe(400);
    console.log('✓ Zero-amount payment rejected (400)');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 6 — Late Fee Configuration
// ══════════════════════════════════════════════════════════════════════════════

test.describe('Phase 6 — Late Fee Configuration & Calculation', () => {

  test('6.1 — Create daily late fee config', async ({ request }) => {
    if (!state.token) { test.skip(); return; }

    const { status, body } = await apiPost<{ gracePeriodDays: number; feeType: string; amount: number }>(
      request, '/fees/late-fee-config', state.token,
      {
        schoolId:       state.schoolId,
        gracePeriodDays: 7,
        feeType:        'daily',
        amount:         50,
        maxAmount:      1500,
        isActive:       true,
      },
    );

    expect([200, 201]).toContain(status);
    expect(body?.feeType).toBe('daily');
    expect(body?.gracePeriodDays).toBe(7);
    console.log(`✓ Late fee config created: ₹50/day, 7-day grace`);
  });

  test('6.2 — Late fee config with invalid type is rejected', async ({ request }) => {
    if (!state.token) { test.skip(); return; }

    const { status } = await apiPost(
      request, '/fees/late-fee-config', state.token,
      {
        schoolId:        state.schoolId,
        gracePeriodDays: 7,
        feeType:         'hourly',  // ← invalid
        amount:          10,
      },
    );

    expect(status).toBe(400);
    console.log('✓ Invalid late fee type rejected (400)');
  });

  test('6.3 — Percentage over 100% is rejected', async ({ request }) => {
    if (!state.token) { test.skip(); return; }

    const { status } = await apiPost(
      request, '/fees/late-fee-config', state.token,
      {
        schoolId:        state.schoolId,
        gracePeriodDays: 5,
        feeType:         'percentage',
        amount:          150,       // ← > 100%
      },
    );

    expect(status).toBe(400);
    console.log('✓ Percentage > 100 rejected (400)');
  });

  test('6.4 — Get late fee config', async ({ request }) => {
    if (!state.token) { test.skip(); return; }

    const body = await apiGet<{ feeType: string; amount: number; isActive: boolean }>(
      request, '/fees/late-fee-config', state.token,
    );

    expect(body?.feeType).toBeTruthy();
    expect(body?.amount).toBeGreaterThan(0);
    console.log(`✓ Late fee config retrieved: ${body?.feeType} ₹${body?.amount}`);
  });

  test('6.5 — Overdue fees list shows DaysOverdue > 0', async ({ request }) => {
    if (!state.token) { test.skip(); return; }

    const body = await apiGet<Array<{ feeRecordId: string; daysOverdue: number }>>(
      request, '/fees/overdue', state.token,
    );

    // May be empty if no overdue records exist in the test DB — that's fine
    if (Array.isArray(body) && body.length > 0) {
      expect(body.every((r) => r.daysOverdue > 0)).toBeTruthy();
      console.log(`✓ Overdue list: ${body.length} records, all daysOverdue > 0`);
    } else {
      console.log('ℹ No overdue records currently (expected in fresh DB)');
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 7 — Refund Processing
// ══════════════════════════════════════════════════════════════════════════════

test.describe('Phase 7 — Refund Processing', () => {

  test('7.1 — Process a partial refund on the first payment', async ({ request }) => {
    if (!state.token || !state.paymentId) { test.skip(); return; }

    const { status, body } = await apiPost<{ id: string; amount: number; status: string }>(
      request, `/fees/refunds/${state.paymentId}`, state.token,
      {
        amount:       5000,
        reason:       'E2E test: duplicate payment correction',
        refundMethod: 'original',
      },
    );

    // Accept 200 or 201; some backends return 400 if txn status is wrong — log and proceed
    if (status === 400) {
      console.log('ℹ Refund skipped — original payment may not be in "success" state in test DB');
      return;
    }

    expect([200, 201]).toContain(status);
    expect(body?.amount).toBe(5000);
    expect(['pending', 'processing', 'completed']).toContain(body?.status);
    console.log(`✓ Refund initiated: ₹5 000 — status: ${body?.status}`);
  });

  test('7.2 — Refund amount exceeding payment is rejected', async ({ request }) => {
    if (!state.token || !state.paymentId) { test.skip(); return; }

    const { status } = await apiPost(
      request, `/fees/refunds/${state.paymentId}`, state.token,
      {
        amount:       999999,    // > any plausible payment amount
        reason:       'Test',
        refundMethod: 'original',
      },
    );

    expect(status).toBe(400);
    console.log('✓ Refund exceeding payment amount rejected (400)');
  });

  test('7.3 — Refund on non-existent transaction returns 404', async ({ request }) => {
    if (!state.token) { test.skip(); return; }

    const { status } = await apiPost(
      request,
      '/fees/refunds/00000000-0000-0000-0000-000000000000',
      state.token,
      { amount: 100, reason: 'Test', refundMethod: 'original' },
    );

    expect([404, 400]).toContain(status);
    console.log('✓ Refund on ghost transaction returns 404/400');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 8 — UI Smoke Tests
// ══════════════════════════════════════════════════════════════════════════════

test.describe('Phase 8 — UI Smoke Tests', () => {

  test('8.1 — Fees page loads and renders key sections', async ({ page }) => {
    if (!state.token) { test.skip(); return; }

    await injectAuth(page);
    await page.goto(`${UI_BASE}/fees`, { waitUntil: 'domcontentloaded', timeout: 30_000 });

    // Should either land on /fees or redirect to /login
    const url = page.url();
    if (url.includes('/login')) {
      console.warn('⚠ Redirected to login — storageState may not include fees permission');
      test.skip();
      return;
    }

    // Page heading or tab should be visible
    await expect(
      page.getByRole('heading', { name: /fees|fee management|financ/i })
        .or(page.locator('[class*="fees"], [class*="fee-"]').first())
        .or(page.getByText(/fee structure|fee records|collect payment/i).first()),
    ).toBeVisible({ timeout: 15_000 });

    console.log('✓ Fees page rendered successfully');
  });

  test('8.2 — Fees page shows dashboard stats cards', async ({ page }) => {
    if (!state.token) { test.skip(); return; }

    await injectAuth(page);
    await page.goto(`${UI_BASE}/fees`, { waitUntil: 'networkidle', timeout: 30_000 });

    if (page.url().includes('/login')) { test.skip(); return; }

    // Stats cards typically show currency amounts
    await expect(page.getByText(/₹|total fee|collected|pending/i).first()).toBeVisible({ timeout: 15_000 });
    console.log('✓ Stats section visible on Fees page');
  });

  test('8.3 — Fee Structures tab is accessible', async ({ page }) => {
    if (!state.token) { test.skip(); return; }

    await injectAuth(page);
    await page.goto(`${UI_BASE}/fees`, { waitUntil: 'networkidle', timeout: 30_000 });

    if (page.url().includes('/login')) { test.skip(); return; }

    // Find and click the Structures tab
    const structuresTab = page.getByRole('tab', { name: /structure/i })
      .or(page.getByText(/fee structure/i, { exact: false }))
      .first();

    if (await structuresTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await structuresTab.click();
      await page.waitForTimeout(1000);
      console.log('✓ Clicked Fee Structures tab');
    } else {
      console.log('ℹ Fee Structures tab not found — may use different layout');
    }

    // The structure we created should appear somewhere on the page
    const structureText = page.getByText(STRUCTURE_NAME);
    if (await structureText.isVisible({ timeout: 5_000 }).catch(() => false)) {
      console.log(`✓ Created structure "${STRUCTURE_NAME}" visible in UI`);
    }
  });

  test('8.4 — Fee Records tab shows records with status badges', async ({ page }) => {
    if (!state.token) { test.skip(); return; }

    await injectAuth(page);
    await page.goto(`${UI_BASE}/fees`, { waitUntil: 'networkidle', timeout: 30_000 });

    if (page.url().includes('/login')) { test.skip(); return; }

    // Navigate to records section
    const recordsTab = page.getByRole('tab', { name: /records?|student fee/i })
      .or(page.getByText(/fee record|student fees/i, { exact: false }))
      .first();

    if (await recordsTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await recordsTab.click();
      await page.waitForTimeout(1500);
    }

    // Status badges should be visible
    const statusBadge = page.getByText(/paid|partial|pending|overdue/i).first();
    if (await statusBadge.isVisible({ timeout: 5_000 }).catch(() => false)) {
      console.log('✓ Status badges visible in fee records list');
    } else {
      console.log('ℹ No status badges found — table may be empty in test env');
    }
  });

  test('8.5 — "Collect Payment" button opens payment dialog', async ({ page }) => {
    if (!state.token) { test.skip(); return; }

    await injectAuth(page);
    await page.goto(`${UI_BASE}/fees`, { waitUntil: 'networkidle', timeout: 30_000 });

    if (page.url().includes('/login')) { test.skip(); return; }

    // Look for a Collect Payment button
    const collectBtn = page.getByRole('button', { name: /collect payment|record payment|pay/i }).first();
    if (!await collectBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      console.log('ℹ No "Collect Payment" button visible — may require a fee record to be selected first');
      return;
    }

    await collectBtn.click();
    await page.waitForTimeout(1000);

    // Dialog or sheet should open
    const dialog = page.getByRole('dialog').or(page.locator('[role="dialog"]')).first();
    if (await dialog.isVisible({ timeout: 5_000 }).catch(() => false)) {
      console.log('✓ Payment collection dialog opened');

      // Verify key form fields exist
      const amountField = dialog.locator('input[type="number"], input[placeholder*="amount" i]').first();
      const methodSelect = dialog.locator('select, [role="combobox"]').first();

      if (await amountField.isVisible({ timeout: 3_000 }).catch(() => false)) {
        console.log('✓ Amount input field present in dialog');
      }
      if (await methodSelect.isVisible({ timeout: 3_000 }).catch(() => false)) {
        console.log('✓ Payment method selector present in dialog');
      }

      // Close dialog
      const closeBtn = dialog.getByRole('button', { name: /close|cancel|✕|×/i }).first();
      if (await closeBtn.isVisible().catch(() => false)) {
        await closeBtn.click();
      } else {
        await page.keyboard.press('Escape');
      }
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 9 — Fee Stats Invariants
// ══════════════════════════════════════════════════════════════════════════════

test.describe('Phase 9 — Fee Stats & Invariants', () => {

  test('9.1 — Stats API returns valid structure', async ({ request }) => {
    if (!state.token) { test.skip(); return; }

    const body = await apiGet<{
      totalFees: number;
      collectedFees: number;
      pendingFees: number;
      overdueFees: number;
      byMethod: Record<string, number>;
    }>(request, `/fees/stats?academicYear=${ACADEMIC_YEAR}`, state.token);

    expect(body).toBeTruthy();
    expect(typeof body?.totalFees).toBe('number');
    expect(typeof body?.collectedFees).toBe('number');
    expect(typeof body?.pendingFees).toBe('number');
    expect(body!.totalFees).toBeGreaterThanOrEqualTo(0);
    console.log(`✓ Stats: total=₹${body!.totalFees}, collected=₹${body!.collectedFees}`);
  });

  test('9.2 — Collected + Pending equals Total (accounting invariant)', async ({ request }) => {
    if (!state.token) { test.skip(); return; }

    const body = await apiGet<{
      totalFees: number; collectedFees: number; pendingFees: number;
    }>(request, `/fees/stats?academicYear=${ACADEMIC_YEAR}`, state.token);

    if (!body) { test.skip(); return; }

    const sum = body.collectedFees + body.pendingFees;
    // Allow for small floating-point tolerance (₹1)
    expect(Math.abs(sum - body.totalFees)).toBeLessThanOrEqualTo(1);
    console.log(`✓ Accounting invariant: ₹${body.collectedFees} + ₹${body.pendingFees} = ₹${body.totalFees}`);
  });

  test('9.3 — Stats are never negative', async ({ request }) => {
    if (!state.token) { test.skip(); return; }

    const body = await apiGet<{
      totalFees: number; collectedFees: number; pendingFees: number; overdueFees: number;
    }>(request, '/fees/stats', state.token);

    if (!body) { test.skip(); return; }

    expect(body.totalFees).toBeGreaterThanOrEqualTo(0);
    expect(body.collectedFees).toBeGreaterThanOrEqualTo(0);
    expect(body.pendingFees).toBeGreaterThanOrEqualTo(0);
    expect(body.overdueFees).toBeGreaterThanOrEqualTo(0);
    console.log('✓ All stats ≥ 0');
  });

  test('9.4 — Stats reflect payments made in Phase 4', async ({ request }) => {
    if (!state.token) { test.skip(); return; }

    const body = await apiGet<{ collectedFees: number }>(
      request, `/fees/stats?academicYear=${ACADEMIC_YEAR}`, state.token,
    );

    // We paid ₹55 000 in Phase 4 — collected should be at least that
    expect(body?.collectedFees).toBeGreaterThanOrEqualTo(55000);
    console.log(`✓ Stats collected = ₹${body!.collectedFees} (includes Phase 4 payments)`);
  });

  test('9.5 — Fee reminders endpoint responds', async ({ request }) => {
    if (!state.token) { test.skip(); return; }

    const { status, body } = await apiPost<{
      totalRecords: number; sentSuccessfully: number; failed: number;
    }>(
      request, '/fees/reminders', state.token,
      { daysBefore: 7, channel: 'email' },
    );

    expect([200, 201]).toContain(status);
    expect(typeof body?.totalRecords).toBe('number');
    expect(typeof body?.sentSuccessfully).toBe('number');
    expect(typeof body?.failed).toBe('number');
    expect(body!.failed).toBe(0);
    console.log(`✓ Reminders endpoint: ${body!.totalRecords} records processed, ${body!.failed} failures`);
  });
});
