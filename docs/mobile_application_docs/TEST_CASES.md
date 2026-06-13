# Mobile App Test Cases — Vitana SMS

> **Version:** 1.0  
> **Last Updated:** June 2026  
> **App ID:** `com.vitana.sms`  
> **Demo School:** `demo.vitanasms.com`

---

## How to Run

| Layer | Command | Requirement |
|---|---|---|
| TypeScript check | `pnpm --filter @vitana/mobile typecheck` | Node.js 22, pnpm 9 |
| Lint | `pnpm --filter @vitana/mobile lint` | — |
| Unit tests | `pnpm --filter @vitana/mobile test` | — |
| Unit tests + coverage | `pnpm --filter @vitana/mobile test:coverage` | — |
| Full smoke (all above) | `bash mobile/scripts/smoke-test.sh` | — |
| Backend smoke | `bash mobile/scripts/backend-smoke.sh` | API reachable |
| E2E (Maestro) | `maestro test mobile/maestro/tests/<file>.yaml` | Device/simulator + API |
| All E2E flows | `maestro test mobile/maestro/tests/` | Device/simulator + API |

---

## Automation Status Legend

| Status | Meaning |
|---|---|
| ✅ AUTO | Fully automated — runs in CI |
| 🔵 E2E | Maestro YAML exists — requires device |
| ⬜ MANUAL | Manual test — device + demo school required |
| 🚧 PENDING | Test file exists but not wired to CI yet |

---

## TC-AUTH — Authentication & Authorization

### TC-AUTH-01: School domain entry and branding load

| Field | Value |
|---|---|
| **Type** | E2E |
| **Priority** | P0 |
| **Automation** | 🔵 E2E (`login_parent.yaml`) |

**Preconditions:** Fresh app install or cleared state. No stored tokens.

**Steps:**
1. Launch app with `clearState: true`
2. Observe the domain entry screen
3. Tap the school domain input field (placeholder: `yourschool.vitanasms.com`)
4. Type `demo.vitanasms.com`
5. Tap **Continue**
6. Observe the login screen

**Expected Result:** Login screen shows "Sign in to your account". The school branding (logo, primary colour) loads. Input placeholders render.

---

### TC-AUTH-02: Successful parent login

| Field | Value |
|---|---|
| **Type** | E2E |
| **Priority** | P0 |
| **Automation** | 🔵 E2E (`login_parent.yaml`) |

**Preconditions:** Domain `demo.vitanasms.com` entered and accepted.

**Steps:**
1. Tap the Username field
2. Enter `demo.parent@demo.vitanasms.com`
3. Tap the Password field
4. Enter `Demo@12345`
5. Tap **Sign In**
6. Wait up to 10 seconds for navigation

**Expected Result:** App navigates to the Parent Dashboard. "Parent Dashboard" heading visible. No error banner shown.

---

### TC-AUTH-03: Successful teacher login

| Field | Value |
|---|---|
| **Type** | E2E |
| **Priority** | P0 |
| **Automation** | 🔵 E2E (implicit in `teacher_send_message.yaml`) |

**Preconditions:** Domain entered.

**Steps:**
1. Enter `demo.teacher@demo.vitanasms.com` as username
2. Enter `Demo@12345` as password
3. Tap **Sign In**

**Expected Result:** App navigates to Teacher Dashboard. Bottom tab bar shows: Dashboard, Attendance, More.

---

### TC-AUTH-04: Successful student login

| Field | Value |
|---|---|
| **Type** | E2E |
| **Priority** | P0 |
| **Automation** | 🔵 E2E (`student_login.yaml`) |

**Preconditions:** Domain entered.

**Steps:**
1. Enter `demo.student@demo.vitanasms.com` as username
2. Enter `Demo@12345` as password
3. Tap **Sign In**

**Expected Result:** App navigates to Student Dashboard.

---

### TC-AUTH-05: Login with wrong password shows inline error

| Field | Value |
|---|---|
| **Type** | Manual |
| **Priority** | P0 |
| **Automation** | ⬜ MANUAL |

**Preconditions:** Domain entered.

**Steps:**
1. Enter a valid username
2. Enter an incorrect password (`WrongPass123`)
3. Tap **Sign In**

**Expected Result:** An inline error message "Incorrect username or password." appears below the form. No navigation occurs. Password field is not cleared (user can correct it).

---

### TC-AUTH-06: Account lockout after 5 failed attempts

| Field | Value |
|---|---|
| **Type** | Manual |
| **Priority** | P1 |
| **Automation** | ⬜ MANUAL |

**Preconditions:** Domain entered.

**Steps:**
1. Enter valid username, wrong password
2. Tap **Sign In** — receive error
3. Repeat 4 more times (5 total failed attempts)

**Expected Result:** After the 5th failure, a lockout message appears: account is locked for 15 minutes. Sign In button is disabled or login is rejected.

---

### TC-AUTH-07: Two-factor authentication (TOTP) — valid code

| Field | Value |
|---|---|
| **Type** | Manual |
| **Priority** | P1 |
| **Automation** | ⬜ MANUAL |

**Preconditions:** User account has 2FA enabled (configured in the backend for demo teacher).

**Steps:**
1. Log in with correct credentials
2. App displays the 2FA screen asking for a 6-digit TOTP
3. Enter the valid TOTP from an authenticator app
4. Tap **Verify**

**Expected Result:** App navigates to the role dashboard. Token is stored.

---

### TC-AUTH-08: Two-factor authentication — invalid code

| Field | Value |
|---|---|
| **Type** | Manual |
| **Priority** | P1 |
| **Automation** | ⬜ MANUAL |

**Preconditions:** 2FA screen visible.

**Steps:**
1. Enter an incorrect 6-digit code (e.g., `000000`)
2. Tap **Verify**

**Expected Result:** Error message appears. Code field is cleared. User can try again.

---

### TC-AUTH-09: Biometric unlock offer on first login

| Field | Value |
|---|---|
| **Type** | Manual |
| **Priority** | P1 |
| **Automation** | ⬜ MANUAL |

**Preconditions:** First login ever on this device. Biometric hardware available.

**Steps:**
1. Complete login with credentials successfully
2. Navigate to role dashboard

**Expected Result:** A modal or alert appears offering to enable biometric unlock ("Enable Face ID?" or "Enable Fingerprint?"). User can choose to enable or skip.

---

### TC-AUTH-10: Biometric unlock on subsequent launch

| Field | Value |
|---|---|
| **Type** | Manual |
| **Priority** | P1 |
| **Automation** | ⬜ MANUAL |

**Preconditions:** Biometric unlock was enabled on first login. Valid tokens still stored.

**Steps:**
1. Background the app and relaunch (or restart)
2. Biometric prompt appears automatically

**Expected Result:** Successful biometric scan navigates directly to the role dashboard without entering credentials.

---

### TC-AUTH-11: Logout clears tokens and navigates to login

| Field | Value |
|---|---|
| **Type** | Unit + E2E |
| **Priority** | P0 |
| **Automation** | ✅ AUTO (`useLogout.test.ts`) · 🔵 E2E (`logout.yaml`) |

**Preconditions:** User is logged in.

**Steps:**
1. Navigate to the profile or More menu
2. Tap **Logout**
3. Confirm if prompted

