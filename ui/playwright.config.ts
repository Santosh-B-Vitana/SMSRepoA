import { defineConfig, devices } from '@playwright/test';

/**
 * Industry-grade Playwright config for SMS ERP E2E tests.
 * Targets the Vite dev server (port 8080) + sms-api backend (port 5092).
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,          // Run sequentially to avoid DB race conditions
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,                    // Single worker: avoids shared-state conflicts
  reporter: [
    ['html', { outputFolder: 'e2e-report', open: 'never' }],
    ['list'],
  ],
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    // NOTE: storageState is set per-project, not globally, so setup can write it first
  },
  timeout: 120_000,  // 2 minutes per test (form-fill tests can take time)
  projects: [
    // ── Global setup: login and save auth state ──────────────────────────────
    {
      name: 'setup',
      testMatch: '**/global.setup.ts',
      // No storageState here — this IS the step that creates it
    },
    // ── Main E2E tests run after setup ───────────────────────────────────────
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/admin.json',
        // Playwright doesn't restore sessionStorage. This script copies pw_e2e_auth
        // (saved during setup) from localStorage back into sessionStorage so the
        // app's AuthContext finds 'auth_session' and doesn't redirect to login.
        addInitScript: {
          content: `(function(){try{var s=localStorage.getItem('pw_e2e_auth');if(s)sessionStorage.setItem('auth_session',s);}catch(e){}})();`,
        },
      },
      dependencies: ['setup'],
    },
  ],
  // Start the Vite dev server before tests if not already running
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:8080',
    reuseExistingServer: true,
    timeout: 60_000,
    cwd: '.',
  },
});
