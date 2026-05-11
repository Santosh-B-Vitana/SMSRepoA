# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ajith-student-flow.spec.ts >> Ajith Student Flow — Full E2E >> 3.2 – Attendance record shows present today
- Location: e2e\ajith-student-flow.spec.ts:592:3

# Error details

```
Error: A 'present' record for 2026-05-10 must exist

expect(received).toBeTruthy()

Received: undefined
```

# Test source

```ts
  504 |       // Skip assignment tests — we can't create without a valid teacher
  505 |       console.warn('  Teacher login failed; cannot create assignment. Tests 2.3-2.5 and 3.3 will skip.');
  506 |       return; // assignmentId stays empty → 2.4/2.5/3.3 will skip
  507 |     }
  508 | 
  509 |     const due = new Date();
  510 |     due.setDate(due.getDate() + 7);
  511 | 
  512 |     const res  = await POST(request, creatorToken, '/assignments', {
  513 |       classId:      class10Id    || undefined,
  514 |       sectionId:    section10AId || undefined,
  515 |       subjectId,
  516 |       title:        `Math Assignment ${SUFFIX}`,
  517 |       description:  'E2E test assignment for Ajith Kumar',
  518 |       assignedDate: TODAY,
  519 |       dueDate:      due.toISOString().split('T')[0],
  520 |       maxMarks:     100,
  521 |       status:       'active',
  522 |     });
  523 |     const status = res.status();
  524 |     const body   = await safeJson(res);
  525 |     console.log('  Create assignment (teacher) status:', status, '|', JSON.stringify(body).slice(0, 200));
  526 |     if (status < 300) {
  527 |       assignmentId = body?.data?.id ?? body?.id ?? body?.assignment?.id ?? '';
  528 |     }
  529 |     console.log('  assignmentId =', assignmentId);
  530 |     // Not asserting here — if it fails, later tests will skip
  531 |   });
  532 | 
  533 |   test('2.4 – Submit assignment for Ajith', async ({ request }) => {
  534 |     if (!assignmentId) { test.skip(true, 'No assignment available'); return; }
  535 |     expect(adminToken).toBeTruthy();
  536 |     expect(ajithId).toBeTruthy();
  537 | 
  538 |     const res    = await POST(request, adminToken, '/assignments/submissions', {
  539 |       assignmentId,
  540 |       studentId:      ajithId,
  541 |       content:        'E2E submission — comprehensive understanding of the topic.',
  542 |       submissionDate: TODAY,
  543 |     });
  544 |     const status = res.status();
  545 |     const body   = await safeJson(res);
  546 |     console.log('  Submit assignment status:', status);
  547 |     expect(status, `Submit assignment got ${status}`).toBeLessThan(300);
  548 | 
  549 |     submissionId = body?.data?.id ?? body?.id ?? body?.submission?.id ?? '';
  550 |     expect(submissionId, 'submissionId must be set').toBeTruthy();
  551 |     console.log('  submissionId =', submissionId);
  552 |   });
  553 | 
  554 |   test('2.5 – Grade Ajith submission (85/100)', async ({ request }) => {
  555 |     if (!submissionId) { test.skip(true, 'No submission available'); return; }
  556 |     expect(adminToken).toBeTruthy();
  557 |     expect(teacherStaffId).toBeTruthy();
  558 | 
  559 |     const res  = await PUT(request, adminToken, `/assignments/submissions/${submissionId}/grade`, {
  560 |       marksObtained: 85,
  561 |       feedback:      'Very good work, Ajith! Keep it up.',
  562 |       gradedById:    teacherStaffId,
  563 |       status:        'graded',
  564 |     });
  565 |     const status = res.status();
  566 |     const body   = await safeJson(res);
  567 |     console.log('  Grade submission status:', status);
  568 |     expect(status, `Grade submission got ${status}`).toBeLessThan(300);
  569 | 
  570 |     const marks = body?.data?.marksObtained ?? body?.marksObtained ?? body?.submission?.marksObtained;
  571 |     expect(Number(marks)).toBe(85);
  572 |     console.log('  Marks graded =', marks);
  573 |   });
  574 | 
  575 |   // ── PHASE 3: ADMIN VERIFICATION ──────────────────────────────────────────
  576 |   test('3.1 – Student list contains Ajith in Class 10', async ({ request }) => {
  577 |     expect(adminToken).toBeTruthy();
  578 |     expect(ajithId).toBeTruthy();
  579 | 
  580 |     const params: Record<string, string> = { page: '1', pageSize: '100' };
  581 |     if (class10Id) params.classId = class10Id;
  582 |     const res  = await GET(request, adminToken, '/students', params);
  583 |     const body = await safeJson(res);
  584 |     expect(res.status()).toBeLessThan(300);
  585 | 
  586 |     const students: any[] = body?.data?.students ?? body?.students ?? body?.items ?? [];
  587 |     const found = students.find((s: any) => s.id === ajithId);
  588 |     expect(found, 'Ajith must appear in student list').toBeTruthy();
  589 |     console.log('  Ajith found in student list');
  590 |   });
  591 | 
  592 |   test('3.2 – Attendance record shows present today', async ({ request }) => {
  593 |     expect(adminToken).toBeTruthy();
  594 |     expect(ajithId).toBeTruthy();
  595 | 
  596 |     const res  = await GET(request, adminToken, '/attendance/records', { studentId: ajithId, page: '1', pageSize: '50' });
  597 |     const body = await safeJson(res);
  598 |     expect(res.status()).toBeLessThan(300);
  599 | 
  600 |     const records: any[] = body?.data?.items ?? body?.items ?? body?.records ?? [];
  601 |     const todayRecord = records.find((r: any) =>
  602 |       r.date?.startsWith(TODAY) && r.status === 'present'
  603 |     );
> 604 |     expect(todayRecord, `A 'present' record for ${TODAY} must exist`).toBeTruthy();
      |                                                                       ^ Error: A 'present' record for 2026-05-10 must exist
  605 |     console.log('  Attendance verified');
  606 |   });
  607 | 
  608 |   test('3.3 – Submission is graded with 85 marks', async ({ request }) => {
  609 |     if (!submissionId) { test.skip(true, 'No submission created'); return; }
  610 |     expect(adminToken).toBeTruthy();
  611 |     expect(ajithId).toBeTruthy();
  612 | 
  613 |     const res  = await GET(request, adminToken, '/assignments/student-submissions', { studentId: ajithId });
  614 |     const body = await safeJson(res);
  615 |     expect(res.status()).toBeLessThan(300);
  616 | 
  617 |     const submissions: any[] = body?.data ?? body?.submissions ?? [];
  618 |     const graded = submissions.find((s: any) => s.status === 'graded' && Number(s.marksObtained) === 85);
  619 |     expect(graded, 'A graded submission with 85 marks must exist').toBeTruthy();
  620 |     console.log('  Graded submission verified — marks =', graded?.marksObtained);
  621 |   });
  622 | 
  623 |   // ── PHASE 4: PARENT API FLOW ──────────────────────────────────────────────
  624 |   test('4.1 – Parent login', async ({ request }) => {
  625 |     // Seeded parent is most reliable
  626 |     parentToken = await apiLogin(request, SEEDED_PARENT.email, SEEDED_PARENT.password);
  627 |     if (parentToken) {
  628 |       console.log('  Using seeded parent account');
  629 |       return;
  630 |     }
  631 |     // Provisioned guardian account fallback
  632 |     for (const pwd of [`Parent@${new Date().getFullYear()}!`, 'Welcome@123', 'Parent123!']) {
  633 |       parentToken = await apiLogin(request, GUARDIAN_EMAIL, pwd);
  634 |       if (parentToken) break;
  635 |     }
  636 |     if (!parentToken) {
  637 |       console.warn('  All parent logins failed — tests 4.2-5.x will skip');
  638 |     }
  639 |   });
  640 | 
  641 |   test('4.2 – my-children endpoint returns children', async ({ request }) => {
  642 |     if (!parentToken) { test.skip(true, 'Parent token unavailable'); return; }
  643 |     const res  = await GET(request, parentToken, '/students/my-children');
  644 |     const body = await safeJson(res);
  645 |     expect(res.status()).toBeLessThan(300);
  646 | 
  647 |     const children: any[] = body?.data ?? body?.children ?? (Array.isArray(body) ? body : []);
  648 |     console.log('  my-children count =', children.length);
  649 |     expect(children.length, 'Parent must have at least one child').toBeGreaterThan(0);
  650 |   });
  651 | 
  652 |   test('4.3 – Parent can view attendance for their child', async ({ request }) => {
  653 |     if (!parentToken) { test.skip(true, 'Parent token unavailable'); return; }
  654 |     const childrenRes  = await GET(request, parentToken, '/students/my-children');
  655 |     const childrenBody = await safeJson(childrenRes);
  656 |     const children: any[] = childrenBody?.data ?? childrenBody?.children ?? (Array.isArray(childrenBody) ? childrenBody : []);
  657 |     if (children.length === 0) { test.skip(true, 'No children linked'); return; }
  658 | 
  659 |     const childId = children[0]?.id ?? children[0]?.studentId;
  660 |     const res = await GET(request, parentToken, '/attendance/records', { studentId: childId, page: '1', pageSize: '10' });
  661 |     expect(res.status(), 'Parent attendance access should succeed').toBeLessThan(300);
  662 |     console.log('  Parent attendance access verified');
  663 |   });
  664 | 
  665 |   test('4.4 – Parent can view graded submissions for their child', async ({ request }) => {
  666 |     if (!parentToken) { test.skip(true, 'Parent token unavailable'); return; }
  667 |     const childrenRes  = await GET(request, parentToken, '/students/my-children');
  668 |     const childrenBody = await safeJson(childrenRes);
  669 |     const children: any[] = childrenBody?.data ?? childrenBody?.children ?? (Array.isArray(childrenBody) ? childrenBody : []);
  670 |     if (children.length === 0) { test.skip(true, 'No children linked'); return; }
  671 | 
  672 |     const childId = children[0]?.id ?? children[0]?.studentId;
  673 |     const res  = await GET(request, parentToken, '/assignments/student-submissions', { studentId: childId });
  674 |     expect(res.status(), 'Parent submissions access should succeed').toBeLessThan(300);
  675 |     const body: any = await safeJson(res);
  676 |     const subs: any[] = body?.data ?? body?.submissions ?? [];
  677 |     console.log('  Parent submission count =', subs.length);
  678 |   });
  679 | 
  680 |   // ── PHASE 5: PARENT UI ────────────────────────────────────────────────────
  681 |   async function injectParentSession(page: Page, token: string) {
  682 |     const sessionObj = JSON.stringify({ token, role: 'Parent', email: SEEDED_PARENT.email });
  683 |     await page.goto(UI_BASE);
  684 |     await page.evaluate((s) => {
  685 |       sessionStorage.setItem('auth_session', s);
  686 |       localStorage.setItem('pw_e2e_auth', s);
  687 |     }, sessionObj);
  688 |     await page.goto(`${UI_BASE}/parent-portal`);
  689 |     await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
  690 |   }
  691 | 
  692 |   test('5.1 – Parent dashboard loads without error', async ({ page }) => {
  693 |     if (!parentToken) { test.skip(true, 'Parent token unavailable'); return; }
  694 |     await injectParentSession(page, parentToken);
  695 |     expect(page.url()).not.toMatch(/login/);
  696 |     console.log('  Parent dashboard URL:', page.url());
  697 |   });
  698 | 
  699 |   test('5.2 – Attendance tab renders', async ({ page }) => {
  700 |     if (!parentToken) { test.skip(true, 'Parent token unavailable'); return; }
  701 |     await injectParentSession(page, parentToken);
  702 |     const attendanceTab = page.getByRole('tab', { name: /attendance/i });
  703 |     const isVisible = await attendanceTab.isVisible({ timeout: 8000 }).catch(() => false);
  704 |     if (isVisible) {
```