**Expected Result (unit):** Auth store cleared (`isAuthenticated=false`, `accessToken=null`, `user=null`). TanStack Query cache cleared. `router.replace('/(auth)/login')` called. `biometric_enabled`, `biometric_prompt_shown`, `school_domain` SecureStore keys deleted.

**Expected Result (E2E):** Login screen visible. No automatic navigation back to dashboard occurs.

---

### TC-AUTH-12: Access token refresh on 401

| Field | Value |
|---|---|
| **Type** | Unit |
| **Priority** | P0 |
| **Automation** | ✅ AUTO (`client.test.ts`) |

**Preconditions:** User is authenticated. Access token is expired (returns 401).

**Steps:**
1. Make any authenticated API call
2. Server returns 401
3. Client interceptor detects 401 and calls `POST /auth/refresh`
4. Refresh succeeds — new tokens received

**Expected Result (unit):** Original request is retried with the new access token. Auth store is updated with new tokens. If refresh also returns 401, `clearAuth()` is called and user is redirected to login.

---

## TC-PARENT — Parent Portal

### TC-PARENT-01: Parent Dashboard loads key data cards

| Field | Value |
|---|---|
| **Type** | E2E |
| **Priority** | P0 |
| **Automation** | 🔵 E2E (`login_parent.yaml`) |

**Preconditions:** Logged in as demo parent. Demo child "Aarav Sharma" is linked.

**Steps:**
1. Navigate to Parent Dashboard (home tab)
2. Observe the screen after data loads

**Expected Result:** Child card visible showing child name and class. Attendance status visible. Announcements section or shortcut visible. No error state showing.

---

### TC-PARENT-02: Attendance calendar — monthly heatmap

| Field | Value |
|---|---|
| **Type** | Manual |
| **Priority** | P0 |
| **Automation** | ⬜ MANUAL |

**Preconditions:** Logged in as parent. Child has attendance records for current month.

**Steps:**
1. Tap the child's attendance card or navigate to Attendance
2. Observe the monthly calendar

**Expected Result:** Calendar shows color-coded days (green = present, red = absent, grey = weekend/holiday). Summary statistics (present count, absent count, percentage) visible at the top.

---

### TC-PARENT-03: Fee summary screen displays outstanding balance

| Field | Value |
|---|---|
| **Type** | E2E |
| **Priority** | P0 |
| **Automation** | 🔵 E2E (`parent_fee_view.yaml`) |

**Preconditions:** Logged in as parent. Demo child has fee records with outstanding balance.

**Steps:**
1. Navigate to Fees tab or Fees screen
2. Observe the fee summary

**Expected Result:** Outstanding balance card visible with an amount. "Pay Online" button visible. Fee breakdown (tuition, transport, etc.) displayed as line items.

---

### TC-PARENT-04: Fee payment initiation (Cashfree sandbox)

| Field | Value |
|---|---|
| **Type** | Manual |
| **Priority** | P0 |
| **Automation** | ⬜ MANUAL |

**Preconditions:** Fees screen with outstanding balance visible.

**Steps:**
1. Tap **Pay Online**
2. Select a fee head to pay
3. Confirm the amount
4. Cashfree payment sheet opens in-app

**Expected Result:** Cashfree payment SDK opens. Sandbox test payment succeeds. App navigates to fee success screen. Receipt is available.

---

### TC-PARENT-05: Exam results view

| Field | Value |
|---|---|
| **Type** | E2E |
| **Priority** | P0 |
| **Automation** | 🔵 E2E (`parent_view_results.yaml`) |

**Preconditions:** Logged in as parent. Demo exam results published for child.

**Steps:**
1. Navigate to Results (via More menu or tab)
2. Select the first available exam
3. Observe subject-wise marks

**Expected Result:** Subject list with obtained/maximum marks visible. Grade badges (A, B, C, etc.) shown per subject. Total percentage or grade visible.

---

### TC-PARENT-06: Report card download

| Field | Value |
|---|---|
| **Type** | Manual |
| **Priority** | P1 |
| **Automation** | ⬜ MANUAL |

**Preconditions:** Report card published for demo child.

**Steps:**
1. Navigate to Results → select exam → tap **Report Card**
2. Report card PDF opens or download begins

**Expected Result:** Report card renders in a web view or PDF viewer within the app. Share/download options available.

---

### TC-PARENT-07: Messages — view conversation list

| Field | Value |
|---|---|
| **Type** | E2E |
| **Priority** | P0 |
| **Automation** | 🔵 E2E (`parent_send_message.yaml`) |

**Preconditions:** Logged in as parent.

**Steps:**
1. Navigate to Messages tab (in More menu or bottom tab)
2. Observe the conversation list

**Expected Result:** Conversation list loads. Each row shows teacher name, last message preview, time, and unread count badge (if any).

---

### TC-PARENT-08: Send message to teacher

| Field | Value |
|---|---|
| **Type** | E2E |
| **Priority** | P0 |
| **Automation** | 🔵 E2E (`parent_send_message.yaml`) |

**Preconditions:** Messages list visible.

**Steps:**
1. Tap the compose/new button
2. Select the class teacher from the recipient list
3. Type a message: "Hello, I wanted to discuss Aarav's attendance"
4. Tap **Send**

**Expected Result:** Message appears in the conversation immediately (optimistic UI). Message thread screen shows the sent message. Send status icon (check mark) visible.

---

### TC-PARENT-09: Leave application — apply for child

| Field | Value |
|---|---|
| **Type** | E2E |
| **Priority** | P0 |
| **Automation** | ⬜ MANUAL |

**Preconditions:** Logged in as parent.

**Steps:**
1. Navigate to Leaves section (More menu)
2. Tap **Apply Leave**
3. Select leave type (Medical)
4. Select start and end dates
5. Enter reason: "Child has fever"
6. Tap **Submit**

**Expected Result:** Leave application submitted successfully. Toast or confirmation message visible. Leave appears in the pending list with status "Pending".

---

### TC-PARENT-10: Class diary entry view

| Field | Value |
|---|---|
| **Type** | Manual |
| **Priority** | P1 |
| **Automation** | ⬜ MANUAL |

**Preconditions:** Teacher has posted diary entries for the child's class.

**Steps:**
1. Navigate to Diary (via More menu)
2. Observe entries list

**Expected Result:** Diary entries shown in reverse chronological order. Each entry shows date, title, and content. Tap expands the full content.

---

### TC-PARENT-11: School announcements list

| Field | Value |
|---|---|
| **Type** | Manual |
| **Priority** | P1 |
| **Automation** | ⬜ MANUAL |

**Preconditions:** Admin has published announcements.

**Steps:**
1. Navigate to Announcements
2. Observe the list

**Expected Result:** Announcements visible with title, date, and priority badge. Tap opens the full announcement detail.

---

### TC-PARENT-12: Push notification settings management

| Field | Value |
|---|---|
| **Type** | Manual |
| **Priority** | P1 |
| **Automation** | ⬜ MANUAL |

**Steps:**
1. Navigate to Notification Settings (More → Notifications)
2. Toggle off "Attendance alerts"
3. Back out and re-enter settings

**Expected Result:** Toggle state persists. Selected notification types are reflected in the backend.

---

### TC-PARENT-13: Offline — cached dashboard loads without network

