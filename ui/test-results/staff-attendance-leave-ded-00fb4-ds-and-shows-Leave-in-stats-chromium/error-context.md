# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: staff-attendance-leave-deduction.spec.ts >> Phase 5: Staff UI — My Attendance shows leave >> My Attendance page loads and shows Leave in stats
- Location: e2e\staff-attendance-leave-deduction.spec.ts:481:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'My Attendance' })
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByRole('heading', { name: 'My Attendance' })
    - waiting for" http://localhost:8080/login" navigation to finish...
    - navigated to "http://localhost:8080/login"

```

# Test source

```ts
  388 | // ══════════════════════════════════════════════════════════════════════════════
  389 | 
  390 | test.describe('Phase 4: API — verify attendance and leave deduction', () => {
  391 | 
  392 |   test('GET attendance for Amit Kapoor today shows status=leave with correct leave type', async ({ request }) => {
  393 |     // Re-fetch sickLeaveTypeId if empty (can happen on retry)
  394 |     if (!sickLeaveTypeId) {
  395 |       const typesRes = await adminGet(request, '/LeaveManagement/types?userType=Staff');
  396 |       if (typesRes.ok()) {
  397 |         const b = await typesRes.json();
  398 |         const types: Array<{ id: string; name: string }> = b?.data ?? b ?? [];
  399 |         const sick = types.find((t) => t.name?.toLowerCase().includes('sick')) ?? types[0];
  400 |         if (sick) { sickLeaveTypeId = sick.id; sickLeaveTypeName = sick.name; }
  401 |       }
  402 |     }
  403 | 
  404 |     const res = await adminGet(
  405 |       request,
  406 |       `/Attendance/staff?staffId=${staffMemberId}&date=${TODAY}`,
  407 |     );
  408 |     expect(res.ok()).toBeTruthy();
  409 |     const body = await res.json();
  410 |     const records: Array<{
  411 |       id: string; status: string; leaveTypeId?: string; leaveTypeName?: string; leaveDeducted?: boolean;
  412 |     }> = body?.data ?? body ?? [];
  413 |     const todayRecord = records.find(r => r.id === createdAttendanceId || r.status === 'leave');
  414 |     expect(todayRecord, 'Today\'s leave attendance must be found').toBeTruthy();
  415 |     expect(todayRecord!.status).toBe('leave');
  416 |     // Only assert exact leaveTypeId if we have it (avoids failure when module scope was reset)
  417 |     if (sickLeaveTypeId) {
  418 |       expect(todayRecord!.leaveTypeId).toBe(sickLeaveTypeId);
  419 |     } else {
  420 |       expect(todayRecord!.leaveTypeId).toBeTruthy();
  421 |     }
  422 |     expect(todayRecord!.leaveTypeName).toBeTruthy();
  423 |     console.log(`API verify: status=${todayRecord!.status} leaveTypeName=${todayRecord!.leaveTypeName} leaveDeducted=${todayRecord!.leaveDeducted}`);
  424 |   });
  425 | 
  426 |   test('leave balance for Amit Kapoor has increased "used" count by 1', async ({ request }) => {
  427 |     if (baselineUsed === -1) {
  428 |       console.log('Skipping balance check (could not read baseline)');
  429 |       return;
  430 |     }
  431 |     // Balance stored under staffMemberId (StaffMember.Id)
  432 |     const idToTry = staffMemberId || staffUserId;
  433 |     const res = await adminGet(
  434 |       request,
  435 |       `/LeaveManagement/balance/${idToTry}?userType=Staff`,
  436 |     );
  437 |     expect(res.ok(), `GET /LeaveManagement/balance returned ${res.status()}`).toBeTruthy();
  438 |     const body = await res.json();
  439 |     const balances: Array<{ leaveTypeId: string; used: number; leaveTypeName?: string }> =
  440 |       body?.data ?? body ?? [];
  441 |     const sickBalance = balances.find(
  442 |       b => b.leaveTypeId === sickLeaveTypeId || b.leaveTypeName?.toLowerCase().includes('sick'),
  443 |     );
  444 |     const newUsed = sickBalance?.used ?? 0;
  445 |     console.log(`${sickLeaveTypeName} used: was ${baselineUsed}, now ${newUsed}`);
  446 |     expect(newUsed).toBeGreaterThanOrEqual(baselineUsed + 1);
  447 |   });
  448 | 
  449 | });
  450 | 
  451 | // ══════════════════════════════════════════════════════════════════════════════
  452 | // PHASE 5 — Staff UI: My Attendance shows the day as Leave
  453 | // ══════════════════════════════════════════════════════════════════════════════
  454 | 
  455 | test.describe('Phase 5: Staff UI — My Attendance shows leave', () => {
  456 | 
  457 |   test('staff can log in to the portal', async ({ page }) => {
  458 |     // Navigate to the app origin first so we can clear its localStorage
  459 |     await page.goto(`${UI_BASE}/`);
  460 |     await page.evaluate(() => {
  461 |       try { localStorage.clear(); sessionStorage.clear(); } catch (_e) { /* ignore */ }
  462 |     });
  463 |     // Now navigate to login — the addInitScript will run but find no pw_e2e_auth in localStorage
  464 |     await page.goto(`${UI_BASE}/login`);
  465 |     await page.waitForSelector('input[type="email"]', { timeout: 15_000 });
  466 | 
  467 |     // Click the Staff portal tab if visible
  468 |     const staffTab = page.getByRole('button', { name: /^Staff$/i });
  469 |     if (await staffTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
  470 |       await staffTab.click();
  471 |     }
  472 | 
  473 |     await page.locator('input[type="email"]').fill(STAFF_CREDENTIALS.email);
  474 |     await page.locator('input[type="password"]').fill(STAFF_CREDENTIALS.password);
  475 |     await page.getByRole('button', { name: /sign in|login|log in/i }).first().click();
  476 | 
  477 |     await page.waitForURL(/staff-dashboard|staff/, { timeout: 20_000 });
  478 |     expect(page.url()).toMatch(/staff/);
  479 |   });
  480 | 
  481 |   test('My Attendance page loads and shows Leave in stats', async ({ page }) => {
  482 |     // Inject staff auth and navigate directly
  483 |     await injectStaffAuth(page, staffToken);
  484 |     await page.goto(`${UI_BASE}/my-attendance`);
  485 |     await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  486 | 
  487 |     // Wait for the page heading (use role to avoid strict mode violation with sidebar/footer)
> 488 |     await expect(page.getByRole('heading', { name: 'My Attendance' })).toBeVisible({ timeout: 10_000 });
      |                                                                        ^ Error: expect(locator).toBeVisible() failed
  489 | 
  490 |     // Wait for data to load (spinner disappears or stat cards appear)
  491 |     await page.waitForTimeout(2_000);
  492 | 
  493 |     // The "On Leave" stat card should be >= 1
  494 |     const leaveStatCard = page.getByText('On Leave').first();
  495 |     await expect(leaveStatCard).toBeVisible({ timeout: 10_000 });
  496 | 
  497 |     // Find the numeric value in the Leave stat card — it should be ≥ 1
  498 |     // The card shows a large number above the "On Leave" label
  499 |     const leaveCard = page.locator('div').filter({ hasText: /^[0-9]+$/ }).filter({ has: page.locator('p', { hasText: 'On Leave' }) }).first();
  500 |     // Alternative: check that the page contains "On Leave" with a non-zero count by scanning text
  501 |     const pageContent = await page.content();
  502 |     // Log the stat for debugging
  503 |     console.log('Page has "On Leave" text:', pageContent.includes('On Leave'));
  504 | 
  505 |     // Verify the calendar shows blue (leave color) for today
  506 |     const todayDay = new Date().getDate().toString();
  507 |     // Look for the day cell — the leave day should have a blue tint
  508 |     const todayCell = page.locator(`[title*="${TODAY}"], [data-date="${TODAY}"]`).first();
  509 |     if (await todayCell.isVisible({ timeout: 2_000 }).catch(() => false)) {
  510 |       await expect(todayCell).toBeVisible();
  511 |       console.log('Found today cell in calendar');
  512 |     } else {
  513 |       // Calendar cells are plain divs — scan for a blue-styled div containing today's date
  514 |       const todayNum = new Date().getDate();
  515 |       const calendarDays = page.locator('.grid-cols-7 div, [class*="calendar"] div').filter({ hasText: new RegExp(`^${todayNum}$`) });
  516 |       const count = await calendarDays.count();
  517 |       console.log(`Found ${count} calendar day cells for day ${todayNum}`);
  518 |     }
  519 | 
  520 |     // Check the attendance records list — look for a row with "Leave" badge
  521 |     const leaveLabel = page.getByText('Leave').first();
  522 |     await expect(leaveLabel).toBeVisible({ timeout: 5_000 });
  523 | 
  524 |     console.log('My Attendance: leave is visible on the page');
  525 |   });
  526 | 
  527 |   test('attendance record list shows today with Leave status', async ({ page }) => {
  528 |     await injectStaffAuth(page, staffToken);
  529 |     await page.goto(`${UI_BASE}/my-attendance`);
  530 |     await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  531 |     await page.waitForTimeout(2_000);
  532 | 
  533 |     // The records table/list should have a row showing Leave
  534 |     const leaveRows = page.locator('text=Leave');
  535 |     const count = await leaveRows.count();
  536 |     expect(count, 'At least one Leave entry should appear in the attendance records').toBeGreaterThan(0);
  537 | 
  538 |     // Also check that the leave type name is shown somewhere on the page
  539 |     if (sickLeaveTypeName) {
  540 |       const leaveTypeMention = page.getByText(sickLeaveTypeName).first();
  541 |       const isVisible = await leaveTypeMention.isVisible({ timeout: 3_000 }).catch(() => false);
  542 |       console.log(`Leave type "${sickLeaveTypeName}" visible on My Attendance: ${isVisible}`);
  543 |     }
  544 |   });
  545 | 
  546 | });
  547 | 
  548 | // ══════════════════════════════════════════════════════════════════════════════
  549 | // PHASE 6 — Staff UI: My Leaves shows deducted balance
  550 | // ══════════════════════════════════════════════════════════════════════════════
  551 | 
  552 | test.describe('Phase 6: Staff UI — My Leaves balance is deducted', () => {
  553 | 
  554 |   test('My Leaves page loads and shows leave balance', async ({ page }) => {
  555 |     await injectStaffAuth(page, staffToken);
  556 |     await page.goto(`${UI_BASE}/leave-management`);
  557 |     await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  558 | 
  559 |     // Wait for the component to finish rendering (lazy load + API calls)
  560 |     // StaffLeaveManagerEnhanced renders h1 "Leave Management" once loading is done
  561 |     await expect(
  562 |       page.getByRole('heading', { name: /leave management/i }).first()
  563 |     ).toBeVisible({ timeout: 20_000 });
  564 | 
  565 |     const pageText = await page.innerText('body');
  566 |     console.log('Leave management page loaded, length:', pageText.length);
  567 |     expect(pageText.length, 'Page must have content').toBeGreaterThan(50);
  568 |   });
  569 | 
  570 |   test('leave balance shows used days > 0 for the leave type', async ({ page }) => {
  571 |     await injectStaffAuth(page, staffToken);
  572 |     await page.goto(`${UI_BASE}/leave-management`);
  573 |     await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  574 | 
  575 |     // Wait for the component to render after lazy load + API calls complete
  576 |     await expect(
  577 |       page.getByRole('heading', { name: /leave management/i }).first()
  578 |     ).toBeVisible({ timeout: 20_000 });
  579 |     // Also wait for the Apply for Leave button (only visible when loading=false)
  580 |     await expect(
  581 |       page.getByRole('button', { name: /apply for leave/i })
  582 |     ).toBeVisible({ timeout: 15_000 });
  583 | 
  584 |     // Look for the leave type name on the page
  585 |     if (sickLeaveTypeName) {
  586 |       const leaveTypeVisible = await page.getByText(sickLeaveTypeName).first().isVisible({ timeout: 5_000 }).catch(() => false);
  587 |       console.log(`"${sickLeaveTypeName}" visible on My Leaves: ${leaveTypeVisible}`);
  588 |     }
```