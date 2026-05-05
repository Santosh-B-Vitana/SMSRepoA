# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: academic-setup.spec.ts >> Phase 3 — Section management >> 3.2 — Create Section A under Class 12
- Location: e2e\academic-setup.spec.ts:400:3

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
  270 |     await page.getByRole('tab', { name: /^Classes$/i }).first().click();
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
> 354 |     await page.getByRole('tab', { name: /^Classes$/i }).first().click();
      |                                                                 ^ TimeoutError: locator.click: Timeout 15000ms exceeded.
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
  371 | 
  372 |     // Click "Add Section"
  373 |     await page.getByRole('button', { name: /Add Section/i }).first().click();
  374 | 
  375 |     const dialog = page.getByRole('dialog');
  376 |     await expect(dialog).toBeVisible({ timeout: 5_000 });
  377 | 
  378 |     // Section name field (id="sectionName")
  379 |     await dialog.locator('input#sectionName').fill(sectionName);
  380 | 
  381 |     // Submit
  382 |     await dialog.getByRole('button', { name: /Add.*Section/i }).click();
  383 | 
  384 |     await expect(page.getByText(/Section added successfully/i).first()).toBeVisible({ timeout: 10_000 });
  385 |   }
  386 | 
  387 |   test('3.1 — Open Class 12 detail page', async ({ page }) => {
  388 |     await injectAuthIntoPage(page);
  389 |     await openClass12Detail(page);
  390 | 
  391 |     // Should show the class name heading
  392 |     await expect(
  393 |       page.getByText(new RegExp(TEST_CLASS_STANDARD, 'i')).first(),
  394 |     ).toBeVisible({ timeout: 10_000 });
  395 | 
  396 |     // Sections tab should be visible
  397 |     await expect(page.getByRole('tab', { name: /Sections/i }).first()).toBeVisible();
  398 |   });
  399 | 
  400 |   test('3.2 — Create Section A under Class 12', async ({ page, request }) => {
  401 |     await injectAuthIntoPage(page);
  402 |     await addSection(page, 'Section A');
  403 | 
  404 |     // Capture section ID
  405 |     const token = getTokenFromAuthFile();
  406 |     if (token && createdClassId) {
  407 |       const resp = await request.get(
  408 |         `${API_BASE}/academics/sections?classId=${createdClassId}&pageSize=50`,
  409 |         { headers: { Authorization: `Bearer ${token}` } },
  410 |       );
  411 |       if (resp.ok()) {
  412 |         const body = await resp.json();
  413 |         const sections: Array<{ id: string; name: string }> = body?.sections ?? [];
  414 |         createdSectionAId = sections.find((s) => s.name === 'Section A' || s.name === 'A')?.id ?? '';
  415 |         console.log(`✓ Section A created: ${createdSectionAId}`);
  416 |       }
  417 |     }
  418 |   });
  419 | 
  420 |   test('3.3 — Create Section B under Class 12', async ({ page }) => {
  421 |     await injectAuthIntoPage(page);
  422 |     await addSection(page, 'Section B');
  423 |   });
  424 | 
  425 |   test('3.4 — Both sections A and B appear on the Class 12 page', async ({ page }) => {
  426 |     await injectAuthIntoPage(page);
  427 |     await openClass12Detail(page);
  428 | 
  429 |     for (const s of ['Section A', 'Section B']) {
  430 |       await expect(page.getByRole('cell', { name: s }).first()).toBeVisible({ timeout: 10_000 });
  431 |     }
  432 |   });
  433 | 
  434 |   test('3.5 — Section A detail page renders with student management', async ({ page }) => {
  435 |     await injectAuthIntoPage(page);
  436 | 
  437 |     if (createdClassId && createdSectionAId) {
  438 |       await page.goto(`${UI_BASE}/academics/classes/${createdClassId}/sections/${createdSectionAId}`);
  439 |     } else {
  440 |       await openClass12Detail(page);
  441 |       // Click "Manage" for Section A
  442 |       const sectionRow = page.getByRole('row').filter({ hasText: /Section A/ });
  443 |       await sectionRow.getByRole('button', { name: /Manage/i }).click();
  444 |     }
  445 |     await page.waitForLoadState('networkidle');
  446 | 
  447 |     // Switch to Students tab if present
  448 |     const studentsTab = page.getByRole('tab', { name: /Students/i }).first();
  449 |     if (await studentsTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
  450 |       await studentsTab.click();
  451 |       await page.waitForTimeout(300);
  452 |     }
  453 | 
  454 |     // "Add Students" button must be present
```