| Field | Value |
|---|---|
| **Type** | Manual |
| **Priority** | P0 |
| **Automation** | ⬜ MANUAL |

**Preconditions:** Parent has previously visited the dashboard (data cached). Enable Airplane Mode.

**Steps:**
1. Enable Airplane Mode on device
2. Open the app
3. Navigate to the Parent Dashboard

**Expected Result:** Dashboard loads with last-cached data. An offline indicator or banner is shown. No crash occurs.

---

### TC-PARENT-14: Attendance absence notification deep link

| Field | Value |
|---|---|
| **Type** | Unit |
| **Priority** | P0 |
| **Automation** | ✅ AUTO (`handler.test.ts`) |

**Preconditions:** Notification with type `attendance_absent` received.

**Steps (unit test):**
1. Call `DEEP_LINKS['attendance_absent']({ studentId: 's1' })`

**Expected Result:** Returns the route string `/(parent)/attendance/s1`.

---

### TC-PARENT-15: Fee due notification deep link

| Field | Value |
|---|---|
| **Type** | Unit |
| **Priority** | P0 |
| **Automation** | ✅ AUTO (`handler.test.ts`) |

**Steps (unit test):**
1. Call `DEEP_LINKS['fee_due']({ studentId: 's1' })`

**Expected Result:** Returns the route string `/(parent)/fees`.

---

### TC-PARENT-16: Result published notification deep link

| Field | Value |
|---|---|
| **Type** | Unit |
| **Priority** | P0 |
| **Automation** | ✅ AUTO (`handler.test.ts`) |

**Steps (unit test):**
1. Call `DEEP_LINKS['result_published']({ studentId: 's1' })`

**Expected Result:** Returns the route string `/(parent)/results/s1`.

---

### TC-PARENT-17: New message notification deep link

| Field | Value |
|---|---|
| **Type** | Unit |
| **Priority** | P0 |
| **Automation** | ✅ AUTO (`handler.test.ts`) |

**Steps (unit test):**
1. Call `DEEP_LINKS['new_message_parent']({ conversationId: 'c1' })`

**Expected Result:** Returns the route string `/(parent)/messages/c1`.

---

### TC-PARENT-18: Dark mode — parent dashboard renders correctly

| Field | Value |
|---|---|
| **Type** | Manual |
| **Priority** | P2 |
| **Automation** | ⬜ MANUAL |

**Steps:**
1. Enable system dark mode
2. Open app and navigate to Parent Dashboard

**Expected Result:** All cards and text readable. No white text on white background. Fee balance card visible.

---

## TC-TEACHER — Teacher Portal

### TC-TEACHER-01: Teacher Dashboard loads class and schedule data

| Field | Value |
|---|---|
| **Type** | Manual |
| **Priority** | P0 |
| **Automation** | ⬜ MANUAL |

**Preconditions:** Logged in as demo teacher.

**Steps:**
1. Navigate to Teacher Dashboard (home tab)

**Expected Result:** Today's schedule visible. Pending leave requests count shown. Attendance status card for today's class. Offline sync status summary.

---

### TC-TEACHER-02: Attendance marking — online mode

| Field | Value |
|---|---|
| **Type** | Manual |
| **Priority** | P0 |
| **Automation** | ⬜ MANUAL |

**Preconditions:** Teacher logged in. Network connected. Current date is a school day.

**Steps:**
1. Navigate to Attendance tab
2. Select class (Class 8A)
3. Mark 2 students as absent, rest as present
4. Tap **Submit Attendance**

**Expected Result:** Success confirmation shown. Attendance records saved on server. Query cache invalidated (re-fetch shows updated data on return).

---

### TC-TEACHER-03: Attendance marking — offline mode (airplane mode)

| Field | Value |
|---|---|
| **Type** | Manual |
| **Priority** | P0 |
| **Automation** | ⬜ MANUAL |

**Preconditions:** Teacher logged in. Enable Airplane Mode.

**Steps:**
1. Navigate to Attendance tab
2. Select class
3. Mark attendance
4. Tap **Submit Attendance**

**Expected Result:** App shows "Saved offline — will sync when connected". Attendance draft stored in SQLite. Offline queue count increases by 1.

---

### TC-TEACHER-04: Offline attendance syncs on reconnect

| Field | Value |
|---|---|
| **Type** | Manual + Unit |
| **Priority** | P0 |
| **Automation** | ✅ AUTO (`offlineQueue.test.ts`) |

**Preconditions:** Offline attendance draft exists in queue.

**Steps:**
1. Disable Airplane Mode
2. Navigate to Sync Status (More → Sync Status)
3. Observe queue draining

**Expected Result:** Queue item transitions from Pending → Processing → Synced. Attendance appears on server. Sync Status screen shows 0 pending items.

---

### TC-TEACHER-05: Marks entry — save draft offline

| Field | Value |
|---|---|
| **Type** | Unit + E2E |
| **Priority** | P0 |
| **Automation** | ✅ AUTO (`marksDraftService.test.ts`) · 🔵 E2E (`teacher_marks_entry.yaml`) |

**Preconditions:** Teacher logged in. Exam has been set up with subjects assigned to teacher.

**Steps:**
1. Navigate to Marks tab
2. Select an exam from the list
3. Tap a subject
4. Enter theory marks for the first student: `78`
5. Enter marks for second student: `82`, mark 3rd student as absent
6. Tap **Save Draft**

**Expected Result:** Toast "Draft saved" visible. Data persisted in SQLite `marks_drafts` table. `idempotencyKey` generated and stored. On revisiting the screen, previously entered marks are pre-filled.

---

### TC-TEACHER-06: Marks draft preserves idempotency key on re-save

| Field | Value |
|---|---|
| **Type** | Unit |
| **Priority** | P0 |
| **Automation** | ✅ AUTO (`marksDraftService.test.ts`) |

**Steps (unit):**
1. Call `marksDraftService.saveDraft('exam1', 'class1', 'sub1', marks, 'teacher1', 'school1')`
2. Note the `idempotencyKey` stored
3. Call `saveDraft` again with updated marks

**Expected Result:** The `idempotencyKey` is identical on both saves. The `marks` and `lastModified` fields are updated. Only one row exists in the DB.

---

### TC-TEACHER-07: Marks entry — submit to server

| Field | Value |
|---|---|
| **Type** | Manual |
| **Priority** | P0 |
| **Automation** | ⬜ MANUAL |

**Preconditions:** Marks draft saved. Network connected.

**Steps:**
1. Open the marks entry screen with a saved draft
2. Review entries
3. Tap **Submit Marks**
4. Confirm the submission dialog

**Expected Result:** API call made with `idempotencyKey` header. Success confirmation shown. Draft marked as `isSubmitted=true` in SQLite. Subject card in exam list shows status "Done".

---

### TC-TEACHER-08: Assignment creation

| Field | Value |
|---|---|
| **Type** | E2E |
| **Priority** | P0 |
| **Automation** | 🔵 E2E (`teacher_create_assignment.yaml`) |

**Preconditions:** Teacher logged in.

**Steps:**
1. Navigate to Assignments tab (More → Assignments)
2. Tap the **+** / Create button
3. Fill in title: "Chapter 5 Exercise"
4. Fill in description: "Complete exercises 1-10 from Chapter 5"
5. Select class: Class 8A
6. Select due date: a date 1 week from today
7. Tap **Create Assignment**

