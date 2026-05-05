# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: academic-setup.spec.ts >> Phase 1 — Academic Year setup >> 1.1 — Navigate to Academic Setup page
- Location: e2e\academic-setup.spec.ts:154:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: /Academic Configuration/i }).first()
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for getByRole('heading', { name: /Academic Configuration/i }).first()
    - waiting for navigation to finish...
    2 × navigated to "http://localhost:8081/login?returnUrl=%2Facademics"
      - waiting for" http://localhost:8081/login?expired=true" navigation to finish...
    - navigated to "http://localhost:8081/login?expired=true"

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - generic [ref=e10]:
      - generic [ref=e11]:
        - img "VEDA Logo" [ref=e13]
        - generic [ref=e14]:
          - generic [ref=e15]: VEDA
          - generic [ref=e16]: Pro
      - generic [ref=e17]:
        - generic [ref=e18]:
          - paragraph [ref=e19]: Education Management Platform
          - heading "Excellence. Innovation. Growth." [level=1] [ref=e21]:
            - text: Excellence.
            - text: Innovation.
            - text: Growth.
          - paragraph [ref=e22]: Transform your institution with our comprehensive management system designed for modern education.
        - generic [ref=e23]:
          - generic [ref=e24]:
            - img [ref=e26]
            - generic [ref=e30]:
              - heading "Multi-Institution Management" [level=3] [ref=e31]
              - paragraph [ref=e32]: Unified dashboard for all your schools
          - generic [ref=e33]:
            - img [ref=e35]
            - generic [ref=e37]:
              - heading "Real-time Analytics" [level=3] [ref=e38]
              - paragraph [ref=e39]: Data-driven insights at your fingertips
          - generic [ref=e40]:
            - img [ref=e42]
            - generic [ref=e44]:
              - heading "Enterprise Security" [level=3] [ref=e45]
              - paragraph [ref=e46]: Bank-grade encryption & compliance
        - generic [ref=e47]:
          - generic [ref=e48]:
            - img [ref=e49]
            - generic [ref=e52]:
              - paragraph [ref=e53]: 1200+ hrs
              - paragraph [ref=e54]: Saved Annually
              - paragraph [ref=e55]: Seamless digital processes
          - generic [ref=e57]:
            - img [ref=e58]
            - generic [ref=e63]:
              - paragraph [ref=e64]: 98%
              - paragraph [ref=e65]: Process Automation
              - paragraph [ref=e66]: Manual work eliminated
          - generic [ref=e68]:
            - img [ref=e69]
            - generic [ref=e71]:
              - paragraph [ref=e72]: 95%
              - paragraph [ref=e73]: On-Time Fee Collection
              - paragraph [ref=e74]: Digital payments
      - generic [ref=e75]: © 2026 Vitana private limited
    - generic [ref=e76]:
      - button [ref=e79] [cursor=pointer]:
        - img
      - generic [ref=e81]:
        - generic [ref=e82]:
          - button "Administration" [ref=e83] [cursor=pointer]:
            - img [ref=e84]
            - text: Administration
          - button "Staff Portal" [ref=e86] [cursor=pointer]:
            - img [ref=e87]
            - text: Staff Portal
        - generic [ref=e91]:
          - heading "Admin Login" [level=2] [ref=e92]
          - paragraph [ref=e93]: Sign in to your account
        - generic [ref=e94]:
          - generic [ref=e95]:
            - text: Email address
            - textbox "Email address" [ref=e96]:
              - /placeholder: admin@school.edu
          - generic [ref=e97]:
            - text: Password
            - generic [ref=e98]:
              - textbox "Password" [ref=e99]:
                - /placeholder: Enter your password
              - button "Show password" [ref=e100] [cursor=pointer]:
                - img
          - alert [ref=e101]:
            - img [ref=e102]
            - generic [ref=e104]: Your session has expired. Please log in again.
          - button "Sign In" [ref=e105] [cursor=pointer]
        - generic [ref=e106]:
          - generic [ref=e109]: Demo Credentials
          - generic [ref=e110]:
            - generic [ref=e111]:
              - generic [ref=e112]: Admin
              - button "Use credentials" [ref=e113] [cursor=pointer]
            - generic [ref=e114]:
              - generic [ref=e115]: Parent
              - button "Use credentials" [ref=e116] [cursor=pointer]
        - link "Super Admin Access →" [ref=e118] [cursor=pointer]:
          - /url: /super-admin-login
  - region "Notifications alt+T"
