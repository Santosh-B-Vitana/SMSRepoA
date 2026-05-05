# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: academic-setup.spec.ts >> Phase 4 — Academic year nav dropdown >> 4.3 — Year selection persists across page navigations
- Location: e2e\academic-setup.spec.ts:501:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('button').filter({ hasText: /20\d\d-20\d\d/ }).first()
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for locator('button').filter({ hasText: /20\d\d-20\d\d/ }).first()

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
  455 |     await expect(
  456 |       page.getByRole('button', { name: /Add Students/i }).first(),
  457 |     ).toBeVisible({ timeout: 10_000 });
  458 |   });
  459 | });
  460 | 
  461 | // ══════════════════════════════════════════════════════════════════════════════
  462 | // PHASE 4 — Academic Year Nav Dropdown
  463 | // ══════════════════════════════════════════════════════════════════════════════
  464 | 
  465 | test.describe('Phase 4 — Academic year nav dropdown', () => {
  466 |   test('4.1 — Academic year dropdown is visible in header', async ({ page }) => {
  467 |     await injectAuthIntoPage(page);
  468 |     await page.goto(`${UI_BASE}/academics`);
  469 |     await page.waitForLoadState('networkidle');
  470 | 
  471 |     const headerBtn = page.locator('button').filter({ hasText: /20\d\d-20\d\d/ }).first();
  472 |     await expect(headerBtn).toBeVisible({ timeout: 15_000 });
  473 |   });
  474 | 
  475 |   test('4.2 — Selecting a year from the dropdown updates the display', async ({ page }) => {
  476 |     await injectAuthIntoPage(page);
  477 |     await page.goto(`${UI_BASE}/academics`);
  478 |     await page.waitForLoadState('networkidle');
  479 | 
  480 |     const headerBtn = page.locator('button').filter({ hasText: /20\d\d-20\d\d/ }).first();
  481 |     await expect(headerBtn).toBeVisible({ timeout: 15_000 });
  482 | 
  483 |     await headerBtn.click();
  484 |     const menu = page.getByRole('menu');
  485 |     await expect(menu).toBeVisible({ timeout: 5_000 });
  486 | 
  487 |     // Get all menu items — pick one different from the currently selected
  488 |     const items = menu.getByRole('menuitem');
  489 |     const count = await items.count();
  490 |     expect(count).toBeGreaterThan(0);
  491 | 
  492 |     // Click first item
  493 |     await items.first().click();
  494 |     await page.waitForTimeout(300);
  495 | 
  496 |     // Header should still show a year
  497 |     const updatedBtn = page.locator('button').filter({ hasText: /20\d\d-20\d\d/ }).first();
  498 |     await expect(updatedBtn).toBeVisible({ timeout: 5_000 });
  499 |   });
  500 | 
  501 |   test('4.3 — Year selection persists across page navigations', async ({ page }) => {
  502 |     await injectAuthIntoPage(page);
  503 |     await page.goto(`${UI_BASE}/academics`);
  504 |     await page.waitForLoadState('networkidle');
  505 | 
  506 |     // Select 2026-2027 if available
  507 |     const headerBtn = page.locator('button').filter({ hasText: /20\d\d-20\d\d/ }).first();
> 508 |     await expect(headerBtn).toBeVisible({ timeout: 15_000 });
      |                             ^ Error: expect(locator).toBeVisible() failed
  509 |     await headerBtn.click();
  510 | 
  511 |     const menu = page.getByRole('menu');
  512 |     await expect(menu).toBeVisible({ timeout: 5_000 });
  513 | 
  514 |     const yearItem = menu.getByRole('menuitem').filter({ hasText: TEST_YEAR });
  515 |     const available = await yearItem.isVisible({ timeout: 2_000 }).catch(() => false);
  516 | 
  517 |     if (!available) {
  518 |       test.skip(); // 2026-2027 not yet visible — skip persistence check
  519 |       return;
  520 |     }
  521 | 
  522 |     await yearItem.click();
  523 |     await page.waitForTimeout(300);
  524 | 
  525 |     // Grab the label of the currently selected year
  526 |     const selectedLabel = (await headerBtn.textContent()) ?? '';
  527 |     expect(selectedLabel).toMatch(/20\d\d/);
  528 | 
  529 |     // Navigate to students page
  530 |     await page.goto(`${UI_BASE}/students`);
  531 |     await page.waitForLoadState('networkidle');
  532 | 
  533 |     // Year button should still be visible with the same year
  534 |     const persistedBtn = page.locator('button').filter({ hasText: /20\d\d-20\d\d/ }).first();
  535 |     await expect(persistedBtn).toBeVisible({ timeout: 10_000 });
  536 |     const persistedLabel = (await persistedBtn.textContent()) ?? '';
  537 |     expect(persistedLabel).toContain(TEST_YEAR.slice(-4));
  538 |   });
  539 | });
  540 | 
  541 | // ══════════════════════════════════════════════════════════════════════════════
  542 | // PHASE 5 — API Smoke Tests
  543 | // ══════════════════════════════════════════════════════════════════════════════
  544 | 
  545 | test.describe('Phase 5 — API smoke tests', () => {
  546 |   test('5.1 — GET /academics/academic-years returns list', async ({ request }) => {
  547 |     const token = getTokenFromAuthFile();
  548 |     if (!token) { test.skip(); return; }
  549 | 
  550 |     const resp = await request.get(`${API_BASE}/academics/academic-years?pageSize=100`, {
  551 |       headers: { Authorization: `Bearer ${token}` },
  552 |     });
  553 |     expect(resp.ok()).toBeTruthy();
  554 |     const body = await resp.json();
  555 |     const years: Array<{ name: string }> = body?.academicYears ?? [];
  556 |     expect(years.some((y) => y.name === TEST_YEAR)).toBeTruthy();
  557 |   });
  558 | 
  559 |   test('5.2 — GET /academics/classes returns list including Class 12', async ({ request }) => {
  560 |     const token = getTokenFromAuthFile();
  561 |     if (!token) { test.skip(); return; }
  562 | 
  563 |     const resp = await request.get(`${API_BASE}/academics/classes?pageSize=200`, {
  564 |       headers: { Authorization: `Bearer ${token}` },
  565 |     });
  566 |     expect(resp.ok()).toBeTruthy();
  567 |     const body = await resp.json();
  568 |     const classes: Array<{ standard: string }> = body?.classes ?? [];
  569 |     expect(classes.some((c) => c.standard === TEST_CLASS_STANDARD)).toBeTruthy();
  570 |   });
  571 | 
  572 |   test('5.3 — GET /academics/sections with classId returns sections', async ({ request }) => {
  573 |     const token = getTokenFromAuthFile();
  574 |     if (!token || !createdClassId) { test.skip(); return; }
  575 | 
  576 |     const resp = await request.get(
  577 |       `${API_BASE}/academics/sections?classId=${createdClassId}&pageSize=50`,
  578 |       { headers: { Authorization: `Bearer ${token}` } },
  579 |     );
  580 |     expect(resp.ok()).toBeTruthy();
  581 |     const body = await resp.json();
  582 |     const sections: Array<{ name: string }> = body?.sections ?? [];
  583 |     // Sections named "Section A" or "A", "Section B" or "B"
  584 |     const hasA = sections.some((s) => /^section a$|^a$/i.test(s.name));
  585 |     const hasB = sections.some((s) => /^section b$|^b$/i.test(s.name));
  586 |     expect(hasA).toBeTruthy();
  587 |     expect(hasB).toBeTruthy();
  588 |   });
  589 | 
  590 |   test('5.4 — PATCH set-current marks year as current in DB', async ({ request }) => {
  591 |     const token = getTokenFromAuthFile();
  592 |     if (!token || !createdYearId) { test.skip(); return; }
  593 | 
  594 |     const resp = await request.patch(
  595 |       `${API_BASE}/academics/academic-years/${createdYearId}/set-current`,
  596 |       {
  597 |         headers: { Authorization: `Bearer ${token}` },
  598 |         data: {},
  599 |       },
  600 |     );
  601 |     expect(resp.ok()).toBeTruthy();
  602 |     const body = await resp.json();
  603 |     expect(body?.isCurrent).toBe(true);
  604 |     expect(body?.name).toBe(TEST_YEAR);
  605 |   });
  606 | });
  607 | 
```