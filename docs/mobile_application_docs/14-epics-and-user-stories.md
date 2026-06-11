# Vitana Mobile Platform — Epics & User Stories

> **Classification:** Internal Architecture Document  
> **Version:** 1.0  
> **Date:** June 2026  
> **Related Docs:** [13-feature-inventory](./13-feature-inventory.md) · [15-roadmap-and-sprint-plan](./15-roadmap-and-sprint-plan.md) · [epics/](./epics/)

---

## Epic Summary

| ID | Epic | Priority | Sprints | Phase |
|---|---|---|---|---|
| EP-01 | Authentication & Authorization | P0 | 2 | 1 |
| EP-02 | Mobile Foundation & Architecture | P0 | 2 | 1 |
| EP-03 | Parent App — Core | P0 | 5 | 1–2 |
| EP-04 | Teacher App — Attendance & Timetable | P0 | 3 | 2 |
| EP-05 | Student App — Core | P0 | 3 | 2 |
| EP-06 | Push Notifications | P0 | 2 | 2 |
| EP-07 | Fee Module (Parent) | P0 | 2 | 1 |
| EP-08 | Examinations & Results | P1 | 3 | 2 |
| EP-09 | Feature Flag Platform | P1 | 2 | 2 |
| EP-10 | White Label Architecture | P1 | 3 | 3 |
| EP-11 | Build Automation | P1 | 2 | 3 |
| EP-12 | Offline Sync Engine | P1 | 3 | 3 |
| EP-13 | Admin App | P1 | 3 | 3 |
| EP-14 | Teacher App — Marks & Assignments | P1 | 2 | 3 |
| EP-15 | Communication & Messaging | P2 | 2 | 3–4 |
| EP-16 | Analytics & Observability | P2 | 2 | 3 |
| EP-17 | Deployment & Store Management | P1 | 2 | 3 |
| EP-18 | WhatsApp Integration Readiness | P2 | 1 | 4 |

---

## EP-01: Authentication & Authorization

**Business Objective:** Enable all 5 user roles to securely log in, maintain sessions, and access only their authorized data.

**Technical Objective:** Implement JWT auth with refresh, SecureStore token management, biometric unlock, and role-based navigation.

### User Stories

**EP-01-US-01: Login with credentials**
- *As a parent/teacher/student/admin, I want to log in with my username and password so I can access my school data.*
- **AC1:** Login form accepts username and password.
- **AC2:** Successful login stores access token and refresh token in SecureStore.
- **AC3:** User is redirected to their role-specific dashboard.
- **AC4:** Incorrect credentials show "Invalid username or password" (no specific field hint for security).
- **AC5:** After 5 failed attempts, account is locked. Show "Account locked. Try again in 15 minutes."
- **Story Points:** 5

**EP-01-US-02: Automatic token refresh**
- *As any authenticated user, I want my session to continue seamlessly without re-logging in every 60 minutes.*
- **AC1:** When access token expires, the API client automatically calls `/api/auth/refresh`.
- **AC2:** Original request is retried with new token.
- **AC3:** If refresh fails, user is redirected to login with "Session expired" message.
- **AC4:** Multiple concurrent requests on expiry are queued, not all trigger separate refresh calls.
- **Story Points:** 3

**EP-01-US-03: School domain entry (shared app)**
- *As a user on the shared Vitana app, I want to enter my school's domain so I connect to my school's data.*
- **AC1:** Shared app shows a school domain entry field before login form.
- **AC2:** On entering domain, `GET /api/settings/public-branding` is called.
- **AC3:** School logo and colors are displayed on login screen.
- **AC4:** Invalid domain shows "School not found. Please check with your administrator."
- **AC5:** Domain is saved and pre-filled on subsequent app opens.
- **Story Points:** 5

**EP-01-US-04: Biometric unlock**
- *As a frequently-returning user, I want to unlock the app with my fingerprint or Face ID so I don't type my password every time.*
- **AC1:** After first successful password login, user is offered to enable biometrics.
- **AC2:** On next app open, biometric challenge is presented.
- **AC3:** On biometric success, stored token is read from SecureStore and session is restored.
- **AC4:** User can disable biometrics in settings.
- **AC5:** Biometrics are cleared on logout.
- **Story Points:** 3

**EP-01-US-05: Logout**
- *As any user, I want to log out securely so my data is not accessible on a shared device.*
- **AC1:** Logout calls `POST /api/auth/logout` to invalidate refresh token on server.
- **AC2:** All SecureStore tokens are cleared.
- **AC3:** TanStack Query cache is cleared.
- **AC4:** SQLite offline data is cleared.
- **AC5:** User is redirected to login screen.
- **Story Points:** 2