**Expected Result:** Assignment appears in the Assignments list. Title "Chapter 5 Exercise" visible. Due date shown.

---

### TC-TEACHER-09: Assignment grading — student submission review

| Field | Value |
|---|---|
| **Type** | Manual |
| **Priority** | P0 |
| **Automation** | ⬜ MANUAL |

**Preconditions:** Students have submitted assignment.

**Steps:**
1. Navigate to Assignments
2. Tap an assignment with pending submissions
3. Tap **View Submissions**
4. Select a student submission
5. Enter a score: `9/10`
6. Add feedback: "Good work, but review question 3"
7. Tap **Submit Grade**

**Expected Result:** Grade saved. Submission status changes to "Graded". Student receives a notification (if configured).

---

### TC-TEACHER-10: Announcement creation and publish

| Field | Value |
|---|---|
| **Type** | E2E |
| **Priority** | P0 |
| **Automation** | 🔵 E2E (`teacher_create_announcement.yaml`) — already part of `teacher_send_message.yaml` |

**Preconditions:** Teacher logged in.

**Steps:**
1. Navigate to Announcements (More → Announcements)
2. Tap the create/compose button
3. Fill title: "Science Project Submission Deadline"
4. Fill body: "Please ensure your child submits the science project by Friday."
5. Select priority: Normal
6. Tap **Post Announcement**
7. Confirm in the success dialog

**Expected Result:** "Posted!" confirmation. Announcement appears in the list. Announcement is visible to parents/students in the relevant class.

---

### TC-TEACHER-11: Send message to parent

| Field | Value |
|---|---|
| **Type** | E2E |
| **Priority** | P0 |
| **Automation** | 🔵 E2E (`teacher_send_message.yaml`) |

**Preconditions:** Teacher logged in.

**Steps:**
1. Navigate to Messages (More → Messages)
2. Tap **New conversation** (compose button)
3. Select first available recipient (parent)
4. Type message: "Hello, I wanted to discuss Aarav's progress in class."
5. Tap **Send**

**Expected Result:** Message appears immediately (optimistic UI). Send status icon visible. Conversation thread shows the message.

---

### TC-TEACHER-12: Timetable — view weekly schedule

| Field | Value |
|---|---|
| **Type** | Manual |
| **Priority** | P1 |
| **Automation** | ⬜ MANUAL |

**Steps:**
1. Navigate to Timetable (tab or More menu)

**Expected Result:** Weekly schedule displayed. Current day highlighted. Each slot shows class name, subject, and room (if any).

---

### TC-TEACHER-13: Timetable available offline

| Field | Value |
|---|---|
| **Type** | Manual |
| **Priority** | P0 |
| **Automation** | ⬜ MANUAL |

**Preconditions:** Teacher has viewed timetable while online (cached in SQLite).

**Steps:**
1. Enable Airplane Mode
2. Navigate to Timetable

**Expected Result:** Timetable loads from cache. No network error. Staleness indicator shown if data is older than 24 hours.

---

### TC-TEACHER-14: Leave application — teacher applies for leave

| Field | Value |
|---|---|
| **Type** | Manual |
| **Priority** | P1 |
| **Automation** | ⬜ MANUAL |

**Steps:**
1. Navigate to Leaves (More → Leaves)
2. Tap **Apply Leave**
3. Select type: Sick Leave
4. Pick dates
5. Enter reason
6. Submit

**Expected Result:** Leave application created with "Pending" status. Admin/Principal receives a leave approval notification.

---

### TC-TEACHER-15: Sync Status screen — all synced state

| Field | Value |
|---|---|
| **Type** | Manual |
| **Priority** | P1 |
| **Automation** | ⬜ MANUAL |

**Preconditions:** No pending or failed items in offline queue.

**Steps:**
1. Navigate to More → Sync Status

**Expected Result:** Green checkmark icon. "All synced" empty state text. Pending count = 0, Failed count = 0. Morning bundle status card visible.

---

### TC-TEACHER-16: Sync Status screen — pending items visible

| Field | Value |
|---|---|
| **Type** | Manual |
| **Priority** | P1 |
| **Automation** | ⬜ MANUAL |

**Preconditions:** 1 or more items in offline queue with status `pending`.

**Steps:**
1. Navigate to Sync Status screen

**Expected Result:** Pending section shows item list. Each item has operation type label (e.g. "Attendance") and relative time ("2m ago"). Pending count card shows correct number.

---

### TC-TEACHER-17: Sync Status screen — retry failed items

| Field | Value |
|---|---|
| **Type** | Manual |
| **Priority** | P1 |
| **Automation** | ⬜ MANUAL |

**Preconditions:** 1 or more items with status `failed` in queue.

**Steps:**
1. Navigate to Sync Status
2. Observe Failed section
3. Tap **Retry All**

**Expected Result:** Failed items reset to `pending` status. `OfflineQueueProcessor.processQueue()` called. Items re-attempt API calls. On success they move to Synced.

---

### TC-TEACHER-18: Feature locked module shows locked card

| Field | Value |
|---|---|
| **Type** | Manual |
| **Priority** | P2 |
| **Automation** | ⬜ MANUAL |

**Preconditions:** A module (e.g., Library) is disabled in school feature flags.

**Steps:**
1. Navigate to More tab
2. Locate the disabled module

**Expected Result:** Module card shows a lock icon and "Not available in your plan" or similar message. Tapping does not navigate. No crash.

---

### TC-TEACHER-19: Performance — marks entry screen loads within 2 seconds

| Field | Value |
|---|---|
| **Type** | Performance |
| **Priority** | P1 |
| **Automation** | ✅ AUTO (`performance.test.ts` — unit) · ⬜ MANUAL (device measurement) |

**Preconditions:** Teacher logged in. Network connected. Exam has 30 students assigned.

**Steps:**
1. Tap subject card on exam subject selection screen
2. Measure time from tap to marks entry screen fully rendered

**Expected Result:** Screen renders in < 2000 ms. Sentry span `screen_load_marks_entry` < 2000 ms. If exceeded, a Sentry warning is captured.

---

### TC-TEACHER-20: Conflict resolution — 409 response handled

| Field | Value |
|---|---|
| **Type** | Unit |
| **Priority** | P0 |
| **Automation** | ✅ AUTO (`offlineQueue.test.ts`) |

**Steps (unit):**
1. Enqueue a POST to `/attendance`
2. Mock the API to return a 409 response
3. Run `OfflineQueueProcessor.processQueue()`

**Expected Result:** Item status set to `failed`. `errorMessage` is `{"type":"conflict","serverData":{...}}`. `getConflictItems()` returns this item. `resolveConflict('id', 'keep_server')` sets status to `synced`.

---

## TC-STUDENT — Student Portal

### TC-STUDENT-01: Student Dashboard loads

| Field | Value |
|---|---|
| **Type** | E2E |
| **Priority** | P0 |
| **Automation** | 🔵 E2E (`student_login.yaml`) |

**Preconditions:** Logged in as demo student.

**Steps:**
1. Log in as student and observe the dashboard

**Expected Result:** Student Dashboard visible. Quick access cards for Timetable, Attendance, Assignments, Results shown.

---

### TC-STUDENT-02: Timetable — view today's schedule