```

# Test source

```ts
  62  |     if (!fs.existsSync(AUTH_FILE)) return null;
  63  |     const data = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
  64  |     const entry = data.origins?.[0]?.localStorage?.find((e: { name: string }) => e.name === 'authToken');
  65  |     return entry?.value ?? null;
  66  |   } catch {
  67  |     return null;
  68  |   }
  69  | }
  70  | 
  71  | async function injectAuthIntoPage(page: Page): Promise<void> {
  72  |   try {
  73  |     if (!fs.existsSync(AUTH_FILE)) return;
  74  |     const data = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
  75  |     const pwE2eAuth = data.origins?.[0]?.localStorage?.find((e: { name: string }) => e.name === 'pw_e2e_auth');
  76  |     const authToken = data.origins?.[0]?.localStorage?.find((e: { name: string }) => e.name === 'authToken');
  77  |     const schoolId = data.origins?.[0]?.localStorage?.find((e: { name: string }) => e.name === 'schoolId');
  78  | 
  79  |     if (pwE2eAuth && authToken && schoolId) {
  80  |       const auth_session = JSON.parse(pwE2eAuth.value);
  81  |       await page.addInitScript((auth: unknown, token: string, school: string) => {
  82  |         localStorage.setItem('pw_e2e_auth', JSON.stringify(auth));
  83  |         localStorage.setItem('authToken', token);
  84  |         localStorage.setItem('schoolId', school);
  85  |         sessionStorage.setItem('auth_session', JSON.stringify(auth));
  86  |       }, auth_session, authToken.value, schoolId.value);
  87  |     }
  88  |   } catch (err) {
  89  |     console.log('⚠ Auth injection error:', err);
  90  |   }
  91  | }
  92  | 
  93  | // ── Cleanup helpers (API-level) ───────────────────────────────────────────────
  94  | 
  95  | async function deleteAcademicYearIfExists(
  96  |   request: APIRequestContext,
  97  |   yearName: string,
  98  |   token: string,
  99  | ): Promise<void> {
  100 |   try {
  101 |     const resp = await request.get(`${API_BASE}/academics/academic-years?page=1&pageSize=100`, {
  102 |       headers: { Authorization: `Bearer ${token}` },
  103 |     });
  104 |     if (!resp.ok()) return;
  105 |     const body = await resp.json();
  106 |     const years: Array<{ id: string; name: string }> = body?.academicYears ?? [];
  107 |     const match = years.find((y) => y.name === yearName);
  108 |     if (match) {
  109 |       await request.delete(`${API_BASE}/academics/academic-years/${match.id}`, {
  110 |         headers: { Authorization: `Bearer ${token}` },
  111 |       });
  112 |       console.log(`✓ Cleaned up academic year: ${yearName}`);
  113 |     }
  114 |   } catch { /* cleanup is best-effort */ }
  115 | }
  116 | 
  117 | async function deleteClassIfExists(
  118 |   request: APIRequestContext,
  119 |   standard: string,
  120 |   token: string,
  121 | ): Promise<void> {
  122 |   try {
  123 |     const resp = await request.get(`${API_BASE}/academics/classes?page=1&pageSize=200`, {
  124 |       headers: { Authorization: `Bearer ${token}` },
  125 |     });
  126 |     if (!resp.ok()) return;
  127 |     const body = await resp.json();
  128 |     const classes: Array<{ id: string; standard: string }> = body?.classes ?? [];
  129 |     for (const cls of classes.filter((c) => c.standard === standard)) {
  130 |       await request.delete(`${API_BASE}/academics/classes/${cls.id}`, {
  131 |         headers: { Authorization: `Bearer ${token}` },
  132 |       });
  133 |     }
  134 |     console.log(`✓ Cleaned up classes for standard: ${standard}`);
  135 |   } catch { /* cleanup is best-effort */ }
  136 | }
  137 | 
  138 | // ── Shared state across phases ────────────────────────────────────────────────
  139 | 
  140 | let createdYearId: string = '';
  141 | let createdClassId: string = '';
  142 | let createdSectionAId: string = '';
  143 | 
  144 | // ══════════════════════════════════════════════════════════════════════════════
  145 | // PHASE 1 — Academic Year
  146 | // ══════════════════════════════════════════════════════════════════════════════
  147 | 
  148 | test.describe('Phase 1 — Academic Year setup', () => {
  149 |   test.beforeAll(async ({ request }) => {
  150 |     const token = getTokenFromAuthFile();
  151 |     if (token) await deleteAcademicYearIfExists(request, TEST_YEAR, token);
  152 |   });
  153 | 
  154 |   test('1.1 — Navigate to Academic Setup page', async ({ page }) => {
  155 |     await injectAuthIntoPage(page);
  156 |     await page.goto(`${UI_BASE}/academics`);
  157 |     await page.waitForLoadState('networkidle');
  158 | 
  159 |     // The page h1 says "Academic Configuration"
  160 |     await expect(
  161 |       page.getByRole('heading', { name: /Academic Configuration/i }).first(),
> 162 |     ).toBeVisible({ timeout: 15_000 });
      |       ^ Error: expect(locator).toBeVisible() failed
  163 | 
  164 |     // Tabs should be visible
  165 |     await expect(page.getByRole('tab', { name: /Academic Years/i }).first()).toBeVisible();
  166 |   });
  167 | 
  168 |   test('1.2 — Create academic year 2026-2027', async ({ page, request }) => {
  169 |     await injectAuthIntoPage(page);
  170 |     await page.goto(`${UI_BASE}/academics`);
  171 |     await page.waitForLoadState('networkidle');
  172 | 
  173 |     // "Academic Years" tab is the default active tab
  174 |     await page.getByRole('tab', { name: /Academic Years/i }).first().click();
  175 |     await page.waitForTimeout(300);
  176 | 
  177 |     // Click "Add Academic Year"
  178 |     await page.getByRole('button', { name: /Add Academic Year/i }).first().click();
  179 | 
  180 |     const dialog = page.getByRole('dialog');
  181 |     await expect(dialog).toBeVisible({ timeout: 5_000 });
  182 | 
  183 |     // Name
  184 |     await dialog.locator('input#name').fill(TEST_YEAR);
  185 |     // Start date
  186 |     await dialog.locator('input#startDate').fill(TEST_YEAR_START);
  187 |     // End date
  188 |     await dialog.locator('input#endDate').fill(TEST_YEAR_END);
  189 | 
  190 |     // Submit (Create button)
  191 |     await dialog.getByRole('button', { name: /^Create$/i }).click();
  192 | 
  193 |     // Success toast
  194 |     await expect(page.getByText(/academic year created successfully/i).first()).toBeVisible({ timeout: 10_000 });
  195 | 
  196 |     // Capture created year ID via API
  197 |     const token = getTokenFromAuthFile();
  198 |     if (token) {
  199 |       const resp = await request.get(`${API_BASE}/academics/academic-years?pageSize=100`, {
  200 |         headers: { Authorization: `Bearer ${token}` },
  201 |       });
  202 |       if (resp.ok()) {
  203 |         const body = await resp.json();
  204 |         const years: Array<{ id: string; name: string }> = body?.academicYears ?? [];
  205 |         createdYearId = years.find((y) => y.name === TEST_YEAR)?.id ?? '';
  206 |         console.log(`✓ Academic year created: ${createdYearId}`);
  207 |       }
  208 |     }
  209 |   });
  210 | 
  211 |   test('1.3 — Year 2026-2027 appears in the table', async ({ page }) => {
  212 |     await injectAuthIntoPage(page);
  213 |     await page.goto(`${UI_BASE}/academics`);
  214 |     await page.waitForLoadState('networkidle');
  215 |     await page.getByRole('tab', { name: /Academic Years/i }).first().click();
  216 | 
  217 |     await expect(page.getByRole('cell', { name: TEST_YEAR }).first()).toBeVisible({ timeout: 10_000 });
  218 |   });
  219 | 
  220 |   test('1.4 — Set 2026-2027 as current year', async ({ page }) => {
  221 |     await injectAuthIntoPage(page);
  222 |     await page.goto(`${UI_BASE}/academics`);
  223 |     await page.waitForLoadState('networkidle');
  224 |     await page.getByRole('tab', { name: /Academic Years/i }).first().click();
  225 | 
  226 |     // Find the row for 2026-2027
  227 |     const row = page.getByRole('row').filter({ hasText: TEST_YEAR });
  228 | 
  229 |     // Check if "Set Current" button exists (won't exist if already current)
  230 |     const setCurrentBtn = row.getByRole('button', { name: /Set Current/i });
  231 |     const isBtn = await setCurrentBtn.isVisible({ timeout: 3_000 }).catch(() => false);
  232 | 
  233 |     if (isBtn) {
  234 |       await setCurrentBtn.click();
  235 |       await expect(
  236 |         page.getByText(new RegExp(`${TEST_YEAR}.*is now the current academic year`, 'i')).first(),
  237 |       ).toBeVisible({ timeout: 10_000 });
  238 |     } else {
  239 |       // Already current — verify "Current" badge
  240 |       await expect(row.getByText(/Current/i).first()).toBeVisible({ timeout: 5_000 });
  241 |     }
  242 |   });
  243 | 
  244 |   test('1.5 — Nav header dropdown shows a year', async ({ page }) => {
  245 |     await injectAuthIntoPage(page);
  246 |     await page.goto(`${UI_BASE}/academics`);
  247 |     await page.waitForLoadState('networkidle');
  248 | 
  249 |     // Year dropdown button in the header (shows "20XX-20XX" pattern)
  250 |     const headerBtn = page.locator('button').filter({ hasText: /20\d\d-20\d\d/ }).first();
  251 |     await expect(headerBtn).toBeVisible({ timeout: 15_000 });
  252 |   });
  253 | });
  254 | 
  255 | // ══════════════════════════════════════════════════════════════════════════════
  256 | // PHASE 2 — Class Management
  257 | // ══════════════════════════════════════════════════════════════════════════════
  258 | 
  259 | test.describe('Phase 2 — Class management', () => {
  260 |   test.beforeAll(async ({ request }) => {
  261 |     const token = getTokenFromAuthFile();
  262 |     if (token) await deleteClassIfExists(request, TEST_CLASS_STANDARD, token);
```