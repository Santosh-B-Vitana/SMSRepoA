# Vitana Mobile Platform — Feature Inventory

> **Classification:** Internal Architecture Document  
> **Version:** 1.0  
> **Date:** June 2026  
> **Related Docs:** [02-erp-analysis](./02-erp-analysis.md) · [14-epics-and-user-stories](./14-epics-and-user-stories.md)

---

## Classification Legend

| Priority | Meaning |
|---|---|
| **Must Have (M)** | Required at launch. No launch without this. |
| **Should Have (S)** | High value, included in first 6 months |
| **Could Have (C)** | Nice to have, Phase 2–3 |
| **Future (F)** | Not in current roadmap; investigate in 12+ months |

---

## 1. Authentication & Authorization

| Feature | Roles | Priority | Backend API |
|---|---|---|---|
| Username/password login | All | M | `/api/auth/login` |
| JWT token refresh | All | M | `/api/auth/refresh` |
| Secure token storage (Keychain/Keystore) | All | M | Client-side |
| Logout | All | M | `/api/auth/logout` |
| Role-based navigation | All | M | JWT claims |
| Change password | All | M | `/api/auth/change-password` |
| Biometric unlock (Face/Touch ID) | All | S | Client-side |
| TOTP 2FA | Admin, Staff | S | `/api/auth/2fa/login` |
| Auto-logout on inactivity | All | S | Client-side |
| Multi-device login | All | M | Multiple tokens |
| Session management (view devices) | Admin | C | New API needed |
| SSO (Google Workspace) | All | F | New API needed |

---

## 2. School Setup & Branding

| Feature | Roles | Priority | Backend API |
|---|---|---|---|
| Public branding on login screen | All | M | `/api/settings/public-branding` |
| Dynamic theme (primary color) | All | M | `/api/mobile/app-config` |
| School logo in app header | All | M | Branding config |
| School name display | All | M | Branding config |
| School domain entry (shared app) | All | M | Client-side |
| Academic year selection | All | M | School store |
| Dark mode | All | S | Theme system |
| White label app icon + splash | All (dedicated) | S | Build-time |
| Extended branding (fonts, accent color) | All (dedicated) | C | `/api/mobile/branding` |

---

## 3. Parent App — Core Features

| Feature | Backend API | Priority | Offline |
|---|---|---|---|
| Parent dashboard (aggregated view) | `/api/mobile/parent-dashboard` | M | Read cache |
| View my children list | `/api/students/my-children` | M | Read cache |
| Switch between children | Client-side | M | — |
| Child profile summary | `/api/students/{id}/profile-summary` | M | Read cache |
| Today's attendance status | `/api/attendance/students?date=today` | M | Read cache |
| Monthly attendance calendar | `/api/attendance/students?month=X` | M | Read cache |
| Attendance shortage alert view | `/api/attendance/stats` | M | Read cache |
| Fee summary (total/paid/pending) | `/api/fees/records?studentId=X` | M | Read cache |
| Online fee payment (Cashfree UPI) | `/api/fees/payments/mobile-initiate` | M | Online only |
| Fee payment receipt view | `/api/fees/payments/{id}/receipt` | M | Read cache |
| Payment history | `/api/fees/payments` | S | Read cache |
| View exam results (published) | `/api/examinations/results` | M | Read cache |
| View report card (PDF) | `/api/examinations/report-cards/{id}` | M | Read cache |
| Announcements feed | `/api/announcements` | M | Read cache |
| Class diary entries | `/api/diary/parent/child/{id}` | M | Read cache |
| In-app notifications | `/api/notifications` | M | Read cache |
| Push notifications | FCM/APNS | M | — |
| Apply leave for child | `/api/leavemanagement/student-leave` | M | Offline queue |
| Leave request status | `/api/leavemanagement/student-leaves` | M | Read cache |
| Message class teacher | `/api/communication/messages` | S | Offline queue |
| View homework/diary | `/api/diary` | M | Read cache |
| View library issued books | `/api/library/my-issues` | C | Read cache |
| View transport route | `/api/transport/students?studentId=X` | C | Read cache |
| View hostel details | `/api/hostel/students?studentId=X` | C | Read cache |
| View assigned books/assignments | `/api/assignments?studentId=X` | S | Read cache |
| Profile settings | `/api/user-management/update-self` | S | — |