| Field | Value |
|---|---|
| **Type** | E2E |
| **Priority** | P0 |
| **Automation** | 🔵 E2E (`student_timetable.yaml`) |

**Steps:**
1. Navigate to Timetable tab
2. Observe today's schedule

**Expected Result:** Today's classes listed in order with subject, teacher name, and time slot.

---

### TC-STUDENT-03: Attendance — monthly view

| Field | Value |
|---|---|
| **Type** | E2E |
| **Priority** | P0 |
| **Automation** | 🔵 E2E (`student_attendance.yaml`) |

**Steps:**
1. Navigate to Attendance tab

**Expected Result:** Attendance percentage shown. Calendar with color-coded days. Present/absent/late counts in summary.

---

### TC-STUDENT-04: Assignments — view list and details

| Field | Value |
|---|---|
| **Type** | E2E |
| **Priority** | P0 |
| **Automation** | 🔵 E2E (`student_assignments.yaml`) |

**Steps:**
1. Navigate to Assignments tab
2. Tap an assignment from the list

**Expected Result:** Assignment list shows title, due date, and status (Pending/Submitted/Graded). Detail screen shows full description and submission box.

---

### TC-STUDENT-05: Assignment submission — text response

| Field | Value |
|---|---|
| **Type** | Manual |
| **Priority** | P0 |
| **Automation** | ⬜ MANUAL |

**Preconditions:** Student has a pending assignment.

**Steps:**
1. Open the assignment detail screen
2. Tap **Submit Assignment**
3. Type a text response in the submission box
4. Tap **Submit**

**Expected Result:** Submission confirmed. Assignment status changes to "Submitted". Submission visible in teacher's submissions list.

---

### TC-STUDENT-06: Exam results — view marks and grade

| Field | Value |
|---|---|
| **Type** | Manual |
| **Priority** | P0 |
| **Automation** | ⬜ MANUAL |

**Preconditions:** Exam results published.

**Steps:**
1. Navigate to Results tab
2. Select the exam
3. View subject-wise marks

**Expected Result:** All subjects listed with obtained marks, maximum marks, and grade. Total percentage shown at bottom.

---

### TC-STUDENT-07: Report card view and download

| Field | Value |
|---|---|
| **Type** | Manual |
| **Priority** | P1 |
| **Automation** | ⬜ MANUAL |

**Steps:**
1. Navigate to Results → Report Card

**Expected Result:** Report card PDF or web view loads. Download/Share button functional.

---

### TC-STUDENT-08: Fee details view

| Field | Value |
|---|---|
| **Type** | Manual |
| **Priority** | P0 |
| **Automation** | ⬜ MANUAL |

**Steps:**
1. Navigate to Fees tab
2. Observe fee ledger

**Expected Result:** List of fee heads (tuition, transport) with paid and outstanding amounts. Payment history visible.

---

### TC-STUDENT-09: Leave application — student applies

| Field | Value |
|---|---|
| **Type** | E2E |
| **Priority** | P0 |
| **Automation** | 🔵 E2E (`student_leave_apply.yaml`) |

**Steps:**
1. Navigate to Leaves
2. Apply leave with dates and reason

**Expected Result:** Leave submitted with "Pending" status. Teacher receives notification.

---

### TC-STUDENT-10: Library — browse catalogue

| Field | Value |
|---|---|
| **Type** | Manual |
| **Priority** | P2 |
| **Automation** | ⬜ MANUAL |

**Preconditions:** Library module enabled.

**Steps:**
1. Navigate to Library (More or tab)
2. Browse catalogue

**Expected Result:** Book list visible. Search works. Issue/Return dates shown for borrowed books.

---

### TC-STUDENT-11: Announcements — view all

| Field | Value |
|---|---|
| **Type** | Manual |
| **Priority** | P1 |
| **Automation** | ⬜ MANUAL |

**Steps:**
1. Navigate to Announcements

**Expected Result:** School and class announcements listed. Priority badges (Urgent in red, Normal in grey) visible.

---

### TC-STUDENT-12: Notifications — push tap navigates to correct screen

| Field | Value |
|---|---|
| **Type** | Manual |
| **Priority** | P0 |
| **Automation** | ⬜ MANUAL |

**Preconditions:** Push notification enabled. Receive `assignment_graded` notification.

**Steps:**
1. With app backgrounded, receive a push notification
2. Tap the notification

**Expected Result:** App opens and navigates directly to the assignment detail screen (not just the dashboard).

---

### TC-STUDENT-13: Offline — timetable from cache

| Field | Value |
|---|---|
| **Type** | Manual |
| **Priority** | P0 |
| **Automation** | ⬜ MANUAL |

**Preconditions:** Timetable cached. Airplane Mode enabled.

**Steps:**
1. Enable Airplane Mode
2. Open timetable

**Expected Result:** Timetable loads from SQLite cache. No network error.

---

### TC-STUDENT-14: Dark mode — student results readable

| Field | Value |
|---|---|
| **Type** | Manual |
| **Priority** | P2 |
| **Automation** | ⬜ MANUAL |

**Steps:**
1. Enable system dark mode
2. Open exam results screen

**Expected Result:** All marks and grade text readable. Grade badges have sufficient contrast.

---

## TC-ADMIN — Administrator Portal

### TC-ADMIN-01: Admin Dashboard — KPI cards load

| Field | Value |
|---|---|
| **Type** | E2E |
| **Priority** | P0 |
| **Automation** | 🔵 E2E (`admin_dashboard.yaml`) |

**Preconditions:** Logged in as demo admin.

**Steps:**
1. Log in as admin
2. Navigate to Dashboard

**Expected Result:** KPI cards visible: Total students, Today's attendance %, Pending leaves, Fee collection this month. No error states.

---

### TC-ADMIN-02: Admin announcement — broadcast to all roles

| Field | Value |
|---|---|
| **Type** | E2E |
| **Priority** | P0 |
| **Automation** | 🔵 E2E (`admin_dashboard.yaml`) |

**Steps:**
1. Navigate to Announcements
2. Create new announcement: title "School Holiday", body "School will be closed on June 20th.", priority "High"
3. Select recipients: All (no class filter)
4. Tap **Post Announcement**

**Expected Result:** Announcement appears in admin list. Parents and teachers receive push notification (if configured).

---

### TC-ADMIN-03: Staff leave approvals

| Field | Value |
|---|---|
| **Type** | Manual |
| **Priority** | P0 |
| **Automation** | ⬜ MANUAL |

**Preconditions:** Teacher has submitted a leave request.

**Steps:**
1. Navigate to Approvals section
2. Find the pending leave request
3. Tap **Approve**
4. Confirm

**Expected Result:** Leave status changes to "Approved". Teacher receives approval notification.

---

### TC-ADMIN-04: Staff leave rejection

| Field | Value |
|---|---|
| **Type** | Manual |
| **Priority** | P1 |
| **Automation** | ⬜ MANUAL |

**Steps:**
1. Navigate to Approvals, find a pending leave
2. Tap **Reject**
3. Enter rejection reason

**Expected Result:** Leave status changes to "Rejected". Teacher notified.

---

### TC-ADMIN-05: Reports — attendance report

| Field | Value |
|---|---|
| **Type** | Manual |
| **Priority** | P1 |
| **Automation** | ⬜ MANUAL |

