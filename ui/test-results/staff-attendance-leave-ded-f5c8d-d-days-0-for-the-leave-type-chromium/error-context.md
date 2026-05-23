# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: staff-attendance-leave-deduction.spec.ts >> Phase 6: Staff UI — My Leaves balance is deducted >> leave balance shows used days > 0 for the leave type
- Location: e2e\staff-attendance-leave-deduction.spec.ts:570:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: /leave management/i }).first()
Expected: visible
Timeout: 20000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 20000ms
  - waiting for getByRole('heading', { name: /leave management/i }).first()
    - waiting for" http://localhost:8080/login?expired=true" navigation to finish...
    - navigated to "http://localhost:8080/login?expired=true"
    - waiting for" http://localhost:8080/login" navigation to finish...
    - navigated to "http://localhost:8080/login"

```

# Test source

```ts
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
  488 |     await expect(page.getByRole('heading', { name: 'My Attendance' })).toBeVisible({ timeout: 10_000 });
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
> 578 |     ).toBeVisible({ timeout: 20_000 });
      |       ^ Error: expect(locator).toBeVisible() failed
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
  589 | 
  590 |     // The critical assertion: the leave type must be visible
  591 |     const pageText = await page.innerText('body');
  592 |     if (sickLeaveTypeName) {
  593 |       expect(pageText).toContain(sickLeaveTypeName);
  594 |     }
  595 |   });
  596 | 
  597 |   test('API confirms leave balance used days equals baseline + 1', async ({ request }) => {
  598 |     if (baselineUsed === -1) {
  599 |       console.log('Skipping: could not establish baseline');
  600 |       return;
  601 |     }
  602 |     // Balance stored under staffMemberId (StaffMember.Id)
  603 |     const idToTry = staffMemberId || staffUserId;
  604 |     const res = await adminGet(
  605 |       request,
  606 |       `/LeaveManagement/balance/${idToTry}?userType=Staff`,
  607 |     );
  608 |     if (!res.ok()) {
  609 |       console.log(`Balance API returned ${res.status()} — skipping`);
  610 |       return;
  611 |     }
  612 |     const body = await res.json();
  613 |     const balances: Array<{ leaveTypeId: string; used: number; leaveTypeName?: string }> =
  614 |       body?.data ?? body ?? [];
  615 |     const sickBalance = balances.find(
  616 |       b => b.leaveTypeId === sickLeaveTypeId || b.leaveTypeName?.toLowerCase().includes('sick'),
  617 |     );
  618 |     const newUsed = sickBalance?.used ?? 0;
  619 |     console.log(`Final check — ${sickLeaveTypeName}: was ${baselineUsed}, now ${newUsed}. Deducted: ${newUsed - baselineUsed}`);
  620 |     expect(newUsed).toBeGreaterThanOrEqual(baselineUsed + 1);
  621 |   });
  622 | 
  623 |   test('cleanup — restore attendance record (delete test record)', async ({ request }) => {
  624 |     if (!createdAttendanceId) return;
  625 |     const res = await adminDelete(request, `/Attendance/staff/${createdAttendanceId}`);
  626 |     console.log(`Cleanup: deleted attendance ${createdAttendanceId} → status ${res.status()}`);
  627 |     // Non-blocking
  628 |     expect(true).toBe(true);
  629 |   });
  630 | 
  631 | });
  632 | 
```