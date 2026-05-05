# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: academic-setup.spec.ts >> Phase 2 — Class management >> 2.1 — Classes tab shows Add Class button
- Location: e2e\academic-setup.spec.ts:265:3

# Error details

```
TimeoutError: locator.click: Timeout 15000ms exceeded.
Call log:
  - waiting for getByRole('tab', { name: /^Classes$/i }).first()

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
  263 |   });
  264 | 
  265 |   test('2.1 — Classes tab shows Add Class button', async ({ page }) => {
  266 |     await injectAuthIntoPage(page);
  267 |     await page.goto(`${UI_BASE}/academics`);
  268 |     await page.waitForLoadState('networkidle');
  269 | 
> 270 |     await page.getByRole('tab', { name: /^Classes$/i }).first().click();
      |                                                                 ^ TimeoutError: locator.click: Timeout 15000ms exceeded.
  271 |     await page.waitForTimeout(300);
  272 | 
  273 |     await expect(page.getByRole('button', { name: /Add Class/i }).first()).toBeVisible({ timeout: 10_000 });
  274 |   });
  275 | 
  276 |   test('2.2 — Create Class 12 with section A', async ({ page, request }) => {
  277 |     await injectAuthIntoPage(page);
  278 |     await page.goto(`${UI_BASE}/academics`);
  279 |     await page.waitForLoadState('networkidle');
  280 | 
  281 |     await page.getByRole('tab', { name: /^Classes$/i }).first().click();
  282 |     await page.waitForTimeout(300);
  283 | 
  284 |     await page.getByRole('button', { name: /Add Class/i }).first().click();
  285 | 
  286 |     const dialog = page.getByRole('dialog');
  287 |     await expect(dialog).toBeVisible({ timeout: 5_000 });
  288 | 
  289 |     // Standard field (id="standard")
  290 |     await dialog.locator('input#standard').fill(TEST_CLASS_STANDARD);
  291 |     // Section field (id="section")
  292 |     await dialog.locator('input#section').fill(TEST_CLASS_SECTION);
  293 | 
  294 |     // Select academic year 2026-2027 via the Select component
  295 |     const selectTrigger = dialog.locator('[role="combobox"]').first();
  296 |     await selectTrigger.click();
  297 |     await page.waitForTimeout(200);
  298 |     // Pick 2026-2027
  299 |     const yearOption = page.getByRole('option', { name: '2026-2027' });
  300 |     const optionVisible = await yearOption.isVisible({ timeout: 2_000 }).catch(() => false);
  301 |     if (optionVisible) {
  302 |       await yearOption.click();
  303 |     } else {
  304 |       // Shadcn select may render in a portal
  305 |       await page.locator('[role="listbox"] [role="option"]').filter({ hasText: '2026-2027' }).click().catch(() => {});
  306 |     }
  307 | 
  308 |     // Click Create
  309 |     await dialog.getByRole('button', { name: /^Create$/i }).click();
  310 | 
  311 |     await expect(page.getByText(/Class created successfully/i).first()).toBeVisible({ timeout: 10_000 });
  312 | 
  313 |     // Capture class ID via API
  314 |     const token = getTokenFromAuthFile();
  315 |     if (token) {
  316 |       const resp = await request.get(`${API_BASE}/academics/classes?pageSize=200`, {
  317 |         headers: { Authorization: `Bearer ${token}` },
  318 |       });
  319 |       if (resp.ok()) {
  320 |         const body = await resp.json();
  321 |         const classes: Array<{ id: string; standard: string }> = body?.classes ?? [];
  322 |         createdClassId = classes.find((c) => c.standard === TEST_CLASS_STANDARD)?.id ?? '';
  323 |         console.log(`✓ Class created: ${createdClassId}`);
  324 |       }
  325 |     }
  326 |   });
  327 | 
  328 |   test('2.3 — Class 12 appears in class list', async ({ page }) => {
  329 |     await injectAuthIntoPage(page);
  330 |     await page.goto(`${UI_BASE}/academics`);
  331 |     await page.waitForLoadState('networkidle');
  332 |     await page.getByRole('tab', { name: /^Classes$/i }).first().click();
  333 | 
  334 |     await expect(
  335 |       page.getByRole('cell', { name: TEST_CLASS_STANDARD }).first(),
  336 |     ).toBeVisible({ timeout: 10_000 });
  337 |   });
  338 | });
  339 | 
  340 | // ══════════════════════════════════════════════════════════════════════════════
  341 | // PHASE 3 — Section Management
  342 | // ══════════════════════════════════════════════════════════════════════════════
  343 | 
  344 | test.describe('Phase 3 — Section management', () => {
  345 |   async function openClass12Detail(page: Page): Promise<void> {
  346 |     if (createdClassId) {
  347 |       await page.goto(`${UI_BASE}/academics/classes/${createdClassId}`);
  348 |       await page.waitForLoadState('networkidle');
  349 |       return;
  350 |     }
  351 |     // Fallback: navigate via Settings gear button in Classes table
  352 |     await page.goto(`${UI_BASE}/academics`);
  353 |     await page.waitForLoadState('networkidle');
  354 |     await page.getByRole('tab', { name: /^Classes$/i }).first().click();
  355 |     await page.waitForTimeout(300);
  356 |     // Click the gear / Settings button in Class 12 row
  357 |     const row = page.getByRole('row').filter({ hasText: TEST_CLASS_STANDARD });
  358 |     await row.locator('button').first().click();
  359 |     await page.waitForLoadState('networkidle');
  360 |   }
  361 | 
  362 |   async function addSection(page: Page, sectionName: string): Promise<void> {
  363 |     await openClass12Detail(page);
  364 | 
  365 |     // Ensure we're on the Sections tab (default)
  366 |     const sectionsTab = page.getByRole('tab', { name: /^Sections$/i }).first();
  367 |     if (await sectionsTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
  368 |       await sectionsTab.click();
  369 |       await page.waitForTimeout(200);
  370 |     }
```