---

## 4. Student App — Core Features

| Feature | Backend API | Priority | Offline |
|---|---|---|---|
| Student dashboard | `/api/mobile/student-dashboard` | M | Read cache |
| My profile | `/api/students/me` | M | Read cache |
| Today's timetable | `/api/timetable?classId=X` | M | SQLite cache |
| Weekly timetable | `/api/timetable?classId=X&week=X` | M | SQLite cache |
| My attendance summary | `/api/attendance/my-attendance` | M | Read cache |
| Monthly attendance calendar | `/api/attendance` | M | Read cache |
| View exam results | `/api/examinations/results?studentId=me` | M | Read cache |
| View report card | `/api/examinations/report-cards/{id}` | M | Read cache |
| View assignments | `/api/assignments?studentId=me` | M | Read cache |
| Submit assignment (text) | `/api/assignments/{id}/submissions` | M | Offline queue |
| Submit assignment (file) | `/api/assignments/{id}/submissions` | S | Online only |
| View fee summary | `/api/fees/records?studentId=me` | M | Read cache |
| Apply for leave | `/api/attendance/leave-requests` | M | Offline queue |
| View leave status | `/api/attendance/leave-requests` | M | Read cache |
| Announcements | `/api/announcements` | M | Read cache |
| Notifications | `/api/notifications` | M | Read cache |
| Library issued books | `/api/library/my-issues` | S | Read cache |
| Digital library resources | `/api/library/digital-resources` | C | — |
| Result portal / grade history | `/api/examinations/results` | S | Read cache |
| Online exam portal (MCQ) | `/api/online-exam` | C | Online only |
| Syllabus / curriculum view | `/api/syllabus` | C | Read cache |
| School connect (social) | `/api/schoolconnect` | F | — |

---

## 5. Teacher App — Core Features

| Feature | Backend API | Priority | Offline |
|---|---|---|---|
| Teacher dashboard | `/api/mobile/teacher-dashboard` | M | Read cache |
| Today's timetable | `/api/timetable/my-schedule` | M | SQLite cache |
| My assigned classes | `/api/academics/teacher-assignments` | M | Read cache |
| View class student list | `/api/students?classId=X` | M | SQLite cache |
| Mark attendance (bulk) | `/api/attendance/students/bulk` | M | Offline queue |
| Edit attendance | `/api/attendance/students/{id}` | M | — |
| View class attendance summary | `/api/attendance/stats?classId=X` | M | Read cache |
| Enter exam marks | `/api/examinations/results/bulk` | M | SQLite draft |
| View entered marks | `/api/examinations/results` | M | Read cache |
| Post class diary entry | `/api/diary` | M | Offline queue |
| View diary history | `/api/diary?classId=X` | S | Read cache |
| Create assignment | `/api/assignments` | S | — |
| View assignment submissions | `/api/assignments/{id}` | S | Read cache |
| Grade student submission | `/api/assignments/{id}/grade/{subId}` | S | — |
| Apply for own leave | `/api/leavemanagement/leave-requests` | M | Offline queue |
| View/approve student leave | `/api/attendance/leave-requests` | M | Read cache |
| Announcements (view + create) | `/api/announcements` | M | Read cache |
| Notifications | `/api/notifications` | M | Read cache |
| Message parent | `/api/communication/messages` | S | Offline queue |
| View syllabus coverage | `/api/syllabus` | C | Read cache |
| Mark curriculum chapters | `/api/syllabus/units` | C | — |
| Online exam management | `/api/examinations/exam-setup` | C | — |

---

## 6. Admin / Principal App — Core Features

