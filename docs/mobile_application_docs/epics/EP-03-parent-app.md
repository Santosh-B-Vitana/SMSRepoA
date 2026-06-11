# EP-03: Parent App — Core

> **Epic ID:** EP-03  
> **Priority:** P0  
> **Estimated Sprints:** 5  
> **Phase:** 1–2  
> **Related Docs:** [13-feature-inventory](../13-feature-inventory.md) · [PROMPT-03](../12-cursor-prompts/PROMPT-03-parent-app.md)

---

## Business Objective

Parents are the highest-volume user segment and have the most emotional investment in school data. A great Parent App drives platform adoption, reduces parent-teacher phone calls, and creates the school's "brand in the parent's pocket." This is the primary vehicle for converting schools to the mobile platform.

## Technical Objective

Build a complete Parent App covering: dashboard, child attendance, fee viewing and payment, exam results, announcements, diary, leave application, and notifications — all with offline read support.

---

## Current State Analysis

The backend provides all required data:
- `GET /api/students/my-children` — list of children linked to parent account.
- `GET /api/attendance/students?studentId=X&month=Y` — monthly attendance.
- `GET /api/fees/records?studentId=X` — fee summary.
- `GET /api/examinations/results?studentId=X` — published results.
- `GET /api/announcements?audience=parent` — filtered announcements.
- `GET /api/diary/parent/child/{studentId}` — diary entries.
- `POST /api/leavemanagement/student-leave` — submit leave.

Missing: A single aggregation endpoint for the dashboard. Must be built as `GET /api/mobile/parent-dashboard`.

Also missing: Mobile-optimized Cashfree payment initiation.

---

## Functional Requirements

| ID | Requirement |
|---|---|
| FR-1 | Parent can view a dashboard aggregating all key child information |
| FR-2 | Parents with multiple children can switch between them |
| FR-3 | Today's attendance status shown with color coding (Present/Absent/Late) |
| FR-4 | Monthly attendance calendar heatmap with P/A/L per day |
| FR-5 | Attendance shortage alert when child is below threshold |
| FR-6 | Fee summary with total, paid, and pending amounts |
| FR-7 | Pay fees using Cashfree (UPI, card, netbanking) |
| FR-8 | Payment receipt viewable and shareable |
| FR-9 | Exam results list with subject-wise breakdown |
| FR-10 | Report card PDF viewable |
| FR-11 | Announcements feed (school-wide + class-specific) |
| FR-12 | Class diary entries readable |
| FR-13 | Leave request form (dates + reason) + status tracking |
| FR-14 | Push notifications for all key events |
| FR-15 | Multi-child support for parents with 2+ children |

---

## Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-1 | Dashboard loads in < 2s on 4G (using aggregation endpoint) |
| NFR-2 | Attendance history available offline (TanStack Query cache) |
| NFR-3 | Fee data available offline (TanStack Query cache) |
| NFR-4 | App handles gracefully if a child has no fee data (empty state) |
| NFR-5 | Payment screen has screen recording protection |

---

## API Requirements

| Method | Endpoint | Status | Notes |
|---|---|---|---|
| GET | `/api/mobile/parent-dashboard` | TO BUILD | Aggregated dashboard |
| GET | `/api/students/my-children` | Exists | Child list |
| GET | `/api/students/{id}/profile-summary` | Exists | Child profile |
| GET | `/api/attendance/students` | Exists | Attendance records |
| GET | `/api/fees/records` | Exists | Fee summary |
| POST | `/api/fees/payments/mobile-initiate` | TO BUILD | Mobile Cashfree initiation |
| GET | `/api/fees/payments/{id}/receipt` | Exists | Receipt PDF |
| GET | `/api/examinations/results` | Exists | Results |
| GET | `/api/examinations/report-cards/{id}` | Exists | Report card PDF |
| GET | `/api/announcements` | Exists | Announcements |
| GET | `/api/diary/parent/child/{id}` | Exists | Diary |
| POST | `/api/leavemanagement/student-leave` | Exists | Leave application |
| GET | `/api/leavemanagement/student-leaves` | Exists | Leave status |

---

## Mobile Screens