---

## EP-02: Mobile Foundation & Architecture

**Business Objective:** Establish the technical foundation for all subsequent feature development.

**Technical Objective:** Set up Expo Router, state management, API client, theming, offline infrastructure, error tracking.

### User Stories

**EP-02-US-01: Project setup & navigation shell**
- *As a developer, I want the project structure and navigation skeleton in place so features can be added predictably.*
- **AC1:** Expo Router groups for `(auth)`, `(parent)`, `(teacher)`, `(student)`, `(admin)` created.
- **AC2:** Role-based root layout redirects correctly.
- **AC3:** Tab navigators configured per role.
- **AC4:** NativeWind + school theme tokens configured.
- **AC5:** pnpm workspace with `@vitana/shared-types` linked.
- **Story Points:** 8

**EP-02-US-02: API client with auth interceptors**
- *As a developer, I want a pre-configured API client so every request automatically includes auth headers and handles token refresh.*
- **AC1:** Axios instance with `EXPO_PUBLIC_API_BASE_URL` base.
- **AC2:** Request interceptor injects `Authorization`, `X-Academic-Year`, `X-Correlation-ID`.
- **AC3:** Response interceptor unwraps API envelope.
- **AC4:** 401 interceptor triggers refresh queue.
- **AC5:** Network errors formatted as `ApiError` with status code.
- **Story Points:** 5

**EP-02-US-03: App configuration loading**
- *As any user, I want the app to load my school's features and branding in one fast call on startup.*
- **AC1:** `GET /api/mobile/app-config` called on first authenticated render.
- **AC2:** Result cached in TanStack Query (30-minute stale time).
- **AC3:** Feature flags available via `useFeatureFlag('library')` hook.
- **AC4:** If call fails, last cached config is used (graceful degradation).
- **AC5:** Version requirement check runs after config loads.
- **Story Points:** 5

---

## EP-03: Parent App — Core

**Business Objective:** Give parents instant visibility into their child's school life on their phones.

**Technical Objective:** Implement parent dashboard, attendance, fees, results, announcements, diary, and leave request screens.

### User Stories

**EP-03-US-01: Parent dashboard**
- *As a parent, I want to see a summary of my child's key information the moment I open the app.*
- **AC1:** Dashboard shows child's photo, name, class, and section.
- **AC2:** Today's attendance status shown prominently.
- **AC3:** Outstanding fee amount with "Pay Now" shortcut.
- **AC4:** Most recent exam result preview.
- **AC5:** Latest unread announcement.
- **AC6:** Unread notification count badge.
- **AC7:** Multi-child parents see a child switcher (horizontal scroll).
- **Story Points:** 8

**EP-03-US-02: View child's daily attendance**
- *As a parent, I want to know if my child was present today so I have peace of mind.*
- **AC1:** Today's status shown: Present (green), Absent (red), Late (amber).
- **AC2:** Monthly calendar heatmap showing P/A/L per day.
- **AC3:** Monthly attendance percentage prominently displayed.
- **AC4:** Shortage alert displayed if attendance < threshold%.
- **AC5:** "Data as of [last sync time]" shown if data is from cache.
- **Story Points:** 5

**EP-03-US-03: View and pay fees**
- *As a parent, I want to see my child's outstanding fees and pay them easily from the app.*
- **AC1:** Fee breakdown by fee head (Tuition, Library, etc.) shown.
- **AC2:** Total pending amount prominently displayed.
- **AC3:** "Pay Now" button opens Cashfree mobile checkout.
- **AC4:** On payment success, fee summary refreshes automatically.
- **AC5:** Payment receipt viewable (link to PDF).
- **AC6:** Payment history list (date, amount, receipt number).
- **Story Points:** 8

**EP-03-US-04: View exam results**
- *As a parent, I want to see my child's exam results and report cards.*
- **AC1:** List of published exams with overall score/grade.
- **AC2:** Subject-wise marks breakdown per exam.
- **AC3:** Report card download (opens PDF in browser).
- **AC4:** Grade comparison: current vs. class average (if data available).
- **AC5:** Results from multiple academic years accessible.
- **Story Points:** 5

**EP-03-US-05: Read announcements and diary**
- *As a parent, I want to stay informed about school news and what my child's teacher posted today.*
- **AC1:** Announcements feed with school-wide and class-specific mixed.
- **AC2:** Each announcement shows title, date, priority badge, full body.
- **AC3:** Diary section shows class teacher's daily entries for the child's class.
- **AC4:** Unread announcements have a visual indicator.
- **AC5:** Infinite scroll with pagination.
- **Story Points:** 5

