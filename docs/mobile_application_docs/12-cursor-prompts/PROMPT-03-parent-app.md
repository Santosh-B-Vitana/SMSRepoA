# PROMPT-03: Parent App — Core Implementation

> **Prompt ID:** PROMPT-03  
> **Epic:** EP-03 — Parent App Core + EP-07 Fee Module  
> **Phase:** 1 — Sprints 3–6  
> **Estimated Story Points:** 42  
> **Prerequisites:** PROMPT-01 + PROMPT-02 complete  
> **Related Architecture Docs:** [epics/EP-03-parent-app](../epics/EP-03-parent-app.md) · [10-offline-architecture](../10-offline-architecture.md)

---

## Context

Authentication is complete. Build the complete Parent App — the highest-priority user journey in the entire mobile platform. Parents check this daily, so every screen must feel fast, clear, and trustworthy.

**Backend context:**
- All parent APIs exist and are documented in `docs/mobile_application_docs/03-api-analysis.md` Section 3.1.
- Missing: `GET /api/mobile/parent-dashboard` (aggregation endpoint — must be built by backend team in Sprint 3).
- Missing: `POST /api/fees/payments/mobile-initiate` (Cashfree mobile — must be built in Sprint 4).
- API envelope: all responses are `{ success, data, message }` — the Axios client already unwraps `.data`.

**Data patterns:**
- Parent `linkedEntityId` = guardian Guid (in JWT).
- `GET /api/students/my-children` returns children linked to this guardian.
- Multi-child: parent sees a horizontal scroll of children; data loads per-selected-child.
- IST timezone: use `formatDateIST()` from `@vitana/shared-utils` for all date displays.
- Currency: use `formatINR()` from `@vitana/shared-utils`.

---

## Requirements

### Navigation Structure

```
Tab Bar (Parent):
  Tab 1: Home        icon: home
  Tab 2: Attendance  icon: calendar-check
  Tab 3: Fees        icon: credit-card
  Tab 4: Results     icon: bar-chart
  Tab 5: More        icon: menu
```

The `_layout.tsx` for `(parent)` must implement this tab structure using Expo Router's `Tabs` component. Use the school's `primaryColor` from `schoolStore` for the active tab indicator.

### Screen: Parent Home Dashboard

**API:** `GET /api/mobile/parent-dashboard`  
**Route:** `/(parent)/`

This is the first screen parents see. It must be fast and informative.

**Layout:**
```
┌─────────────────────────────────────┐
│  [School Logo]    [Notifications 3] │
│  "Good morning, Priya"              │
├─────────────────────────────────────┤
│  [Child Card — Child Switcher]      │
│  ← Ananya (8A) · Rohan (5C) →      │
├─────────────────────────────────────┤
│  Today: PRESENT ✓                   │
│  Attendance: 94% this month         │
├─────────────────────────────────────┤
│  [Fee Card]                         │
│  ₹12,500 outstanding   [Pay Now]    │
├─────────────────────────────────────┤
│  [Latest Result]                    │
│  Unit Test 2 — 82% — Grade B+       │
├─────────────────────────────────────┤
│  [Latest Announcement]              │
│  Sports Day — Dec 15th              │
└─────────────────────────────────────┘
```

**Behavior:**
- `useQuery` with `queryKey: ['parent-dashboard', selectedChildId]`, `staleTime: 5 min`.
- Skeleton loading state while data loads.
- Pull-to-refresh support.
- Child switcher: horizontal FlatList of child cards; selected child highlighted.
- "Pay Now" button navigates to `/(parent)/fees/`.
- Attendance tap → `/(parent)/attendance/[studentId]`.

### Screen: Child Monthly Attendance

**API:** `GET /api/attendance/students?studentId=X&academicYear=Y`  
**Route:** `/(parent)/attendance/[studentId]`