| Screen | Route | Notes |
|---|---|---|
| Parent Dashboard | `/(parent)/` | Home tab |
| Child Detail | `/(parent)/child/[id]` | Tap child card |
| Attendance Monthly | `/(parent)/attendance/[studentId]` | Full calendar |
| Fee Summary | `/(parent)/fees/` | Fees tab |
| Fee Payment | `/(parent)/fees/pay` | Cashfree checkout |
| Payment Receipt | `/(parent)/fees/receipt/[id]` | PDF viewer |
| Payment History | `/(parent)/fees/history` | Scrollable list |
| Exam Results | `/(parent)/results/[studentId]` | Results tab |
| Exam Detail | `/(parent)/results/[studentId]/[examId]` | Subject-wise |
| Report Card | `/(parent)/results/report-card/[studentId]` | PDF viewer |
| Announcements | `/(parent)/announcements/` | Feed |
| Announcement Detail | `/(parent)/announcements/[id]` | Full body |
| Diary | `/(parent)/diary/[studentId]` | Diary entries |
| Leave List | `/(parent)/leaves/` | Leave requests |
| Apply Leave | `/(parent)/leaves/apply` | Form |
| Notifications | `/(parent)/notifications/` | Notification center |
| Profile | `/(parent)/profile/` | Settings |

---

## Navigation Flow

```
Tab bar: [Home] [Attendance] [Fees] [Results] [More ▼]
More → Announcements, Diary, Leaves, Notifications, Profile

Home (Dashboard):
  Child card → Child Detail
  Attendance widget → Attendance Monthly
  Fee card → Fee Summary
  Result preview → Exam Results
  Announcement → Announcement Detail
```

---

## Offline Strategy

| Feature | Offline Behavior |
|---|---|
| Dashboard | Shows cached data with "As of [time]" indicator |
| Attendance | Fully available from TanStack Query cache |
| Fee summary | Cached, "Pay Now" disabled with "Online required" |
| Results | Fully cached |
| Announcements | Cached up to last fetch |
| Diary | Cached |
| Leave application | Queued to offline write queue |
| Payment | Online only |

---

## Notification Requirements

| Event | Push Type | Deep Link |
|---|---|---|
| Child attendance marked absent | High priority | `/attendance/{studentId}` |
| Attendance below threshold | High priority | `/attendance/{studentId}` |
| Fee due reminder (N days before) | Normal | `/fees` |
| Fee overdue | Urgent | `/fees` |
| Payment confirmed | Normal | `/fees/receipt/{id}` |
| Result published | Normal | `/results/{studentId}` |
| New announcement | Normal | `/announcements/{id}` |
| New diary entry | Low | `/diary/{studentId}` |
| Leave approved/rejected | Normal | `/leaves` |
| Assignment graded | Normal | `/assignments/{id}` |

---

## Feature Flag Requirements

| Flag | Affects |
|---|---|
| `mobile.fees.online_payment` | Show/hide "Pay Now" button |
| `transport` | Show Transport card in "More" |
| `hostel` | Show Hostel card in "More" |
| `library` | Show Library card in "More" |
| `mobile.parent.multi_child` | Enable child switcher |

---

## Analytics Requirements

| Event | Properties |
|---|---|
| `parent_dashboard_viewed` | `schoolId`, `childCount` |
| `attendance_viewed` | `studentId`, `month` |
| `fee_payment_initiated` | `amount`, `paymentMethod` |
| `fee_payment_completed` | `amount`, `receiptId` |
| `results_viewed` | `studentId`, `examId` |
| `announcement_opened` | `announcementId`, `priority` |
| `leave_request_submitted` | `studentId`, `duration_days` |

---

## User Stories

See [14-epics-and-user-stories.md](../14-epics-and-user-stories.md) — EP-03-US-01 through EP-03-US-06.

**Total:** ~34 story points / 5 sprints

---

## Dependencies

| Dependency | Status |
|---|---|
| EP-01 (Auth) | Must be complete |
| EP-02 (Foundation) | Must be complete |
| EP-06 (Push Notifications) | Parallel development |
| EP-07 (Fee Payment) | In this epic scope |
| Backend: `/api/mobile/parent-dashboard` | Must be built |
| Backend: mobile Cashfree payment endpoint | Must be built |

---

## Sprint Breakdown

| Sprint | Scope |
|---|---|
| Sprint 3 | Dashboard + aggregation API + child switcher + attendance |
| Sprint 4 | Fee summary + Cashfree payment |
| Sprint 5 | Results + report card + announcements + diary |
| Sprint 6 | Leave application + error/empty states + QA |
| Sprint 10 | Push notifications wired to parent events |

---

## Testing Strategy

- Unit: `useParentDashboard`, `useFeeRecords`, fee calculation helpers
- E2E (Maestro): `parent_view_attendance.yaml`, `parent_pay_fee.yaml`, `parent_view_results.yaml`
- Manual: Payment flow tested on physical device with real Cashfree sandbox
- Accessibility: VoiceOver on iOS, TalkBack on Android for all screens