**Steps:**
1. Navigate to Reports
2. Select Attendance Report
3. Select a date range

**Expected Result:** Attendance report generated. Class-wise summary visible. Export option available.

---

### TC-ADMIN-06: Notification settings — admin manages device tokens

| Field | Value |
|---|---|
| **Type** | Manual |
| **Priority** | P2 |
| **Automation** | ⬜ MANUAL |

**Steps:**
1. Navigate to Notification Settings

**Expected Result:** Notification preferences list. Toggles functional. Changes persist.

---

### TC-ADMIN-07: Force update screen — outdated app version

| Field | Value |
|---|---|
| **Type** | Manual |
| **Priority** | P0 |
| **Automation** | ⬜ MANUAL |

**Preconditions:** Backend returns `forceUpdate: true` in app config for the current app version.

**Steps:**
1. Open app with outdated version (simulated via app-config response mock)

**Expected Result:** Force update screen visible. "Update Now" button opens store listing. All other navigation blocked.

---

### TC-ADMIN-08: Maintenance mode screen

| Field | Value |
|---|---|
| **Type** | Manual |
| **Priority** | P1 |
| **Automation** | ⬜ MANUAL |

**Preconditions:** Backend returns `maintenance: true` in app config.

**Steps:**
1. Open app

**Expected Result:** Maintenance screen with message and retry button. No stack traces exposed. Retry re-checks app config.

---

## TC-OFFLINE — Offline & Sync

### TC-OFFLINE-01: Offline queue — successful sync removes item

| Field | Value |
|---|---|
| **Type** | Unit |
| **Priority** | P0 |
| **Automation** | ✅ AUTO (`offlineQueue.test.ts`) |

**Steps (unit):**
1. Enqueue an item
2. Mock `apiClient.request` to resolve successfully
3. Call `OfflineQueueProcessor.processQueue('user1', 'school1')`

**Expected Result:** Item status set to `synced`. `syncedAt` timestamp populated. `queryClient.invalidateQueries` called with the item's `operationType`.

---

### TC-OFFLINE-02: Offline queue — failed sync increments retryCount

| Field | Value |
|---|---|
| **Type** | Unit |
| **Priority** | P0 |
| **Automation** | ✅ AUTO (`offlineQueue.test.ts`) |

**Steps (unit):**
1. Enqueue an item with `maxRetries=3`, `retryCount=0`
2. Mock `apiClient.request` to throw a network error (non-409, non-auth)
3. Call `processQueue()`

**Expected Result:** Item status returns to `pending`. `retryCount` incremented to 1. Item is retried on next `processQueue` call.

---

### TC-OFFLINE-03: Offline queue — max retries exceeded dead-letters item

| Field | Value |
|---|---|
| **Type** | Unit |
| **Priority** | P0 |
| **Automation** | ✅ AUTO (`offlineQueue.test.ts`) |

**Steps (unit):**
1. Enqueue an item with `retryCount=2`, `maxRetries=3`
2. Mock `apiClient.request` to throw
3. Call `processQueue()`

**Expected Result:** `retryCount` becomes 3 (= `maxRetries`). Status set to `failed`. `errorMessage` contains the error message string.

---

### TC-OFFLINE-04: Offline queue — 409 conflict sets conflict error

| Field | Value |
|---|---|
| **Type** | Unit |
| **Priority** | P0 |
| **Automation** | ✅ AUTO (`offlineQueue.test.ts`) |

**Steps (unit):**
1. Enqueue item
2. Mock API to throw with `{ status: 409, response: { data: { serverRecord: {...} } } }`
3. Run `processQueue()`

**Expected Result:** Status set to `failed`. `errorMessage` = `{"type":"conflict","serverData":{...}}`. `getConflictItems()` returns this item.

---

### TC-OFFLINE-05: Conflict resolution — keep server data

| Field | Value |
|---|---|
| **Type** | Unit |
| **Priority** | P0 |
| **Automation** | ✅ AUTO (`offlineQueue.test.ts`) |

**Steps (unit):**
1. Item exists with status `failed`, conflict error
2. Call `resolveConflict(itemId, 'keep_server')`

**Expected Result:** Item status set to `synced`. `syncedAt` timestamp set. Item no longer appears in `getConflictItems()`.

---

### TC-OFFLINE-06: Conflict resolution — use local data (re-enqueue)

| Field | Value |
|---|---|
| **Type** | Unit |
| **Priority** | P0 |
| **Automation** | ✅ AUTO (`offlineQueue.test.ts`) |

**Steps (unit):**
1. Item in conflict state
2. Call `resolveConflict(itemId, 'use_mine', overrideBody)`

**Expected Result:** Item status set to `pending`. `retryCount=0`. `errorMessage=null`. `body` updated with `overrideBody` if provided. Item will be retried on next `processQueue` call.

---

### TC-OFFLINE-07: Marks draft — saveDraft creates new row

| Field | Value |
|---|---|
| **Type** | Unit |
| **Priority** | P0 |
| **Automation** | ✅ AUTO (`marksDraftService.test.ts`) |

**Steps (unit):**
1. Call `marksDraftService.saveDraft('exam1', 'class1', 'sub1', marks, 'teacher1', 'school1')`
2. Call `loadDraft('exam1', 'class1', 'sub1')`

**Expected Result:** Draft returned with correct `marks` array. `isSubmitted=false`. `idempotencyKey` is a non-empty UUID.

---

### TC-OFFLINE-08: Marks draft — isSubmitted=true returns null from loadDraft

| Field | Value |
|---|---|
| **Type** | Unit |
| **Priority** | P0 |
| **Automation** | ✅ AUTO (`marksDraftService.test.ts`) |

**Steps (unit):**
1. Save draft
2. Call `markSubmitted('exam1', 'class1', 'sub1')`
3. Call `loadDraft('exam1', 'class1', 'sub1')`

**Expected Result:** `loadDraft` returns `null` (submitted drafts are not loaded back into the UI).

---

### TC-OFFLINE-09: Morning bundle loader — returns fresh if within 24 hours

| Field | Value |
|---|---|
| **Type** | Unit |
| **Priority** | P1 |
| **Automation** | 🚧 PENDING |

**Steps (unit):**
1. Insert a row into `offline_bundle_cache` with `expiresAt = Date.now() + 3600000`
2. Call `isBundleFresh()`

**Expected Result:** Returns `true`.

---

### TC-OFFLINE-10: Airplane mode — app does not crash on any screen

| Field | Value |
|---|---|
| **Type** | Manual |
| **Priority** | P0 |
| **Automation** | ⬜ MANUAL |

**Preconditions:** User has visited all main screens while online. Enable Airplane Mode.

**Steps:**
1. Enable Airplane Mode
2. Navigate through each tab: Dashboard, Attendance, Timetable, More
3. Tap each More menu item

**Expected Result:** No crashes. Screens show cached data or "offline" placeholder. Error boundaries catch any uncaught exceptions and display "failed to load" UI.

---

## TC-NOTIF — Push Notifications & Deep Links

### TC-NOTIF-01: All 21 notification deep link routes defined

| Field | Value |
|---|---|
| **Type** | Unit |
| **Priority** | P0 |
| **Automation** | ✅ AUTO (`handler.test.ts`) |