**EP-03-US-06: Apply leave for child**
- *As a parent, I want to submit a leave request for my child from the app.*
- **AC1:** Leave request form: from date, to date, reason (text).
- **AC2:** Shows remaining leave balance.
- **AC3:** Request submitted to server (queued if offline).
- **AC4:** Status tracker: Pending → Approved/Rejected.
- **AC5:** Push notification when leave is approved or rejected.
- **Story Points:** 3

---

## EP-04: Teacher App — Attendance & Timetable

**Business Objective:** Save teachers 5-10 minutes per class period by enabling quick, reliable mobile attendance marking.

**Technical Objective:** Implement timetable view, student list per class, bulk attendance marking with offline support.

### User Stories

**EP-04-US-01: View today's timetable**
- *As a teacher, I want to see my schedule for the day at a glance.*
- **AC1:** List of periods in chronological order: time, subject, class-section, room.
- **AC2:** Current period highlighted.
- **AC3:** Quick "Mark Attendance" button on each period row.
- **AC4:** Weekly timetable view accessible.
- **AC5:** Works offline from SQLite cache.
- **Story Points:** 5

**EP-04-US-02: Mark class attendance (bulk)**
- *As a class teacher, I want to mark attendance for my class quickly so I can do it in under 2 minutes.*
- **AC1:** Class list shows all students with roll number and photo thumbnail.
- **AC2:** "All Present" bulk action marks everyone present.
- **AC3:** Individual students can be toggled to Absent or Late.
- **AC4:** "Submit" saves attendance to server (or offline queue).
- **AC5:** Already-marked dates are shown as read-only (with edit option for class teacher).
- **AC6:** Works fully offline — queued and synced on reconnect.
- **Story Points:** 8

**EP-04-US-03: View class attendance summary**
- *As a teacher, I want to quickly see which students have low attendance in my class.*
- **AC1:** Class attendance % for the current month shown.
- **AC2:** Students below threshold highlighted in red.
- **AC3:** Quick individual student attendance calendar.
- **Story Points:** 3

**EP-04-US-04: Approve/reject student leave**
- *As a class teacher, I want to act on leave requests from students and parents.*
- **AC1:** List of pending leave requests for my classes.
- **AC2:** Approve with optional remark.
- **AC3:** Reject with mandatory reason.
- **AC4:** Push notification sent to parent/student on action.
- **Story Points:** 3

---

## EP-05: Student App — Core

### User Stories

**EP-05-US-01: Student dashboard**
- *As a student, I want to see today's schedule, latest results, and pending assignments on my home screen.*
- **AC1:** Today's timetable (periods remaining for today).
- **AC2:** Attendance % for current month with visual indicator.
- **AC3:** Most recent exam result preview.
- **AC4:** Assignments due this week (count badge).
- **AC5:** Latest announcement.
- **Story Points:** 5

**EP-05-US-02: View and submit assignments**
- *As a student, I want to see my pending assignments and submit them from my phone.*
- **AC1:** Assignment list: title, subject, due date, status (Pending/Submitted/Graded/Late).
- **AC2:** Assignment detail: description, attachments, submission form.
- **AC3:** Text submission (rich text area).
- **AC4:** File submission (photo from camera or file picker).
- **AC5:** Submission status tracked; graded submissions show feedback and marks.
- **Story Points:** 8

**EP-05-US-03: View exam results and report card**
- *As a student, I want to check my results and download my report card.*
- **AC1:** Results list with exam name, marks, grade, rank.
- **AC2:** Subject-wise breakdown per exam.
- **AC3:** Report card PDF download.
- **AC4:** Historical results across academic years.
- **Story Points:** 5

---

## EP-06: Push Notifications

### User Stories

**EP-06-US-01: Device token registration**
- *As any user, I want to receive push notifications so I don't miss important updates.*
- **AC1:** On first login, permission is requested with clear explanation.
- **AC2:** FCM/APNS token registered with backend via `POST /api/notifications/register-device`.
- **AC3:** Token refreshed automatically if FCM rotates it.
- **AC4:** Works on both Android and iOS.
- **Story Points:** 3