| Feature | Backend API | Priority | Offline |
|---|---|---|---|
| Admin dashboard (KPIs) | `/api/mobile/admin-dashboard` | M | Read cache |
| Today's attendance rate (school-wide) | `/api/attendance/stats` | M | Read cache |
| Daily fee collection summary | `/api/fees/stats` | M | Read cache |
| Approve/reject staff leave | `/api/leavemanagement/leave-requests` | M | — |
| Create/post announcement | `/api/announcements` | M | — |
| View pending leave requests | `/api/leavemanagement/leave-requests` | M | Read cache |
| Staff list overview | `/api/staff` | S | Read cache |
| Student list overview | `/api/students` | S | Read cache |
| View exam results summary | `/api/examinationreports` | S | Read cache |
| View fee defaulters | `/api/fees/records` | S | Read cache |
| Notifications | `/api/notifications` | M | Read cache |
| Billing status / subscription info | `/api/school-feature-permissions` | S | Read cache |
| Analytics overview | `/api/analytics/dashboard` | S | Read cache |
| Approve admissions (view/approve) | `/api/admissions` | C | — |

---

## 7. Super Admin App — Monitoring Features

| Feature | Backend API | Priority |
|---|---|---|
| Platform dashboard (all schools) | `/api/analytics` (super admin) | C |
| School health overview | `/api/school-feature-permissions` | C |
| Billing status per school | CRM API | C |
| Manage school feature flags | `/api/school-feature-permissions` | C |
| WhatsApp platform overview | `/api/super-admin/whatsapp/dashboard` | F |

---

## 8. Cross-Cutting Features (All Roles)

| Feature | Priority | Backend API |
|---|---|---|
| Push notifications | M | FCM/APNS |
| In-app notification center | M | `/api/notifications` |
| Notification preferences | M | `/api/notifications/preferences` |
| Deep link navigation from notifications | M | Expo Router |
| Network offline indicator | M | NetInfo |
| Offline write queue status | M | Client-side |
| Manual sync trigger | S | Queue processor |
| App update prompt | M | App config version check |
| Force update screen | M | App config |
| Maintenance mode screen | S | App config |
| Error reporting (Sentry) | M | SDK |
| Analytics (Amplitude) | S | SDK |
| Crash reporting (Sentry) | M | SDK |
| In-app feedback | S | `/api/mobile/feedback` |
| User preferences (language, theme) | S | `/api/user-management/settings` |
| Accessibility (screen reader, large text) | S | React Native Accessibility API |
| Haptic feedback | S | `expo-haptics` |
| Biometric auth | S | `expo-local-authentication` |
| Document viewer (PDF) | S | `expo-web-browser` |
| File download to device | S | `expo-file-system` |

---

## 9. White Label & Platform Features

| Feature | Priority | Notes |
|---|---|---|
| Dynamic school branding at runtime | M | App config endpoint |
| Build-time asset injection | M | EAS + app.config.js |
| Per-school feature flag support | M | Feature flag architecture |
| Per-school module enable/disable | M | SchoolFeaturePermissions |
| Dedicated school app generation | S | Build automation |
| School app store management | S | EAS Submit |
| OTA updates per school channel | S | EAS Update channels |
| School branding admin panel | S | Web (new settings page) |
| Asset upload for white label | S | Web (school settings) |
| Automated screenshot generation | C | CI pipeline |

---

## 10. Future Features (12+ Months)

| Feature | Potential Role | Notes |
|---|---|---|
| Hindi / Regional language UI | All | i18n architecture needed |
| In-app online exam (MCQ) | Student | Complex, needs reliable connectivity |
| Live GPS bus tracking | Parent | Transport module + hardware |
| Biometric attendance sync | Teacher | BLE/NFC integration |
| AI homework helper | Student | LLM API integration |
| Video messages (parent-teacher) | Teacher, Parent | Infrastructure cost |
| School pay / school store | Parent | Store module mobile UI |
| Alumni networking | Alumni | Alumni module |
| Visitor management check-in | Receptionist | QR code scanning |
| WhatsApp campaign manager on mobile | Admin | WhatsApp module |
| Offline exam paper distribution | Teacher | Complex sync |
| Parent-to-parent groups | Parent | School Connect extension |
| Digital ID card (NFC tap) | Student | NFC hardware |

---

*Next: [14-epics-and-user-stories.md](./14-epics-and-user-stories.md)*
