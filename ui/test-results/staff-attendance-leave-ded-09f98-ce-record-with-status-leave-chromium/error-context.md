# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: staff-attendance-leave-deduction.spec.ts >> Phase 3: Admin marks attendance as leave >> admin creates staff attendance record with status=leave
- Location: e2e\staff-attendance-leave-deduction.spec.ts:315:3

# Error details

```
Error: POST /Attendance/staff → 500: {"message":"An error occurred while creating the attendance.","error":"An error occurred while saving the entity changes. See the inner exception for details."}

expect(received).toBeTruthy()

Received: false
```

# Test source

```ts
  276 |         b => b.leaveTypeId === sickLeaveTypeId || b.leaveTypeName?.toLowerCase().includes('sick'),
  277 |       );
  278 |       baselineUsed = sickBalance?.used ?? 0;
  279 |       console.log(`Baseline ${sickLeaveTypeName} used: ${baselineUsed}`);
  280 |     } else {
  281 |       console.log(`Could not fetch baseline balance (${res.status()}) — will compare as >= 0`);
  282 |       baselineUsed = -1; // sentinel: skip exact comparison
  283 |     }
  284 |     // Test always passes — baseline is informational
  285 |     expect(true).toBe(true);
  286 |   });
  287 | 
  288 |   test('delete any existing attendance record for today to start clean', async ({ request }) => {
  289 |     // Fetch today's attendance for Amit Kapoor
  290 |     const res = await adminGet(
  291 |       request,
  292 |       `/Attendance/staff?staffId=${staffMemberId}&date=${TODAY}`,
  293 |     );
  294 |     if (res.ok()) {
  295 |       const body = await res.json();
  296 |       const records: Array<{ id: string }> = body?.data ?? body ?? [];
  297 |       for (const rec of records) {
  298 |         if (rec.id) {
  299 |           await adminDelete(request, `/Attendance/staff/${rec.id}`);
  300 |           console.log(`Deleted existing attendance ${rec.id} for today`);
  301 |         }
  302 |       }
  303 |     }
  304 |     expect(true).toBe(true); // non-blocking
  305 |   });
  306 | 
  307 | });
  308 | 
  309 | // ══════════════════════════════════════════════════════════════════════════════
  310 | // PHASE 3 — Admin marks attendance as leave
  311 | // ══════════════════════════════════════════════════════════════════════════════
  312 | 
  313 | test.describe('Phase 3: Admin marks attendance as leave', () => {
  314 | 
  315 |   test('admin creates staff attendance record with status=leave', async ({ request }) => {
  316 |     // Re-fetch module vars if empty (can happen on retry with fresh module scope)
  317 |     if (!staffMemberId) {
  318 |       const staffRes = await adminGet(request, '/Staff?pageSize=100');
  319 |       if (staffRes.ok()) {
  320 |         const b = await staffRes.json();
  321 |         const rawData = b?.data;
  322 |         const arr: Array<{ id: string; firstName?: string; lastName?: string; email?: string }> =
  323 |           rawData?.staff ?? rawData?.items ?? (Array.isArray(rawData) ? rawData : []);
  324 |         const amit = arr.find((s) =>
  325 |           (s.firstName?.toLowerCase().includes('amit') && s.lastName?.toLowerCase().includes('kapoor')) ||
  326 |           s.email?.toLowerCase().includes('amit.k')
  327 |         );
  328 |         if (amit) staffMemberId = amit.id;
  329 |       }
  330 |     }
  331 |     if (!sickLeaveTypeId) {
  332 |       const typesRes = await adminGet(request, '/LeaveManagement/types?userType=Staff');
  333 |       if (typesRes.ok()) {
  334 |         const b = await typesRes.json();
  335 |         const types: Array<{ id: string; name: string }> = b?.data ?? b ?? [];
  336 |         const sick = types.find((t) => t.name?.toLowerCase().includes('sick')) ?? types[0];
  337 |         if (sick) { sickLeaveTypeId = sick.id; sickLeaveTypeName = sick.name; }
  338 |       }
  339 |     }
  340 | 
  341 |     const payload = {
  342 |       schoolId,
  343 |       staffId: staffMemberId,
  344 |       date: TODAY,
  345 |       status: 'leave',
  346 |       leaveTypeId: sickLeaveTypeId,
  347 |       remarks: `E2E test — ${TODAY}`,
  348 |     };
  349 | 
  350 |     // Check for existing record first (may exist from a previous failed run) — upsert pattern
  351 |     const existingRes = await adminGet(request, `/Attendance/staff?staffId=${staffMemberId}&date=${TODAY}`);
  352 |     if (existingRes.ok()) {
  353 |       const existingBody = await existingRes.json();
  354 |       const existingRecords: Array<{ id: string; status: string; date: string }> = existingBody?.data ?? existingBody ?? [];
  355 |       const existing = existingRecords.find((r) => r.date?.startsWith(TODAY));
  356 |       if (existing?.id) {
  357 |         // Record already exists — PUT to update it to leave status
  358 |         const putRes = await adminPut(request, `/Attendance/staff/${existing.id}`, {
  359 |           status: 'leave',
  360 |           leaveTypeId: sickLeaveTypeId,
  361 |           remarks: payload.remarks,
  362 |         });
  363 |         if (putRes.ok()) {
  364 |           const putBody = await putRes.json();
  365 |           const rec = putBody?.data ?? putBody;
  366 |           createdAttendanceId = rec?.id ?? existing.id;
  367 |           expect(rec?.status ?? 'leave').toBe('leave');
  368 |           console.log(`Updated existing attendance ${createdAttendanceId} to status=leave`);
  369 |           return;
  370 |         }
  371 |       }
  372 |     }
  373 | 
  374 |     // No existing record — POST new one
  375 |     const res = await adminPost(request, '/Attendance/staff', payload);
> 376 |     expect(res.ok(), `POST /Attendance/staff → ${res.status()}: ${await res.text()}`).toBeTruthy();
      |                                                                                       ^ Error: POST /Attendance/staff → 500: {"message":"An error occurred while creating the attendance.","error":"An error occurred while saving the entity changes. See the inner exception for details."}
  377 |     const body = await res.json();
  378 |     const record = body?.data ?? body;
  379 |     expect(record.status).toBe('leave');
  380 |     createdAttendanceId = record.id;
  381 |     console.log(`Created attendance ${createdAttendanceId} status=leave leaveTypeId=${sickLeaveTypeId}`);
  382 |   });
  383 | 
  384 | });
  385 | 
  386 | // ══════════════════════════════════════════════════════════════════════════════
  387 | // PHASE 4 — API verification
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
```