**EP-06-US-02: Receive and act on push notifications**
- *As a parent, I want to tap a push notification and be taken directly to the relevant screen.*
- **AC1:** Fee due notification → opens Fee screen.
- **AC2:** Attendance marked absent → opens Attendance screen for that child.
- **AC3:** Result published → opens Results screen.
- **AC4:** New announcement → opens Announcements screen.
- **AC5:** Foreground notification shows in-app banner.
- **Story Points:** 5

**EP-06-US-03: Notification preferences**
- *As a user, I want to choose which types of notifications I receive.*
- **AC1:** Settings screen lists all notification categories with toggles.
- **AC2:** Toggling off sends `PUT /api/notifications/preferences`.
- **AC3:** Direct messages and payment confirmations cannot be fully disabled.
- **Story Points:** 3

---

## EP-07: Fee Module (Parent)

*See EP-03-US-03 above. Extended user stories for fee module:*

**EP-07-US-01: Cashfree mobile payment**
- *As a parent, I want to pay my child's fees using UPI or card from my phone.*
- **AC1:** "Pay Now" button initiates mobile payment session.
- **AC2:** Cashfree SDK checkout sheet opens (or UPI deep-link on Android).
- **AC3:** On payment success, fee summary is refreshed.
- **AC4:** On payment failure, clear error message with retry option.
- **AC5:** Receipt number shown immediately on success.
- **Story Points:** 8

---

## EP-08: Examinations & Results

### User Stories

**EP-08-US-01: Enter exam marks (teacher)**
- *As a teacher, I want to enter marks for my class on my phone after an exam.*
- **AC1:** Exam list shows active exams for my classes.
- **AC2:** Student list with marks input fields (numeric, validated against max marks).
- **AC3:** Auto-save to SQLite draft every 30 seconds.
- **AC4:** Submit marks to server (offline: queue for sync).
- **AC5:** Previously entered marks are pre-filled for editing.
- **AC6:** Theory and practical marks entered separately where applicable.
- **Story Points:** 8

**EP-08-US-02: View class exam performance (teacher)**
- *As a teacher, I want to see how my class performed on an exam.*
- **AC1:** Class average, highest, lowest scores shown.
- **AC2:** Grade distribution pie chart.
- **AC3:** Topper list (top 5 students).
- **AC4:** Students who failed highlighted.
- **Story Points:** 3

---

## EP-09: Feature Flag Platform

*Detailed in [07-feature-flag-architecture.md](./07-feature-flag-architecture.md)*

### User Stories

**EP-09-US-01: Module-aware navigation**
- *As any user, I want to see only the modules my school has enabled so the app isn't cluttered.*
- **AC1:** Navigation items for disabled modules are not shown.
- **AC2:** If user navigates via deep link to a disabled module, "Feature not available" screen shown.
- **AC3:** Feature flags load from server at startup (30-minute cache).
- **Story Points:** 3

**EP-09-US-02: Force update screen**
- *As a user on an outdated app version, I want to be prompted to update so I access the latest features.*
- **AC1:** If app version < `forceUpdateVersion` in config, blocking upgrade screen shown.
- **AC2:** Screen shows "New update required" with store link.
- **AC3:** App is unusable until updated (no bypass option).
- **Story Points:** 2

---

## EP-10: White Label Architecture

*Detailed in [08-white-label-architecture.md](./08-white-label-architecture.md)*

### User Stories

**EP-10-US-01: Build dedicated school app**
- *As a Vitana DevOps engineer, I want to build a school-branded app in under 4 hours.*
- **AC1:** `inject-school-config.js {schoolId}` downloads assets and writes config.
- **AC2:** `eas build --profile school-production` succeeds in < 30 min.
- **AC3:** App icon, splash, and colors match the school's branding.
- **AC4:** App name matches school's requested name.
- **AC5:** App connects only to that school's domain.
- **Story Points:** 13

**EP-10-US-02: Runtime branding in shared app**
- *As a parent using the shared Vitana app, I want to see my school's colors and logo after logging in.*
- **AC1:** After login, school logo displayed in app header.
- **AC2:** Primary color applied to buttons, tab bar, and key UI elements.
- **AC3:** On logout, theme resets to Vitana defaults.
- **Story Points:** 5

---

## EP-11: Build Automation

*Detailed in [11-build-automation.md](./11-build-automation.md)*

### User Stories

**EP-11-US-01: Automated PR preview build**
- *As a mobile developer, I want every PR to have an installable preview build.*
- **AC1:** GitHub Actions triggers EAS preview build on every mobile PR.
- **AC2:** Build link posted as PR comment within 30 minutes.
- **AC3:** Android APK and iOS IPA both generated.
- **Story Points:** 5