**Steps (unit):**
1. Import `DEEP_LINKS` from `notifications/deepLinks`
2. Assert all 21 required keys exist and are functions

**Expected Result:** All 21 notification types have entries. No key is undefined or missing.

---

### TC-NOTIF-02: Parent notification deep links (11 types)

| Field | Value |
|---|---|
| **Type** | Unit |
| **Priority** | P0 |
| **Automation** | ✅ AUTO (`handler.test.ts`) |

**Covered types:** `fee_due`, `fee_overdue`, `fee_payment_confirmed`, `attendance_absent`, `attendance_shortage`, `result_published`, `report_card_ready`, `new_announcement`, `new_diary_entry`, `leave_approved`, `leave_rejected`, `new_message_parent`

**Expected Result:** Each function returns a non-empty route string matching the parent portal (`/(parent)/...`).

---

### TC-NOTIF-03: Teacher notification deep links

| Field | Value |
|---|---|
| **Type** | Unit |
| **Priority** | P0 |
| **Automation** | ✅ AUTO (`handler.test.ts`) |

**Covered types:** `leave_request_received`, `new_message_teacher`, `timetable_change`, `submission_received`

**Expected Result:** Each returns a `/(teacher)/...` route.

---

### TC-NOTIF-04: Student notification deep links

| Field | Value |
|---|---|
| **Type** | Unit |
| **Priority** | P0 |
| **Automation** | ✅ AUTO (`handler.test.ts`) |

**Covered types:** `assignment_graded`, `assignment_created`

**Expected Result:** Each returns a `/(student)/...` route.

---

### TC-NOTIF-05: Admin notification deep links

| Field | Value |
|---|---|
| **Type** | Unit |
| **Priority** | P0 |
| **Automation** | ✅ AUTO (`handler.test.ts`) |

**Covered types:** `billing_expiry_warning`, `billing_expired`

**Expected Result:** Each returns a `/(admin)/...` route.

---

### TC-NOTIF-06: Silent sync notification returns empty string

| Field | Value |
|---|---|
| **Type** | Unit |
| **Priority** | P1 |
| **Automation** | ✅ AUTO (`handler.test.ts`) |

**Steps (unit):**
1. Call `DEEP_LINKS['silent_sync']({})`

**Expected Result:** Returns `''` (no navigation). Background sync triggered but no screen transition.

---

## TC-PERF — Performance

### TC-PERF-01: App cold start — first paint within 3 seconds

| Field | Value |
|---|---|
| **Type** | Performance |
| **Priority** | P0 |
| **Automation** | ⬜ MANUAL |

**Steps:**
1. Force-quit the app
2. Tap the app icon
3. Measure time until the domain entry or dashboard screen is fully interactive

**Expected Result:** Time to interactive < 3000 ms on a mid-range Android device (e.g., Pixel 4a).

---

### TC-PERF-02: Login screen cold render within 1 second

| Field | Value |
|---|---|
| **Type** | Performance |
| **Priority** | P0 |
| **Automation** | ⬜ MANUAL |

**Steps:**
1. Measure time from "Continue" tap to login screen fully rendered

**Expected Result:** Login form visible in < 1000 ms.

---

### TC-PERF-03: Screen load — Sentry span threshold = 2000 ms

| Field | Value |
|---|---|
| **Type** | Unit |
| **Priority** | P0 |
| **Automation** | ✅ AUTO (`performance.test.ts`) |

**Steps (unit):**
1. Import `SLOW_SCREEN_THRESHOLD_MS` from `lib/performance`
2. Call `measureScreenLoad('test_screen').complete()` immediately

**Expected Result:** `SLOW_SCREEN_THRESHOLD_MS === 2000`. No Sentry `captureMessage` called for a fast screen. For a simulated 3000 ms screen, `captureMessage` called with "Slow screen load" warning.

---

### TC-PERF-04: Parent Dashboard API response < 500 ms

| Field | Value |
|---|---|
| **Type** | Backend Performance |
| **Priority** | P0 |
| **Automation** | 🚧 PENDING (backend smoke) |

**Steps:**
1. Make `GET /api/mobile/dashboard` with parent auth token
2. Measure response time

**Expected Result:** Response time < 500 ms (cached by Redis).

---

### TC-PERF-05: App config API response < 200 ms (cached)

| Field | Value |
|---|---|
| **Type** | Backend Performance |
| **Priority** | P0 |
| **Automation** | 🚧 PENDING (backend smoke) |

**Steps:**
1. Make `GET /api/mobile/app-config` (second call — first warms Redis)
2. Measure response time

**Expected Result:** Response time < 200 ms on second call.

---

### TC-PERF-06: Offline queue flush — 20 items sync within 30 seconds

| Field | Value |
|---|---|
| **Type** | Performance |
| **Priority** | P1 |
| **Automation** | ⬜ MANUAL |

**Preconditions:** 20 attendance entries queued offline.

**Steps:**
1. Reconnect to network
2. Measure time from reconnect to all 20 items status = `synced`

**Expected Result:** All 20 items synced within 30 seconds.

---

### TC-PERF-07: FlashList renders 30-student attendance list without jank

| Field | Value |
|---|---|
| **Type** | Performance |
| **Priority** | P1 |
| **Automation** | ⬜ MANUAL |

**Steps:**
1. Open attendance marking for Class 8A (30 students)
2. Scroll quickly through the list multiple times

**Expected Result:** No visible frame drops. Scroll is smooth. No white flash between cells.

---

### TC-PERF-08: PII not present in Sentry breadcrumbs

| Field | Value |
|---|---|
| **Type** | Security/Analytics |
| **Priority** | P0 |
| **Automation** | ✅ AUTO (`analytics.test.ts`) |

**Steps (unit):**
1. Call `sanitize({ name: 'Aarav', email: 'a@b.com', role: 'Parent' })`

**Expected Result:** `name` and `email` keys stripped from output. `role` preserved. `sanitize` is used as the gateway before every `amplitude.track` call.

---

## TC-SMOKE — Smoke Tests

### TC-SMOKE-01: TypeScript compiles with zero errors

| Field | Value |
|---|---|
| **Type** | Smoke |
| **Priority** | P0 |
| **Automation** | ✅ AUTO (CI — `mobile-checks.yml`) |

**Command:** `pnpm --filter @vitana/mobile typecheck`

**Expected Result:** Exit code 0. No TypeScript errors reported. `tsc --noEmit` completes successfully across all 82 screens and all `src/` modules.

---

### TC-SMOKE-02: ESLint reports zero warnings

| Field | Value |
|---|---|
| **Type** | Smoke |
| **Priority** | P0 |
| **Automation** | ✅ AUTO (CI — `mobile-checks.yml`) |

**Command:** `pnpm --filter @vitana/mobile lint` (uses `--max-warnings 0`)

**Expected Result:** Exit code 0. Zero warnings. Zero errors.

---

### TC-SMOKE-03: All unit tests pass

| Field | Value |
|---|---|
| **Type** | Smoke |
| **Priority** | P0 |
| **Automation** | ✅ AUTO (CI — `mobile-checks.yml`) |

**Command:** `pnpm --filter @vitana/mobile test --ci --coverage`

**Expected Result:** All test suites pass. Overall line coverage ≥ 60%. Function coverage ≥ 60%. Branch coverage ≥ 50%.

