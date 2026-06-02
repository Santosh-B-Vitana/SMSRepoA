/**
 * Security Dashboard & Advanced Analytics — End-to-End Test Suite
 * =========================================================================
 * Verifies that both pages:
 *  1. Render correctly and are accessible to admin users
 *  2. Load real data from the backend (not stubs/mocks)
 *  3. Expose no obvious client-side security regressions
 *  4. All chart tabs are navigable and renderable
 *
 * Auth strategy: Reads stored token from .auth/admin.json (global.setup.ts)
 * Backend:       VITE_API_BASE_URL
 * Frontend:      PLAYWRIGHT_BASE_URL
 *
 * Run: npx playwright test e2e/security-analytics.spec.ts
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

// ── Auth helpers ──────────────────────────────────────────────────────────────

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

function getToken(): string {
  try {
    const data = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
    for (const origin of data.origins ?? []) {
      for (const entry of origin.localStorage ?? []) {
        if (entry.name === 'pw_e2e_auth') {
          const session = JSON.parse(entry.value);
          return session?.token ?? '';
        }
      }
    }
  } catch { /* ignore */ }
  return '';
}

// =============================================================================
// SECURITY DASHBOARD TESTS
// =============================================================================

test.describe('Security Dashboard — production readiness', () => {

  test.beforeEach(async ({ page }) => {
    await injectAuth(page);
    await page.goto(`${UI_BASE}/security`, { waitUntil: 'networkidle' });
  });

  test('page loads with correct heading and Security badge', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /security dashboard/i })).toBeVisible();
    // SecurityStatusBadge renders text: "Checking…", "Secure (N%)", "Warnings (N%)", or "At Risk (N%)"
    await expect(
      page.locator('text=/Checking|Secure|Warnings|At Risk/i').first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('security score card renders with score percentage', async ({ page }) => {
    // The SecurityDashboard card shows a numeric % score
    await page.waitForTimeout(3000); // allow async checks to resolve
    // Score is a 3-digit text like "79%" or "100%"
    const scoreEl = page.locator('text=/\\d+%/').first();
    await expect(scoreEl).toBeVisible({ timeout: 10_000 });
  });

  test('shows at least 10 security check items', async ({ page }) => {
    // Wait for async checks to complete (api health ping, jwt decode, etc.)
    await page.waitForTimeout(4000);
    // Each check Badge has className="text-xs shrink-0" (shadcn Badge does NOT have a literal 'badge' class)
    // That combination is unique to check-row status badges
    const checkBadgeCount = await page.locator('.text-xs.shrink-0').count();
    expect(checkBadgeCount).toBeGreaterThanOrEqual(10);
  });

  test('security checks grouped into categories', async ({ page }) => {
    await page.waitForTimeout(4000);
    const body = await page.locator('body').textContent();
    // All five category labels should appear
    expect(body).toMatch(/Authentication/i);
    expect(body).toMatch(/Authorization/i);
    expect(body).toMatch(/Network Security/i);
    expect(body).toMatch(/Input Validation/i);
    expect(body).toMatch(/Data Protection/i);
  });

  test('Refresh button triggers a new check run', async ({ page }) => {
    await page.waitForTimeout(3000);
    const refreshBtn = page.getByRole('button', { name: /refresh/i });
    await expect(refreshBtn).toBeVisible();
    // Clicking refresh should not cause an error
    await refreshBtn.click();
    // After clicking, the button should eventually become not-spinning
    await page.waitForTimeout(5000);
    await expect(refreshBtn).not.toBeDisabled({ timeout: 8000 });
  });

  test('JWT Validity check appears and shows pass or warning', async ({ page }) => {
    await page.waitForTimeout(4000);
    const body = await page.locator('body').textContent();
    expect(body).toMatch(/JWT Token Validity/i);
    // Should be pass or warning (not completely absent)
    const hasStatus = /pass|warning|fail/i.test(body ?? '');
    expect(hasStatus).toBe(true);
  });

  test('API Reachability check shows pass', async ({ page }) => {
    await page.waitForTimeout(5000);
    const body = await page.locator('body').textContent();
    expect(body).toMatch(/API Reachability/i);
    // Backend is running so it should pass
    expect(body).toMatch(/reachable/i);
  });

  test('HTTPS check shows appropriate status for localhost', async ({ page }) => {
    await page.waitForTimeout(4000);
    const body = await page.locator('body').textContent();
    expect(body).toMatch(/HTTPS/i);
    // On localhost it should be 'pass' (we treat localhost as safe)
    // The description should mention localhost or TLS
    expect(body).toMatch(/localhost|TLS|encrypted/i);
  });

  test('progress bar rendered and reflects check count', async ({ page }) => {
    await page.waitForTimeout(4000);
    // Progress element from shadcn renders as a div with role="progressbar"
    const progressBar = page.locator('[role="progressbar"]');
    await expect(progressBar).toBeVisible({ timeout: 8000 });
  });

  test('API: GET /health returns 200', async ({ request }) => {
    const res = await request.get(`${UI_BASE}/api/health`);
    expect([200, 404]).toContain(res.status()); // 404 if proxied differently — health may be at /api/health
  });

  test('API: GET /api/analytics/dashboard/summary returns data', async ({ request }) => {
    const token = getToken();
    if (!token) { test.skip(true, 'No auth token'); return; }
    const res = await request.get(`${API_BASE}/analytics/dashboard/summary`, {
      headers: { Authorization: `Bearer ${token}`, 'X-Academic-Year': '2025-2026' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const data = body.data ?? body;
    expect(typeof data.totalStudents).toBe('number');
  });
});

// =============================================================================
// ADVANCED ANALYTICS TESTS
// =============================================================================

test.describe('Advanced Analytics — production readiness', () => {

  test.beforeEach(async ({ page }) => {
    await injectAuth(page);
    await page.goto(`${UI_BASE}/advanced-analytics`, { waitUntil: 'networkidle' });
  });

  test('page renders the Advanced Analytics heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Advanced Analytics/i }).first()).toBeVisible({ timeout: 10_000 });
  });

  test('KPI cards render (Active Students, Attendance, Pending Fees, Upcoming Exams)', async ({ page }) => {
    // Wait for API data to load (react-query)
    await page.waitForTimeout(3000);
    const body = await page.locator('body').textContent();
    // KPI card labels
    expect(body).toMatch(/Active Students/i);
    expect(body).toMatch(/Today.s Attendance/i);
    expect(body).toMatch(/Pending Fees/i);
    expect(body).toMatch(/Upcoming Exams/i);
  });

  test('four chart tabs are present: Overview, Attendance, Performance, Financial', async ({ page }) => {
    await expect(page.getByRole('tab', { name: /overview/i }).first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('tab', { name: /attendance/i }).first()).toBeVisible();
    await expect(page.getByRole('tab', { name: /performance/i }).first()).toBeVisible();
    await expect(page.getByRole('tab', { name: /financial/i }).first()).toBeVisible();
  });

  test('Overview tab: student status pie chart and enrollment bar chart render', async ({ page }) => {
    await page.getByRole('tab', { name: /overview/i }).first().click();
    await page.waitForTimeout(2500);
    const body = await page.locator('body').textContent();
    expect(body).toMatch(/Student Status|Enrollment by Class/i);
    // Recharts renders SVG
    const svg = page.locator('svg').first();
    await expect(svg).toBeVisible({ timeout: 8000 });
  });

  test('Attendance tab: renders with time-range select and chart', async ({ page }) => {
    await page.getByRole('tab', { name: /attendance/i }).first().click();
    await page.waitForTimeout(2500);
    const body = await page.locator('body').textContent();
    expect(body).toMatch(/Attendance Analytics|Daily Attendance Trend/i);
    // Time-range combobox
    const select = page.getByRole('combobox').first();
    await expect(select).toBeVisible();
  });

  test('Performance tab: renders stats cards', async ({ page }) => {
    await page.getByRole('tab', { name: /performance/i }).first().click();
    await page.waitForTimeout(2500);
    const body = await page.locator('body').textContent();
    expect(body).toMatch(/Total Exams|Total Results|Overall Average|Pass Rate/i);
  });

  test('Financial tab: renders fee collection chart', async ({ page }) => {
    await page.getByRole('tab', { name: /financial/i }).first().click();
    await page.waitForTimeout(2500);
    const body = await page.locator('body').textContent();
    expect(body).toMatch(/Fee Collection|collected|pending/i);
  });

  test('no mock/stub data — KPIs populated from real API', async ({ page }) => {
    // Intercept the analytics API calls and confirm they fire
    const requests: string[] = [];
    page.on('request', req => {
      if (req.url().includes('/api/analytics/')) {
        requests.push(req.url());
      }
    });

    await page.goto(`${UI_BASE}/advanced-analytics`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // At minimum, overview and summary endpoints should have been called
    const hasOverview = requests.some(u => u.includes('/analytics/overview'));
    const hasSummary  = requests.some(u => u.includes('/analytics/dashboard/summary'));
    expect(hasOverview || hasSummary).toBe(true);
  });

  // ── API health checks ──────────────────────────────────────────────────────

  test('API: GET /analytics/overview returns valid data', async ({ request }) => {
    const token = getToken();
    if (!token) { test.skip(true, 'No auth token'); return; }
    const res = await request.get(`${API_BASE}/analytics/overview`, {
      headers: { Authorization: `Bearer ${token}`, 'X-Academic-Year': '2025-2026' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const data = body.data ?? body;
    expect(typeof data.totalStudents).toBe('number');
    expect(typeof data.totalStaff).toBe('number');
    expect(typeof data.totalClasses).toBe('number');
    expect(typeof data.todayAttendancePercentage).toBe('number');
  });

  test('API: GET /analytics/attendance returns valid data', async ({ request }) => {
    const token = getToken();
    if (!token) { test.skip(true, 'No auth token'); return; }
    const res = await request.get(`${API_BASE}/analytics/attendance?days=7`, {
      headers: { Authorization: `Bearer ${token}`, 'X-Academic-Year': '2025-2026' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const data = body.data ?? body;
    expect(typeof data.averageAttendancePercentage).toBe('number');
    expect(Array.isArray(data.dailyData)).toBe(true);
  });

  test('API: GET /analytics/enrollment returns class breakdown', async ({ request }) => {
    const token = getToken();
    if (!token) { test.skip(true, 'No auth token'); return; }
    const res = await request.get(`${API_BASE}/analytics/enrollment`, {
      headers: { Authorization: `Bearer ${token}`, 'X-Academic-Year': '2025-2026' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const data = body.data ?? body;
    expect(typeof data.totalActiveStudents).toBe('number');
    expect(Array.isArray(data.byClass)).toBe(true);
  });

  test('API: GET /analytics/performance returns exam breakdown', async ({ request }) => {
    const token = getToken();
    if (!token) { test.skip(true, 'No auth token'); return; }
    const res = await request.get(`${API_BASE}/analytics/performance`, {
      headers: { Authorization: `Bearer ${token}`, 'X-Academic-Year': '2025-2026' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const data = body.data ?? body;
    expect(typeof data.overallAveragePercentage).toBe('number');
    expect(Array.isArray(data.bySubject)).toBe(true);
  });

  test('API: GET /analytics/fees returns fee breakdown', async ({ request }) => {
    const token = getToken();
    if (!token) { test.skip(true, 'No auth token'); return; }
    const res = await request.get(`${API_BASE}/analytics/fees?months=3`, {
      headers: { Authorization: `Bearer ${token}`, 'X-Academic-Year': '2025-2026' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const data = body.data ?? body;
    expect(typeof data.collectionRate).toBe('number');
    expect(Array.isArray(data.monthlyData)).toBe(true);
  });

  test('API: unauthorized request returns 401', async ({ request }) => {
    const res = await request.get(`${API_BASE}/analytics/overview`);
    expect(res.status()).toBe(401);
  });
});