**EP-11-US-02: Production release via tag**
- *As a release manager, I want to release to stores by pushing a git tag.*
- **AC1:** Pushing `mobile-v1.2.0` tag triggers production build.
- **AC2:** Build requires manual approval in GitHub environments.
- **AC3:** AAB/IPA submitted to internal testing tracks automatically.
- **AC4:** Slack notification with build status.
- **Story Points:** 5

---

## EP-12: Offline Sync Engine

*Detailed in [10-offline-architecture.md](./10-offline-architecture.md)*

### User Stories

**EP-12-US-01: Offline attendance marking**
- *As a teacher in a low-connectivity classroom, I want to mark attendance even without internet.*
- **AC1:** Student list is pre-cached in SQLite when opened with connectivity.
- **AC2:** Attendance marking works completely offline.
- **AC3:** Submission is queued and synced on reconnect.
- **AC4:** Offline banner shows "Saved offline. Will sync when connected."
- **AC5:** On sync, if conflict detected, teacher is notified.
- **Story Points:** 8

**EP-12-US-02: Pending sync status indicator**
- *As any user with pending offline operations, I want to know how many items are waiting to sync.*
- **AC1:** Badge on settings icon shows pending count.
- **AC2:** Dedicated sync status screen shows all pending operations.
- **AC3:** Failed operations listed with error reason and retry option.
- **Story Points:** 3

---

## EP-13: Admin App

### User Stories

**EP-13-US-01: Admin morning dashboard**
- *As a principal, I want to open the app and immediately see the school's status for the day.*
- **AC1:** Today's attendance rate across all classes (% present).
- **AC2:** Yesterday's fee collection total.
- **AC3:** Pending approvals count (leave + admissions).
- **AC4:** Latest unread announcement.
- **AC5:** Any billing alert if subscription expiring.
- **Story Points:** 8

**EP-13-US-02: Approve staff leave from mobile**
- *As a principal, I want to approve or reject staff leave requests without opening the web portal.*
- **AC1:** List of pending leave requests with staff name, type, dates, reason.
- **AC2:** Approve with optional remarks (one tap).
- **AC3:** Reject with mandatory reason.
- **AC4:** Staff member receives push notification on action.
- **Story Points:** 3

**EP-13-US-03: Create and publish announcement**
- *As an admin, I want to post school announcements instantly from my phone.*
- **AC1:** Form with title, body, priority (Low/Normal/High/Urgent), audience (All/Class/Role).
- **AC2:** Rich text body editor.
- **AC3:** Announcement published immediately on submit.
- **AC4:** Teachers and parents receive push notification for Urgent priority.
- **Story Points:** 5

---

## EP-14: Teacher App — Marks & Assignments

*See EP-08-US-01 above + additional:*

**EP-14-US-01: Create and manage assignments**
- *As a teacher, I want to post homework assignments from my phone.*
- **AC1:** Form: title, subject, class, description, due date.
- **AC2:** Optional attachment (file or image).
- **AC3:** Students notified via push when assignment is created.
- **AC4:** View submission count vs. total students.
- **Story Points:** 5

---

## EP-15: Communication & Messaging

### User Stories

**EP-15-US-01: Direct messaging teacher-parent**
- *As a parent, I want to message my child's class teacher directly.*
- **AC1:** Conversation list shows active teacher threads.
- **AC2:** Message thread with sent/delivered/read indicators.
- **AC3:** Real-time-like updates (polling every 30s or push).
- **AC4:** New message triggers push notification to recipient.
- **Story Points:** 8

---

## EP-16: Analytics & Observability

### User Stories

**EP-16-US-01: Crash and error monitoring**
- *As a developer, I want crashes and errors to be automatically captured.*
- **AC1:** Sentry SDK initialized on app start.
- **AC2:** All unhandled errors sent to Sentry with user context (schoolId, role).
- **AC3:** Error boundary wraps each feature module.
- **AC4:** Correlation IDs link mobile errors to backend trace logs.
- **Story Points:** 3

---

## EP-17: Deployment & Store Management

*See [12-deployment-strategy.md](./12-deployment-strategy.md)*

---

## EP-18: WhatsApp Integration Readiness

### User Stories

**EP-18-US-01: WhatsApp delivery status (Admin)**
- *As a school admin, I want to see if WhatsApp campaign messages were delivered.*
- **AC1:** WhatsApp analytics overview screen (message count, delivery %, failures).
- **AC2:** Deep link from push notification to this screen.
- **Story Points:** 3

---

*Full epic documents with complete detail available in the [epics/](./epics/) directory.*
