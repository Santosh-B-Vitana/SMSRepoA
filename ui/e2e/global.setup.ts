/**
 * Global Setup — runs once before all tests.
 * Performs admin login via the real UI + real backend, then saves session
 * storage / cookies to e2e/.auth/admin.json so all subsequent tests skip
 * the login flow.
 *
 * Also ensures prerequisite data exists:
 *  • At least one academic class (e.g., "10" / section "A") in the school
 */

import { test as setup, expect } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { API_BASE_URL, ADMIN_CREDENTIALS, TEST_CLASS, TEST_SECTION, TEST_ACADEMIC_YEAR } from './fixtures/constants';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const AUTH_FILE = join(__dirname, '.auth/admin.json');

setup('authenticate as admin', async ({ page }) => {
  // ── 1. Navigate to the login page ─────────────────────────────────────────
  await page.goto('/login');
  await page.waitForSelector('[data-testid="email-input"], input[type="email"], #email, input[name="email"]', { timeout: 15_000 });

  // Fill credentials
  const emailInput = page.locator('input[type="email"], input[name="email"], #email').first();
  const passwordInput = page.locator('input[type="password"]').first();

  await emailInput.fill(ADMIN_CREDENTIALS.email);
  await passwordInput.fill(ADMIN_CREDENTIALS.password);

  // Click the Admin login button (not Staff portal)
  const adminTabBtn = page.getByRole('button', { name: /admin/i }).first();
  if (await adminTabBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    // Already on admin tab by default, skip click
  }

  const submitBtn = page.getByRole('button', { name: /sign in|login|log in/i }).first();
  await submitBtn.click();

  // Wait for successful redirect to dashboard
  await page.waitForURL(/dashboard|admin/, { timeout: 20_000 });

  // Playwright's storageState only restores localStorage + cookies (NOT sessionStorage).
  // Copy auth_session from sessionStorage → localStorage so addInitScript can re-inject it.
  // Wait for the page to be fully loaded before reading sessionStorage.
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
  const rawSession = await page.evaluate(() => sessionStorage.getItem('auth_session')).catch(() => null);
  if (rawSession) {
    await page.evaluate((s) => localStorage.setItem('pw_e2e_auth', s), rawSession);
  }

  // Save auth state (cookies + localStorage, including pw_e2e_auth)
  await page.context().storageState({ path: AUTH_FILE });
  console.log('✓ Admin auth state saved to', AUTH_FILE);
});

setup('ensure academic class exists', async ({ page, request }) => {
  // Load admin auth
  if (!fs.existsSync(AUTH_FILE)) {
    throw new Error('Auth file missing — run "authenticate as admin" first');
  }

  // Use the API directly (with the stored token) to ensure a class exists
  const authData = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));

  // Extract JWT from sessionStorage entry "auth_session"
  let token: string | null = null;
  for (const origin of authData.origins ?? []) {
    for (const entry of origin.sessionStorage ?? []) {
      if (entry.name === 'auth_session') {
        try {
          const session = JSON.parse(entry.value);
          token = session?.token ?? null;
        } catch { /* ignore */ }
      }
    }
    // Also try localStorage
    for (const entry of origin.localStorage ?? []) {
      if (entry.name === 'authToken') {
        token = token ?? entry.value;
      }
    }
  }

  if (!token) {
    console.warn('⚠ Could not extract JWT — skipping class pre-creation');
    return;
  }

  // Check if class already exists (short timeout — this endpoint can be slow on cold start)
  let listResp: any;
  try {
    listResp = await request.get(`${API_BASE_URL}/academics/classes?page=1&pageSize=10`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10_000,
    });
  } catch (err) {
    console.warn('⚠ GET /academics/classes timed out or failed — skipping class pre-creation');
    return;
  }

  if (listResp.ok()) {
    const body = await listResp.json();
    const classes = body?.data?.classes ?? body?.classes ?? [];
    const existing = classes.find(
      (c: any) => c.standard === TEST_CLASS && c.section === TEST_SECTION,
    );
    if (existing) {
      console.log(`✓ Class ${TEST_CLASS}-${TEST_SECTION} already exists`);
      return;
    }
  }

  // Create the class
  let createResp: any;
  try {
    createResp = await request.post(`${API_BASE_URL}/academics/classes`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        standard: TEST_CLASS,
        section: TEST_SECTION,
        academicYear: TEST_ACADEMIC_YEAR,
        name: `${TEST_CLASS}-${TEST_SECTION}`,
      },
      timeout: 10_000,
    });
  } catch (err) {
    console.warn('⚠ POST /academics/classes timed out or failed — skipping');
    return;
  }

  if (createResp.ok()) {
    console.log(`✓ Created class ${TEST_CLASS}-${TEST_SECTION} for ${TEST_ACADEMIC_YEAR}`);
  } else {
    const err = await createResp.text();
    console.warn(`⚠ Could not create class: ${createResp.status()} ${err.substring(0, 200)}`);
  }
});