**Layout:**
- Attendance % badge (large, colored: green ≥85%, amber 75-84%, red <75%).
- Monthly calendar heatmap: each day colored P (green) / A (red) / L (amber) / — (grey, future/holiday).
- Legend: Present / Absent / Late / No School.
- Shortage alert banner if below school's configured threshold.
- Month selector (prev/next arrows).

**Implementation notes:**
- Build a `AttendanceCalendar` component using `React Native`'s grid layout (7 columns).
- Month navigation changes the API query parameter.
- `X-Academic-Year` header injected by API client.

### Screen: Fee Summary & Online Payment

**API:** `GET /api/fees/records?studentId=X`, `POST /api/fees/payments/mobile-initiate`  
**Route:** `/(parent)/fees/`

**Layout:**
- Total outstanding (large, prominent).
- Fee breakdown table: fee head name | amount | paid | pending.
- Late fee (if any) highlighted in amber.
- "Pay Now" button (disabled if no outstanding balance).
- Payment history section (collapsible list of past payments).

**Cashfree Payment Flow:**
1. Tap "Pay Now" → show amount + confirmation.
2. Call `POST /api/fees/payments/mobile-initiate` with `{ studentId, amount }`.
3. Response includes `paymentSessionId` (or UPI deep-link).
4. Open Cashfree React Native checkout OR `expo-web-browser` with return URL.
5. On payment success callback → call `POST /api/fees/payments/verify`.
6. Invalidate fee query → show updated balance.
7. Navigate to receipt screen.

**Important:** Enable screen recording protection on payment screen using `expo-screen-capture`.

**Receipt Screen (`/(parent)/fees/receipt/[id]`):**
- Show receipt details (date, amount, receipt number, payment method).
- "Download PDF" → opens receipt PDF URL in Expo WebBrowser.
- Share button → native share sheet with PDF URL.

### Screen: Exam Results

**API:** `GET /api/examinations/results?studentId=X`  
**Route:** `/(parent)/results/[studentId]`

**Layout:**
- List of published exams (exam name, date, overall %, grade badge).
- Tap exam → detail screen.
- Detail: subject-wise marks table (subject | marks | max | grade).
- "View Report Card" button if report card exists.

**Report Card screen:**
- Open `expo-web-browser` with report card PDF URL.
- Share button.

### Screen: Announcements Feed

**API:** `GET /api/announcements?page=1&pageSize=20`  
**Route:** `/(parent)/announcements/`

**Layout:**
- Infinite scroll list.
- Priority badge: Urgent (red), High (amber), Normal (grey).
- Unread indicator (bold text).
- Tap → full announcement detail modal.

**Mark as read:** call `PUT /api/announcements/{id}/read` when detail is opened.

### Screen: Class Diary

**API:** `GET /api/diary/parent/child/{studentId}?page=1&pageSize=20`  
**Route:** `/(parent)/diary/[studentId]`

**Layout:**
- Chronological list of diary entries.
- Each entry: date, teacher name, full entry text.
- Pull-to-refresh.

### Screen: Leave Application

**API:** `POST /api/leavemanagement/student-leave`  
**Route:** `/(parent)/leaves/apply`

**Form:**
- Date range picker (from–to).
- Reason (text area, max 500 chars).
- Submit button.
- Offline: queue if no connectivity, show "Saved offline" toast.

**Leave List Screen (`/(parent)/leaves/`):**
- List of submitted leave requests.
- Status badge: Pending (grey) / Approved (green) / Rejected (red).
- Approved leaves show "days approved" count.

### More Tab

**Route:** `/(parent)/more`

Sections:
- **Communication**: Messages (teacher chat).
- **Documents**: View report card, certificates.
- **Library**: Issued books (if `library` feature flag enabled).
- **Transport**: Bus route (if `transport` flag enabled).
- **Hostel**: Room details (if `hostel` flag enabled).
- **Settings**: Profile, notification preferences, change password, logout.

Disabled (feature-flagged) items show with grey tint and "Not Available" label.

---

## Component Library

Create these reusable components in `src/components/`:

| Component | Props | Use |
|---|---|---|
| `ChildCard` | `student`, `isSelected`, `onPress` | Child switcher |
| `AttendanceCalendar` | `records: AttendanceRecord[]`, `month` | Monthly calendar |
| `AttendanceBadge` | `percentage` | Green/amber/red % badge |
| `FeeCard` | `outstanding`, `total`, `onPayPress` | Dashboard fee widget |
| `ResultCard` | `result: ExamResult` | Dashboard result preview |
| `AnnouncementCard` | `announcement`, `onPress` | Announcement list item |
| `PaymentHistoryItem` | `payment` | Payment list item |

---

## Offline Strategy

All screens must handle no-connection state gracefully:

```typescript
const { data, isLoading, isError, error, isStale } = useQuery({
  queryKey: ['fees', studentId],
  queryFn: () => feesApi.getRecords(studentId),
  staleTime: 10 * 60 * 1000,
  placeholderData: (prev) => prev,   // Use previous data while refetching
});

// Show "As of [time]" if data is stale
if (isStale && data) {
  <StaleBanner lastUpdated={dataUpdatedAt} />
}
```

---

## Implementation Tasks

1. Implement `/(parent)/_layout.tsx` with 5-tab navigator.
2. Build `src/api/endpoints/parent.ts` with all parent API calls.
3. Implement `/(parent)/index.tsx` (dashboard).
4. Implement `/(parent)/attendance/[studentId].tsx`.
5. Implement `/(parent)/fees/index.tsx`, `pay.tsx`, `receipt/[id].tsx`.
6. Implement `/(parent)/results/[studentId].tsx`, `results/[examId].tsx`.
7. Implement `/(parent)/announcements/index.tsx`, `[id].tsx`.
8. Implement `/(parent)/diary/[studentId].tsx`.
9. Implement `/(parent)/leaves/index.tsx`, `apply.tsx`.
10. Implement `/(parent)/more.tsx`.
11. Create all reusable components listed above.
12. Implement offline write queue for leave application.
13. Implement Cashfree payment flow (with `expo-web-browser` fallback).

---

## Acceptance Criteria

- [ ] Parent logs in → dashboard shows child data within 2s on 4G.
- [ ] Monthly attendance calendar renders correctly with color-coded days.
- [ ] Attendance % shown correctly (e.g., 23/25 = 92%).
- [ ] Fee outstanding amount matches backend data.
- [ ] Cashfree payment opens successfully (sandbox tested).
- [ ] After successful payment, fee summary refreshes.
- [ ] Receipt PDF opens in browser.
- [ ] Exam results list shows all published exams.
- [ ] Announcements load with infinite scroll.
- [ ] Leave application submitted successfully (and queued if offline).
- [ ] Multi-child switching updates all data for the selected child.
- [ ] Feature-flagged items (Library, Transport) hidden when flag is off.
- [ ] All screens have proper empty states and error states.
- [ ] All screens pass accessibility audit (VoiceOver navigable).

---

## Testing Requirements

Maestro E2E tests:
- `parent_view_attendance.yaml`: login → attendance tab → check monthly calendar.
- `parent_pay_fee.yaml`: login → fees tab → tap pay → Cashfree sandbox completes.
- `parent_view_results.yaml`: login → results tab → tap exam → view marks.
- `parent_apply_leave.yaml`: login → more → leaves → apply → verify pending status.
- `parent_offline_leave.yaml`: disable network → apply leave → re-enable → verify synced.

---

## Definition of Done

- [ ] All acceptance criteria pass.
- [ ] Maestro E2E tests pass.
- [ ] No TypeScript errors.
- [ ] Lighthouse-equivalent accessibility check passes (all tap targets ≥ 44×44px).
- [ ] Memory profile: no visible leaks on parent dashboard (tested with Flipper/React DevTools).
- [ ] Tested on physical Android (mid-range, 3GB RAM) and iPhone (iOS 16).