---

### TC-SMOKE-04: Backend API health check passes

| Field | Value |
|---|---|
| **Type** | Smoke |
| **Priority** | P0 |
| **Automation** | 🚧 PENDING (`backend-smoke.sh`) |

**Command:** `bash mobile/scripts/backend-smoke.sh`

**Expected Result:**
- `POST /api/auth/login` with demo.parent creds → HTTP 200, response body contains `token`
- `GET /api/mobile/app-config` with token → HTTP 200
- `GET /api/mobile/dashboard` with token → HTTP 200
- `GET /api/mobile/notifications` with token → HTTP 200
- `POST /api/auth/logout` with refreshToken → HTTP 204

---

### TC-SMOKE-05: E2E login flow — parent login succeeds

| Field | Value |
|---|---|
| **Type** | E2E Smoke |
| **Priority** | P0 |
| **Automation** | 🔵 E2E (`login_parent.yaml`) |

**Expected Result:** App launches, domain entered, login succeeds, Parent Dashboard visible. Total run time < 60 seconds.

---

## TC-REGRESSION — Regression & Release Gate

### TC-REGRESSION-01: Coverage thresholds not regressed

| Field | Value |
|---|---|
| **Type** | Regression |
| **Priority** | P0 |
| **Automation** | ✅ AUTO (CI) |

**Expected Result:** `jest --coverage` does not fail the threshold check. Global line coverage ≥ 60%, branches ≥ 50%, functions ≥ 60%, statements ≥ 60%.

---

### TC-REGRESSION-02: No new Sentry errors after deployment

| Field | Value |
|---|---|
| **Type** | Regression |
| **Priority** | P0 |
| **Automation** | ⬜ MANUAL (Sentry dashboard) |

**Steps:**
1. Deploy build to staging
2. Run full E2E suite against staging
3. Check Sentry for new unhandled errors

**Expected Result:** Zero new unhandled exceptions. Any existing (pre-deploy) issues are tracked but not new.

---

### TC-REGRESSION-03: Android Vitals — crash rate < 1%

| Field | Value |
|---|---|
| **Type** | Regression |
| **Priority** | P0 |
| **Automation** | ⬜ MANUAL (Play Console Vitals) |

**Halt Criterion:** If crash rate exceeds 1% during a staged rollout, halt the rollout immediately.

**Expected Result:** Crash rate < 1% of sessions across all Android versions.

---

### TC-REGRESSION-04: ANR rate < 0.5%

| Field | Value |
|---|---|
| **Type** | Regression |
| **Priority** | P0 |
| **Automation** | ⬜ MANUAL (Play Console) |

**Expected Result:** ANR rate < 0.5% for any given Android version.

---

### TC-REGRESSION-05: OTA update applied within 24 hours

| Field | Value |
|---|---|
| **Type** | Regression |
| **Priority** | P1 |
| **Automation** | ⬜ MANUAL |

**Steps:**
1. Deploy OTA update to staging channel
2. Launch app on staging device
3. Observe EAS Updates adoption

**Expected Result:** App picks up the OTA update on next launch (or background refresh). No user action required. Version string in About screen reflects new update.

---

### TC-REGRESSION-06: White-label build — domain screen skipped

| Field | Value |
|---|---|
| **Type** | Regression |
| **Priority** | P1 |
| **Automation** | ⬜ MANUAL |

**Steps:**
1. Build with `SCHOOL_ID=dps-rohini` white-label profile
2. Install and launch the app

**Expected Result:** Domain entry screen is skipped. App goes directly to the login screen with the school's branding pre-loaded.

---

## TC-STORE — Store Asset Validation

### TC-STORE-01: Store asset files exist

| Field | Value |
|---|---|
| **Type** | Smoke |
| **Priority** | P0 |
| **Automation** | ✅ AUTO (CI — verify with `ls`) |

**Expected Result:** These files must exist in the repo:
- `mobile/store-assets/descriptions/play-store.md`
- `mobile/store-assets/descriptions/app-store.md`
- `mobile/store-assets/data-safety.md`
- `mobile/store-assets/CHECKLIST.md`
- `mobile/store-assets/MAINTENANCE_SCHEDULE.md`
- `mobile/RELEASE_RUNBOOK.md`

---

### TC-STORE-02: Privacy policy URL returns HTTP 200

| Field | Value |
|---|---|
| **Type** | Smoke |
| **Priority** | P0 |
| **Automation** | 🚧 PENDING |

**Command:** `curl -I https://vitanasms.com/privacy`

**Expected Result:** HTTP 200 response.

---

### TC-STORE-03: Demo credentials valid for all 4 roles

| Field | Value |
|---|---|
| **Type** | Pre-release check |
| **Priority** | P0 |
| **Automation** | 🚧 PENDING (`backend-smoke.sh`) |

**Steps:**
1. Login as `demo.parent@demo.vitanasms.com` → HTTP 200
2. Login as `demo.teacher@demo.vitanasms.com` → HTTP 200
3. Login as `demo.student@demo.vitanasms.com` → HTTP 200
4. Login as `demo.admin@demo.vitanasms.com` → HTTP 200

**Expected Result:** All 4 accounts return valid JWT tokens. Demo school never expires.

---

### TC-STORE-04: EAS credentials validity

| Field | Value |
|---|---|
| **Type** | Pre-release check |
| **Priority** | P0 |
| **Automation** | ⬜ MANUAL |

**Command:**
```bash
eas credentials --platform android
eas credentials --platform ios
```

**Expected Result:** Both platforms show valid credentials. iOS distribution certificate has > 6 months remaining.

---

### TC-STORE-05: APK installs on Android API 28 device

| Field | Value |
|---|---|
| **Type** | Compatibility |
| **Priority** | P0 |
| **Automation** | ⬜ MANUAL |

**Steps:**
1. Build a preview APK via `eas build --profile preview --platform android`
2. Install on an Android 9.0 (API 28) physical device

**Expected Result:** App installs and launches without crash.

---

### TC-STORE-06: IPA installs on iOS 16 device

| Field | Value |
|---|---|
| **Type** | Compatibility |
| **Priority** | P0 |
| **Automation** | ⬜ MANUAL |

**Steps:**
1. Build a preview IPA via `eas build --profile preview --platform ios`
2. Install on an iOS 16.0 device via TestFlight

**Expected Result:** App installs and launches. All core screens render.

---

## Summary

| Category | Total Tests | AUTO/E2E | Manual | Pending |
|---|---|---|---|---|
| TC-AUTH | 12 | 5 | 6 | 1 |
| TC-PARENT | 18 | 7 | 9 | 2 |
| TC-TEACHER | 20 | 7 | 10 | 3 |
| TC-STUDENT | 14 | 6 | 7 | 1 |
| TC-ADMIN | 8 | 2 | 6 | 0 |
| TC-OFFLINE | 10 | 8 | 1 | 1 |
| TC-NOTIF | 6 | 6 | 0 | 0 |
| TC-PERF | 8 | 3 | 3 | 2 |
| TC-SMOKE | 5 | 3 | 1 | 1 |
| TC-REGRESSION | 6 | 1 | 5 | 0 |
| TC-STORE | 6 | 1 | 3 | 2 |
| **TOTAL** | **113** | **49** | **51** | **13** |
