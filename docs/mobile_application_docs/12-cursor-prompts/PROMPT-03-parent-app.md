# PROMPT-03: Parent Portal — Core

> **Version**: 2.0 — Full 10-Phase Anatomy  
> **Epic**: EP-03 — Parent Portal Core + EP-07 — Fee Module  
> **Sprint**: 3–6 (Weeks 5–12)  
> **Story Points**: 42  
> **Prerequisites**: PROMPT-01 ✓, PROMPT-02 ✓, PROMPT-11 Parts A+B+Cashfree (backend)  
> **Next Prompt**: PROMPT-08 (Student Portal) or PROMPT-04 (Teacher Portal) — parallel  
> **Backend Dependency**: `GET /api/mobile/parent-dashboard`, `POST /api/fees/payments/mobile-initiate` must be ready

---

## PHASE 1: Context & Scope

> **ONE APP — PARENT PORTAL:** This prompt builds the `(parent)` route group inside the single Vitana SMS app binary. It is **not** a separate app. A user with role `Parent` is routed here after login. The same `com.vitana.sms` binary (or school's white-label equivalent) serves parents, teachers, students, and admins.

### What We're Building

The complete Parent Portal — the highest-priority user journey. Parents check this daily. Every screen must be fast, correct, and feel like a natural extension of the web portal.

**Capabilities:**
- Parent dashboard (aggregated view of child data)
- Multi-child switcher for parents with 2+ children
- Monthly attendance calendar heatmap
- Fee summary with online payment (Cashfree UPI/Cards)
- Payment receipt viewer + share
- Published exam results + report card PDF
- Announcements feed (infinite scroll)
- Class diary entries
- Leave application (offline-capable)
- Leave status tracking
- Notification center

### Current State

- ✅ Auth complete (PROMPT-02)
- ✅ `/(parent)/_layout.tsx` — tab navigator skeleton exists
- ✅ `/(parent)/index.tsx` — placeholder exists
- ✅ TanStack Query configured
- ✅ API client injects all headers
- ❌ All parent screens — empty placeholders
- ❌ Parent API endpoints not called
- ❌ Cashfree payment not integrated
- ❌ Fee payment flow not implemented

### Success Criteria

- [ ] Parent dashboard loads in < 2s on 4G (uses aggregation endpoint)
- [ ] Monthly attendance calendar renders P/A/L per day with correct colors
- [ ] Fee breakdown shows all fee heads with correct amounts
- [ ] Cashfree payment opens on Android and iOS physical devices
- [ ] Payment success refreshes fee balance automatically
- [ ] Receipt opens in browser via `expo-web-browser`
- [ ] Exam results show subject-wise marks with grade badges
- [ ] Announcements load with infinite scroll (no pagination jumps)
- [ ] Leave application queues offline and syncs when connected
- [ ] Multi-child switcher shows correct data per selected child
- [ ] Feature-flagged items (Library, Transport) hidden when flag is off
- [ ] All screens have loading skeletons (no blank flashes)
- [ ] All screens have empty states with helpful text
- [ ] All tap targets ≥ 44×44px (accessibility)

---

## PHASE 2: Analysis Phase

### Read First

```bash
docs/mobile_application_docs/epics/EP-03-parent-app.md
docs/mobile_application_docs/epics/EP-07-fee-module.md
docs/mobile_application_docs/03-api-analysis.md  # Section 3.1 (Parent APIs)
docs/mobile_application_docs/10-offline-architecture.md  # Leave queue section
```

### Existing Code Audit

```bash
# Verify placeholder screens exist
ls mobile/app/\(parent\)/

# Verify Zustand stores are hydrated before screens render
grep -n "isHydrated" mobile/src/stores/authStore.ts

# Check Cashfree SDK availability
# Note: If Cashfree RN SDK has issues, use expo-web-browser fallback
# Test the fallback first (simpler, works immediately)
curl -I https://cashfree.com  # Reachability check
```

### Parent API Contracts

```
GET /api/mobile/parent-dashboard      → Aggregated dashboard (MUST be built by backend)
GET /api/students/my-children         → [{ id, name, photoUrl, className, rollNumber }]
GET /api/attendance/students?studentId=X&month=M&year=Y  → MonthlyAttendance
GET /api/fees/records?studentId=X     → FeeRecord (with feeHeads[])
POST /api/fees/payments/mobile-initiate → { cfOrderId, paymentSessionId, amount }
POST /api/fees/payments/verify        → { status, paymentId, receiptNumber }
GET /api/fees/payments?studentId=X    → PaymentRecord[]
GET /api/fees/payments/{id}/receipt   → { pdfUrl }
GET /api/examinations/results?studentId=X → ExamResult[]
GET /api/examinations/report-cards/{studentId} → ReportCard
GET /api/announcements?page=1&pageSize=20 → PaginatedResponse<Announcement>
GET /api/diary/parent/child/{studentId}?page=1 → PaginatedResponse<DiaryEntry>
POST /api/leavemanagement/student-leave → LeaveRequest
GET /api/leavemanagement/student-leaves?studentId=X → LeaveRequest[]
GET /api/notifications?page=1&pageSize=20 → PaginatedResponse<AppNotification>
PUT /api/notifications/{id}/read       → {}
PUT /api/notifications/read-all        → {}
```

### Technology Decisions

| Decision | Choice | Reasoning |
|---|---|---|
| **Payment SDK** | `expo-web-browser` → Cashfree hosted checkout | Fallback-first: works immediately, no native SDK needed. Upgrade to Cashfree RN SDK in Sprint 5. |
| **Infinite scroll** | FlashList + TanStack Query `useInfiniteQuery` | `FlashList` for perf; `useInfiniteQuery` for paginated feeds |
| **Calendar** | Custom grid with `View`/`Text` | No heavy calendar lib needed; attendance grid is a simple 7-col layout |
| **Charts** | `victory-native-xl` (small bundle) | Lightweight; works on New Architecture |
| **PDF viewing** | `expo-web-browser` | Opens system browser — no PDF library needed |

---

## PHASE 3: Technical Planning

### 3.1 Parent Tab Structure

```
Tab 1: Home     — Dashboard (aggregated)
Tab 2: Attend   — Child attendance calendar
Tab 3: Fees     — Fee summary + pay
Tab 4: Results  — Exam results + report card
Tab 5: More     — Announcements, Diary, Leaves, Notifications, Profile
```

### 3.2 Screen File Map

```
mobile/app/(parent)/
├── _layout.tsx         ← Tab navigator (already exists, update icons+colors)
├── index.tsx           ← Dashboard (replace placeholder)
├── attendance/
│   └── [studentId].tsx ← Monthly attendance calendar
├── fees/
│   ├── index.tsx       ← Fee summary
│   ├── pay.tsx         ← Pre-payment + Cashfree launch
│   ├── success.tsx     ← Payment success + receipt
│   ├── failed.tsx      ← Payment failed + retry
│   └── receipt/
│       └── [id].tsx    ← Receipt viewer
├── results/
│   ├── [studentId].tsx ← Exam list
│   └── [studentId]/
│       └── [examId].tsx ← Subject-wise marks
├── more.tsx            ← More menu
├── announcements/
│   ├── index.tsx       ← Feed
│   └── [id].tsx        ← Full announcement
├── diary/
│   └── [studentId].tsx ← Diary entries
├── leaves/
│   ├── index.tsx       ← Leave history
│   └── apply.tsx       ← Leave form
└── notifications/
    └── index.tsx       ← Notification center
```

### 3.3 Data Flow

```
App open (parent authenticated)
    │
    ▼
GET /api/mobile/parent-dashboard
    │ Returns: children[], selectedChild, todayAttendance,
    │          feeSummary, latestResult, latestAnnouncement, unreadCount
    │
    ▼
Dashboard renders with server data
    │
Child switcher tap
    │
    ▼
Invalidate all queries with old studentId
Re-fetch all data with new studentId
```

---

## PHASE 4: Database Design

> No backend DB changes in this prompt.  
> Local SQLite is only used for the **offline leave queue**:

```typescript
// In offlineQueue (already defined in PROMPT-12 schema placeholder):
// operationType: 'student_leave'
// endpoint: '/api/leavemanagement/student-leave'
// body: JSON of LeaveRequestInput
```

---

## PHASE 5: Backend Implementation

> This section is for the **backend engineer** to complete before or during Sprint 3.

### 5.1 Parent Dashboard Aggregation Endpoint

```csharp
// Controllers/Mobile/MobileParentDashboardController.cs
[ApiController]
[Route("api/mobile")]
[Authorize(Roles = "Parent")]
public class MobileParentDashboardController : ControllerBase
{
    [HttpGet("parent-dashboard")]
    public async Task<IActionResult> GetParentDashboard()
    {
        var guardianId = _tenantContext.LinkedEntityId;
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        // Run all queries in parallel for performance
        var (children, unreadCount) = await Task.WhenAll(
            _studentService.GetStudentsByGuardianAsync(guardianId),
            _notificationService.GetUnreadCountAsync(_tenantContext.UserId)
        );

        // Use first child as primary (or last selected child from request header)
        var primaryChild = children.FirstOrDefault();
        object? todayAttendance = null, feeSummary = null, latestResult = null, latestAnnouncement = null;

        if (primaryChild != null)
        {
            (todayAttendance, feeSummary, latestResult, latestAnnouncement) = await (
                _attendanceService.GetTodayAttendanceAsync(primaryChild.Id),
                _feeService.GetStudentFeeSummaryAsync(primaryChild.Id, _academicYear),
                _examinationService.GetLatestPublishedResultAsync(primaryChild.Id),
                _announcementService.GetLatestForParentAsync(guardianId)
            );
        }

        return Ok(new {
            children,
            selectedChildId = primaryChild?.Id,
            todayAttendance,
            feeSummary,
            latestResult,
            latestAnnouncement,
            unreadNotificationCount = unreadCount
        });
    }
}
```

### 5.2 Mobile Payment Initiate Endpoint

```csharp
// Add to FeesController or new MobileFeesController
[HttpPost("fees/payments/mobile-initiate")]
[Authorize(Roles = "Parent,Student")]
public async Task<IActionResult> MobileInitiatePayment([FromBody] MobilePaymentInitRequest request)
{
    // Validate student belongs to this parent
    var isAuthorized = await _parentAuthorizationService
        .CanAccessStudentAsync(_tenantContext.UserId, request.StudentId);
    if (!isAuthorized) return Forbid();

    // Create Cashfree order
    var order = await _paymentGatewayService.CreateOrderAsync(
        request.StudentId, request.Amount, "Student Fee Payment"
    );

    return Ok(new {
        cfOrderId = order.OrderId,
        paymentSessionId = order.PaymentSessionId,
        amount = request.Amount,
        currency = "INR",
        expiresAt = DateTime.UtcNow.AddMinutes(30)
    });
}
```

---

## PHASE 6: Mobile Implementation

### 6.1 Parent API Layer

```typescript
// mobile/src/api/endpoints/parent.ts
import apiClient from '../client';
import type {
  MonthlyAttendance, FeeRecord, PaymentRecord,
  ExamResult, ReportCard, Announcement, AppNotification,
  MobilePaymentInitResponse, PaginatedResponse
} from '@vitana/shared-types';

export const parentApi = {
  getDashboard: () => apiClient.get('/mobile/parent-dashboard'),

  getMyChildren: () => apiClient.get('/students/my-children'),

  getAttendance: (studentId: string, month: number, year: number): Promise<MonthlyAttendance> =>
    apiClient.get(`/attendance/students`, { params: { studentId, month, year } }),

  getFeeRecords: (studentId: string): Promise<FeeRecord> =>
    apiClient.get(`/fees/records`, { params: { studentId } }),

  initiateMobilePayment: (studentId: string, amount: number): Promise<MobilePaymentInitResponse> =>
    apiClient.post('/fees/payments/mobile-initiate', { studentId, amount }),

  verifyPayment: (cfOrderId: string, cfPaymentId: string) =>
    apiClient.post('/fees/payments/verify', { cfOrderId, cfPaymentId }),

  getPaymentHistory: (studentId: string): Promise<PaymentRecord[]> =>
    apiClient.get('/fees/payments', { params: { studentId, page: 1, pageSize: 20 } }),

  getPaymentReceipt: (paymentId: string): Promise<{ pdfUrl: string }> =>
    apiClient.get(`/fees/payments/${paymentId}/receipt`),

  getExamResults: (studentId: string): Promise<ExamResult[]> =>
    apiClient.get('/examinations/results', { params: { studentId } }),

  getReportCard: (studentId: string): Promise<ReportCard> =>
    apiClient.get(`/examinations/report-cards/${studentId}`),

  getAnnouncements: (page: number): Promise<PaginatedResponse<Announcement>> =>
    apiClient.get('/announcements', { params: { page, pageSize: 20 } }),

  getDiaryEntries: (studentId: string, page: number) =>
    apiClient.get(`/diary/parent/child/${studentId}`, { params: { page, pageSize: 20 } }),

  applyLeave: (data: {
    studentId: string; fromDate: string; toDate: string; reason: string;
  }) => apiClient.post('/leavemanagement/student-leave', data),

  getLeaveRequests: (studentId: string) =>
    apiClient.get('/leavemanagement/student-leaves', { params: { studentId } }),

  getNotifications: (page: number): Promise<PaginatedResponse<AppNotification>> =>
    apiClient.get('/notifications', { params: { page, pageSize: 20 } }),

  markNotificationRead: (id: string): Promise<void> =>
    apiClient.put(`/notifications/${id}/read`),

  markAllRead: (): Promise<void> =>
    apiClient.put('/notifications/read-all'),
};
```

### 6.2 Shared Reusable Components

```typescript
// mobile/src/components/common/SkeletonLoader.tsx
import { View, Animated, useRef, useEffect } from 'react-native';

interface Props { width?: number | string; height?: number; borderRadius?: number; }

export function SkeletonLoader({ width = '100%', height = 16, borderRadius = 8 }: Props) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.View style={{ width, height, borderRadius, backgroundColor: '#e2e8f0', opacity }} />
  );
}
```

```typescript
// mobile/src/components/common/AttendanceBadge.tsx
import { View, Text } from 'react-native';
import { getAttendanceColor } from '@vitana/shared-utils';

interface Props { percentage: number; size?: 'sm' | 'md' | 'lg'; }

export function AttendanceBadge({ percentage, size = 'md' }: Props) {
  const colorKey = getAttendanceColor(percentage);
  const colorMap = {
    success: { bg: '#dcfce7', text: '#16a34a', border: '#16a34a' },
    warning: { bg: '#fef3c7', text: '#d97706', border: '#f59e0b' },
    danger:  { bg: '#fee2e2', text: '#dc2626', border: '#ef4444' },
  };
  const colors = colorMap[colorKey];
  const sizeClass = size === 'sm' ? 'px-2 py-0.5' : size === 'lg' ? 'px-4 py-2' : 'px-3 py-1';
  const textSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-lg' : 'text-sm';

  return (
    <View
      className={`rounded-full ${sizeClass} border`}
      style={{ backgroundColor: colors.bg, borderColor: colors.border }}
    >
      <Text className={`font-body-semibold ${textSize}`} style={{ color: colors.text }}>
        {percentage.toFixed(1)}%
      </Text>
    </View>
  );
}
```

```typescript
// mobile/src/components/common/EmptyState.tsx
import { View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { VITANA_DESIGN_TOKENS } from '@vitana/shared-utils';

interface Props { icon?: string; title: string; subtitle?: string; }

export function EmptyState({ icon = 'inbox', title, subtitle }: Props) {
  return (
    <View className="flex-1 items-center justify-center py-12 px-6">
      <Feather name={icon as any} size={48} color={VITANA_DESIGN_TOKENS.colors.textSecondary} />
      <Text className="font-heading text-lg text-text-primary mt-4 text-center">{title}</Text>
      {subtitle && <Text className="font-body text-text-secondary text-center mt-2">{subtitle}</Text>}
    </View>
  );
}
```

### 6.3 Parent Dashboard Screen

```typescript
// mobile/app/(parent)/index.tsx
import { ScrollView, View, Text, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { parentApi } from '../../src/api/endpoints/parent';
import { useAuthStore } from '../../src/stores/authStore';
import { useSchoolStore } from '../../src/stores/schoolStore';
import { AttendanceBadge } from '../../src/components/common/AttendanceBadge';
import { SkeletonLoader } from '../../src/components/common/SkeletonLoader';
import { formatINR, formatRelativeTime, VITANA_DESIGN_TOKENS } from '@vitana/shared-utils';
import { useState } from 'react';

export default function ParentDashboard() {
  const { user } = useAuthStore();
  const { branding } = useSchoolStore();
  const primaryColor = branding?.primaryColor ?? VITANA_DESIGN_TOKENS.colors.primary;
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['parent-dashboard'],
    queryFn: parentApi.getDashboard,
    staleTime: 5 * 60 * 1000,
  });

  const children = data?.children ?? [];
  const activeChildId = selectedChildId ?? data?.selectedChildId ?? children[0]?.id;
  const activeChild = children.find((c: any) => c.id === activeChildId);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View
        className="px-4 pt-2 pb-4 flex-row items-center justify-between"
        style={{ backgroundColor: primaryColor }}
      >
        <View className="flex-row items-center">
          {branding?.logoUrl ? (
            <Image source={{ uri: branding.logoUrl }} style={{ width: 32, height: 32, borderRadius: 8 }} contentFit="contain" />
          ) : null}
          <Text className="text-white font-heading text-base ml-2">{branding?.schoolName}</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/(parent)/notifications/')}
          className="relative"
        >
          <Feather name="bell" size={22} color="white" />
          {data?.unreadNotificationCount > 0 && (
            <View className="absolute -top-1 -right-1 bg-danger rounded-full w-4 h-4 items-center justify-center">
              <Text className="text-white text-xs font-body-bold">
                {data.unreadNotificationCount > 9 ? '9+' : data.unreadNotificationCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <View className="px-4 pt-4 pb-8">
          <Text className="font-body text-text-secondary">{greeting},</Text>
          <Text className="font-heading text-xl text-text-primary">{user?.fullName?.split(' ')[0]}</Text>

          {/* Child Switcher */}
          {children.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4 -mx-4 px-4">
              <View className="flex-row gap-3">
                {children.map((child: any) => (
                  <TouchableOpacity
                    key={child.id}
                    onPress={() => setSelectedChildId(child.id)}
                    className="items-center"
                  >
                    <View
                      className="w-14 h-14 rounded-full border-3 overflow-hidden"
                      style={{ borderColor: child.id === activeChildId ? primaryColor : '#e2e8f0', borderWidth: 3 }}
                    >
                      {child.photoUrl ? (
                        <Image source={{ uri: child.photoUrl }} style={{ width: 50, height: 50 }} contentFit="cover" />
                      ) : (
                        <View className="w-14 h-14 bg-surface items-center justify-center">
                          <Text className="font-heading text-lg text-text-secondary">{child.name[0]}</Text>
                        </View>
                      )}
                    </View>
                    <Text className="font-body text-xs text-text-secondary mt-1 text-center w-16" numberOfLines={1}>
                      {child.name.split(' ')[0]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}

          {/* Active Child Info */}
          {isLoading ? (
            <View className="bg-surface rounded-xl p-4 mt-4 space-y-2">
              <SkeletonLoader height={20} width="60%" />
              <SkeletonLoader height={16} width="40%" />
            </View>
          ) : activeChild ? (
            <View className="bg-surface rounded-xl p-4 mt-4 flex-row items-center">
              <View className="flex-1">
                <Text className="font-heading text-base text-text-primary">{activeChild.name}</Text>
                <Text className="font-body text-text-secondary text-sm">
                  {activeChild.className} · Roll No. {activeChild.rollNumber}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Today's Attendance Card */}
          <TouchableOpacity
            className="bg-white border border-border rounded-xl p-4 mt-3"
            onPress={() => router.push(`/(parent)/attendance/${activeChildId}`)}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="font-body text-text-secondary text-xs uppercase tracking-wide">Today's Attendance</Text>
                <View className="flex-row items-center mt-1">
                  {isLoading ? (
                    <SkeletonLoader width={80} height={24} borderRadius={12} />
                  ) : (
                    <View
                      className="px-3 py-1 rounded-full"
                      style={{
                        backgroundColor: data?.todayAttendance?.status === 'Present' ? '#dcfce7'
                          : data?.todayAttendance?.status === 'Absent' ? '#fee2e2' : '#f3f4f6',
                      }}
                    >
                      <Text
                        className="font-body-semibold text-sm"
                        style={{
                          color: data?.todayAttendance?.status === 'Present' ? '#16a34a'
                            : data?.todayAttendance?.status === 'Absent' ? '#dc2626' : '#6b7280',
                        }}
                      >
                        {data?.todayAttendance?.status ?? 'Not marked'}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <Feather name="chevron-right" size={18} color={VITANA_DESIGN_TOKENS.colors.textSecondary} />
            </View>
          </TouchableOpacity>

          {/* Fee Card */}
          <TouchableOpacity
            className="bg-white border border-border rounded-xl p-4 mt-3"
            onPress={() => router.push('/(parent)/fees/')}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="font-body text-text-secondary text-xs uppercase tracking-wide">Outstanding Fees</Text>
                {isLoading ? (
                  <SkeletonLoader width={120} height={28} borderRadius={4} className="mt-1" />
                ) : (
                  <Text className="font-heading text-xl text-text-primary mt-1">
                    {data?.feeSummary ? formatINR(data.feeSummary.pendingAmount) : '—'}
                  </Text>
                )}
              </View>
              <View className="flex-row items-center gap-2">
                {data?.feeSummary?.pendingAmount > 0 && (
                  <View
                    className="px-3 py-1.5 rounded-lg"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Text className="font-body-semibold text-white text-xs">Pay Now</Text>
                  </View>
                )}
                <Feather name="chevron-right" size={18} color={VITANA_DESIGN_TOKENS.colors.textSecondary} />
              </View>
            </View>
          </TouchableOpacity>

          {/* Latest Result Card */}
          {data?.latestResult && (
            <TouchableOpacity
              className="bg-white border border-border rounded-xl p-4 mt-3"
              onPress={() => router.push(`/(parent)/results/${activeChildId}`)}
              activeOpacity={0.7}
            >
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="font-body text-text-secondary text-xs uppercase tracking-wide">Latest Result</Text>
                  <Text className="font-body-medium text-text-primary mt-1">{data.latestResult.examName}</Text>
                  <Text className="font-body text-text-secondary text-sm">
                    {data.latestResult.percentage.toFixed(1)}% · Grade {data.latestResult.grade}
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color={VITANA_DESIGN_TOKENS.colors.textSecondary} />
              </View>
            </TouchableOpacity>
          )}

          {/* Latest Announcement */}
          {data?.latestAnnouncement && (
            <TouchableOpacity
              className="bg-white border border-border rounded-xl p-4 mt-3"
              onPress={() => router.push(`/(parent)/announcements/${data.latestAnnouncement.id}`)}
              activeOpacity={0.7}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1 mr-3">
                  <Text className="font-body text-text-secondary text-xs uppercase tracking-wide">Latest Announcement</Text>
                  <Text className="font-body-medium text-text-primary mt-1" numberOfLines={1}>
                    {data.latestAnnouncement.title}
                  </Text>
                  <Text className="font-body text-text-secondary text-xs mt-0.5">
                    {formatRelativeTime(data.latestAnnouncement.publishedAt)}
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color={VITANA_DESIGN_TOKENS.colors.textSecondary} />
              </View>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
```

### 6.4 Attendance Calendar Screen

```typescript
// mobile/app/(parent)/attendance/[studentId].tsx
import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { parentApi } from '../../../src/api/endpoints/parent';
import { AttendanceBadge } from '../../../src/components/common/AttendanceBadge';
import { SkeletonLoader } from '../../../src/components/common/SkeletonLoader';
import { VITANA_DESIGN_TOKENS } from '@vitana/shared-utils';
import { useSchoolStore } from '../../../src/stores/schoolStore';

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const STATUS_COLORS = {
  Present:  { bg: '#dcfce7', border: '#16a34a', text: '#16a34a' },
  Absent:   { bg: '#fee2e2', border: '#ef4444', text: '#ef4444' },
  Late:     { bg: '#fef3c7', border: '#f59e0b', text: '#d97706' },
  Holiday:  { bg: '#f1f5f9', border: '#cbd5e1', text: '#94a3b8' },
  Weekend:  { bg: '#f8fafc', border: '#e2e8f0', text: '#cbd5e1' },
  Future:   { bg: '#f8fafc', border: '#f1f5f9', text: '#f1f5f9' },
};

export default function AttendanceCalendar() {
  const { studentId } = useLocalSearchParams<{ studentId: string }>();
  const { branding } = useSchoolStore();
  const primaryColor = branding?.primaryColor ?? VITANA_DESIGN_TOKENS.colors.primary;

  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);
  const [viewYear, setViewYear] = useState(today.getFullYear());

  const { data, isLoading } = useQuery({
    queryKey: ['attendance', studentId, viewMonth, viewYear],
    queryFn: () => parentApi.getAttendance(studentId!, viewMonth, viewYear),
    staleTime: 10 * 60 * 1000,
    enabled: !!studentId,
  });

  function navigateMonth(direction: -1 | 1) {
    const date = new Date(viewYear, viewMonth - 1 + direction);
    setViewMonth(date.getMonth() + 1);
    setViewYear(date.getFullYear());
  }

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth - 1, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to complete rows
  while (cells.length % 7 !== 0) cells.push(null);

  const recordMap = new Map(
    (data?.records ?? []).map((r: any) => [new Date(r.date).getDate(), r.status])
  );

  const monthName = new Date(viewYear, viewMonth - 1).toLocaleString('en-IN', {
    month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata',
  });

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 pt-4 pb-8">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-4">
            <Text className="font-heading text-xl text-text-primary">Attendance</Text>
            {data && (
              <AttendanceBadge percentage={data.attendancePercent} size="md" />
            )}
          </View>

          {/* Month Navigator */}
          <View className="flex-row items-center justify-between bg-surface rounded-xl px-4 py-3 mb-4">
            <TouchableOpacity onPress={() => navigateMonth(-1)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Feather name="chevron-left" size={20} color={primaryColor} />
            </TouchableOpacity>
            <Text className="font-body-semibold text-text-primary">{monthName}</Text>
            <TouchableOpacity
              onPress={() => navigateMonth(1)}
              disabled={viewMonth === today.getMonth() + 1 && viewYear === today.getFullYear()}
            >
              <Feather
                name="chevron-right" size={20}
                color={viewMonth === today.getMonth() + 1 && viewYear === today.getFullYear()
                  ? VITANA_DESIGN_TOKENS.colors.border : primaryColor}
              />
            </TouchableOpacity>
          </View>

          {/* Calendar Grid */}
          {isLoading ? (
            <SkeletonLoader height={280} borderRadius={12} />
          ) : (
            <View className="bg-white border border-border rounded-xl overflow-hidden">
              {/* Day Headers */}
              <View className="flex-row border-b border-border">
                {DAYS.map((d, i) => (
                  <View key={i} className="flex-1 items-center py-2">
                    <Text className="font-body-semibold text-xs text-text-secondary">{d}</Text>
                  </View>
                ))}
              </View>
              {/* Calendar Rows */}
              {Array.from({ length: cells.length / 7 }, (_, row) => (
                <View key={row} className="flex-row">
                  {cells.slice(row * 7, row * 7 + 7).map((day, col) => {
                    if (day === null) {
                      return <View key={col} className="flex-1 p-1" style={{ aspectRatio: 1 }} />;
                    }
                    const status = recordMap.get(day) ?? 'Future';
                    const colors = STATUS_COLORS[status as keyof typeof STATUS_COLORS] ?? STATUS_COLORS.Future;
                    const isToday = day === today.getDate() && viewMonth === today.getMonth() + 1 && viewYear === today.getFullYear();

                    return (
                      <View key={col} className="flex-1 p-1" style={{ aspectRatio: 1 }}>
                        <View
                          className="flex-1 rounded-lg items-center justify-center border"
                          style={{
                            backgroundColor: colors.bg,
                            borderColor: isToday ? primaryColor : colors.border,
                            borderWidth: isToday ? 2 : 1,
                          }}
                        >
                          <Text className="font-body text-xs" style={{ color: colors.text }}>
                            {day}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          )}

          {/* Legend */}
          <View className="flex-row flex-wrap gap-3 mt-4">
            {[
              { label: 'Present', color: '#16a34a', bg: '#dcfce7' },
              { label: 'Absent',  color: '#ef4444', bg: '#fee2e2' },
              { label: 'Late',    color: '#d97706', bg: '#fef3c7' },
              { label: 'Holiday', color: '#94a3b8', bg: '#f1f5f9' },
            ].map(({ label, color, bg }) => (
              <View key={label} className="flex-row items-center gap-1.5">
                <View className="w-3 h-3 rounded-sm border" style={{ backgroundColor: bg, borderColor: color }} />
                <Text className="font-body text-xs text-text-secondary">{label}</Text>
              </View>
            ))}
          </View>

          {/* Summary Stats */}
          {data && (
            <View className="bg-surface rounded-xl p-4 mt-4">
              <Text className="font-body-medium text-text-primary mb-3">Month Summary</Text>
              <View className="flex-row justify-between">
                {[
                  { label: 'Present', value: data.presentDays, color: '#16a34a' },
                  { label: 'Absent',  value: data.absentDays,  color: '#ef4444' },
                  { label: 'Late',    value: data.lateDays,    color: '#d97706' },
                  { label: 'Working', value: data.totalWorkingDays, color: VITANA_DESIGN_TOKENS.colors.textSecondary },
                ].map(({ label, value, color }) => (
                  <View key={label} className="items-center">
                    <Text className="font-heading text-xl" style={{ color }}>{value}</Text>
                    <Text className="font-body text-xs text-text-secondary mt-0.5">{label}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Shortage Alert */}
          {data && data.attendancePercent < 75 && (
            <View className="bg-danger/10 border border-danger/30 rounded-xl p-4 mt-3 flex-row items-start">
              <Feather name="alert-triangle" size={16} color={VITANA_DESIGN_TOKENS.colors.danger} />
              <View className="ml-2 flex-1">
                <Text className="font-body-semibold text-danger text-sm">Attendance Shortage</Text>
                <Text className="font-body text-danger text-xs mt-0.5">
                  Attendance is below the required 75%. Please ensure regular attendance.
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
```

### 6.5 Fee Summary Screen

```typescript
// mobile/app/(parent)/fees/index.tsx
import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { parentApi } from '../../../src/api/endpoints/parent';
import { useAuthStore } from '../../../src/stores/authStore';
import { useSchoolStore } from '../../../src/stores/schoolStore';
import { SkeletonLoader } from '../../../src/components/common/SkeletonLoader';
import { EmptyState } from '../../../src/components/common/EmptyState';
import { formatINR, formatDateIST, VITANA_DESIGN_TOKENS } from '@vitana/shared-utils';
import NetInfo from '@react-native-community/netinfo';
import { useEffect } from 'react';

export default function FeesSummary() {
  const { user } = useAuthStore();
  const { branding, mobileFeatureFlags } = useSchoolStore();
  const primaryColor = branding?.primaryColor ?? VITANA_DESIGN_TOKENS.colors.primary;
  const [isConnected, setIsConnected] = useState(true);

  // Parent's first linked student (from JWT linkedEntityId = guardianId → get children)
  const { data: children } = useQuery({
    queryKey: ['my-children'],
    queryFn: parentApi.getMyChildren,
  });
  const studentId = children?.[0]?.id;

  const { data: feeRecord, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['fees', studentId],
    queryFn: () => parentApi.getFeeRecords(studentId!),
    enabled: !!studentId,
    staleTime: 10 * 60 * 1000,
  });

  const { data: paymentHistory } = useQuery({
    queryKey: ['payment-history', studentId],
    queryFn: () => parentApi.getPaymentHistory(studentId!),
    enabled: !!studentId,
  });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => setIsConnected(!!state.isConnected));
    return unsubscribe;
  }, []);

  const canPay = mobileFeatureFlags?.['mobile.fees.online_payment'] && isConnected;

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="px-4 pt-4 space-y-3">
          <SkeletonLoader height={100} borderRadius={12} />
          <SkeletonLoader height={200} borderRadius={12} />
        </View>
      </SafeAreaView>
    );
  }

  if (!feeRecord) {
    return <SafeAreaView className="flex-1 bg-background"><EmptyState icon="dollar-sign" title="No fee record found" /></SafeAreaView>;
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <View className="px-4 pt-4 pb-8">
          <Text className="font-heading text-xl text-text-primary mb-4">Fee Summary</Text>

          {/* Outstanding Amount Card */}
          <View
            className="rounded-xl p-5 mb-4"
            style={{ backgroundColor: primaryColor }}
          >
            <Text className="font-body text-white/70 text-sm">Outstanding Balance</Text>
            <Text className="font-heading text-3xl text-white mt-1">
              {formatINR(feeRecord.pendingAmount)}
            </Text>
            {feeRecord.lateFeeAmount > 0 && (
              <Text className="font-body text-white/70 text-xs mt-1">
                Includes {formatINR(feeRecord.lateFeeAmount)} late fee
              </Text>
            )}
            <View className="flex-row mt-4 gap-3">
              <View className="flex-1">
                <Text className="font-body text-white/70 text-xs">Total</Text>
                <Text className="font-body-semibold text-white">{formatINR(feeRecord.totalAmount)}</Text>
              </View>
              <View className="flex-1">
                <Text className="font-body text-white/70 text-xs">Paid</Text>
                <Text className="font-body-semibold text-white">{formatINR(feeRecord.paidAmount)}</Text>
              </View>
            </View>
          </View>

          {/* Pay Now Button */}
          {feeRecord.pendingAmount > 0 && (
            <TouchableOpacity
              onPress={() => canPay ? router.push('/(parent)/fees/pay') : null}
              disabled={!canPay}
              className="rounded-xl py-4 items-center mb-4"
              style={{ backgroundColor: canPay ? primaryColor : VITANA_DESIGN_TOKENS.colors.border }}
            >
              <Text className="font-body-semibold text-white text-base">
                {canPay ? 'Pay Online' : isConnected ? 'Online payment not available' : 'Offline — Connect to pay'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Fee Head Breakdown */}
          <View className="bg-white border border-border rounded-xl overflow-hidden mb-4">
            <View className="px-4 py-3 border-b border-border">
              <Text className="font-body-semibold text-text-primary">Fee Breakdown</Text>
            </View>
            {feeRecord.feeHeads.map((head: any, index: number) => (
              <View
                key={head.feeHeadId}
                className={`px-4 py-3 flex-row items-center justify-between ${
                  index < feeRecord.feeHeads.length - 1 ? 'border-b border-border' : ''
                }`}
              >
                <View className="flex-1">
                  <Text className="font-body-medium text-text-primary text-sm">{head.feeHeadName}</Text>
                  {head.isConcession && (
                    <Text className="font-body text-success text-xs">{head.concessionType} concession applied</Text>
                  )}
                </View>
                <View className="items-end">
                  <Text className="font-body-semibold text-text-primary text-sm">{formatINR(head.amount)}</Text>
                  {head.pendingAmount > 0 && (
                    <Text className="font-body text-danger text-xs">{formatINR(head.pendingAmount)} pending</Text>
                  )}
                </View>
              </View>
            ))}
          </View>

          {/* Payment History */}
          {paymentHistory && paymentHistory.length > 0 && (
            <View className="bg-white border border-border rounded-xl overflow-hidden">
              <View className="px-4 py-3 border-b border-border">
                <Text className="font-body-semibold text-text-primary">Payment History</Text>
              </View>
              {paymentHistory.slice(0, 5).map((payment: any, index: number) => (
                <TouchableOpacity
                  key={payment.id}
                  className={`px-4 py-3 flex-row items-center justify-between ${
                    index < Math.min(paymentHistory.length, 5) - 1 ? 'border-b border-border' : ''
                  }`}
                  onPress={() => router.push(`/(parent)/fees/receipt/${payment.id}`)}
                >
                  <View>
                    <Text className="font-body-medium text-text-primary text-sm">
                      {formatINR(payment.amount)}
                    </Text>
                    <Text className="font-body text-text-secondary text-xs">
                      {formatDateIST(payment.paymentDate)} · {payment.paymentMode}
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <Text className="font-body text-text-secondary text-xs mr-1">#{payment.receiptNumber}</Text>
                    <Feather name="chevron-right" size={14} color={VITANA_DESIGN_TOKENS.colors.textSecondary} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
```

### 6.6 Payment Initiation Screen

```typescript
// mobile/app/(parent)/fees/pay.tsx
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import * as ScreenCapture from 'expo-screen-capture';
import { parentApi } from '../../../src/api/endpoints/parent';
import { useSchoolStore } from '../../../src/stores/schoolStore';
import { formatINR, VITANA_DESIGN_TOKENS } from '@vitana/shared-utils';
import { useEffect } from 'react';
import { queryClient } from '../../../src/api/queryClient';

export default function PayFees() {
  const { branding } = useSchoolStore();
  const primaryColor = branding?.primaryColor ?? VITANA_DESIGN_TOKENS.colors.primary;

  const { data: children } = useQuery({ queryKey: ['my-children'], queryFn: parentApi.getMyChildren });
  const studentId = children?.[0]?.id;
  const { data: feeRecord } = useQuery({
    queryKey: ['fees', studentId],
    queryFn: () => parentApi.getFeeRecords(studentId!),
    enabled: !!studentId,
  });

  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (feeRecord?.pendingAmount) {
      setAmount(feeRecord.pendingAmount.toString());
    }
  }, [feeRecord?.pendingAmount]);

  // Prevent screenshots during payment
  useEffect(() => {
    ScreenCapture.preventScreenCaptureAsync();
    return () => { ScreenCapture.allowScreenCaptureAsync(); };
  }, []);

  const initiateMutation = useMutation({
    mutationFn: ({ studentId, amount }: { studentId: string; amount: number }) =>
      parentApi.initiateMobilePayment(studentId, amount),
    onSuccess: async (data) => {
      // Open Cashfree hosted checkout in system browser
      // Deep link return URL: vitanasms://fees/pay/result?orderId=X
      const cashfreeUrl = `https://payments.cashfree.com/order/#${data.paymentSessionId}`;
      const result = await WebBrowser.openAuthSessionAsync(
        cashfreeUrl,
        'vitanasms://fees/pay/result'
      );

      if (result.type === 'success' && result.url) {
        const urlParams = new URL(result.url).searchParams;
        const orderId = urlParams.get('orderId') ?? data.cfOrderId;
        const paymentId = urlParams.get('paymentId') ?? '';

        try {
          await parentApi.verifyPayment(orderId, paymentId);
          queryClient.invalidateQueries({ queryKey: ['fees', studentId] });
          queryClient.invalidateQueries({ queryKey: ['payment-history', studentId] });
          queryClient.invalidateQueries({ queryKey: ['parent-dashboard'] });
          router.replace('/(parent)/fees/success');
        } catch {
          router.replace('/(parent)/fees/failed');
        }
      } else if (result.type === 'cancel') {
        router.back();
      }
    },
    onError: () => {
      Alert.alert('Payment Error', 'Could not initiate payment. Please try again.');
    },
  });

  const parsedAmount = parseFloat(amount) || 0;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-6 pt-6">
        <Text className="font-heading text-xl text-text-primary mb-6">Pay Fees</Text>

        <View className="bg-surface rounded-xl p-4 mb-6">
          <Text className="font-body text-text-secondary text-sm mb-1">Student</Text>
          <Text className="font-body-semibold text-text-primary">{children?.[0]?.name}</Text>
          <Text className="font-body text-text-secondary text-sm mt-0.5">{children?.[0]?.className}</Text>
        </View>

        <View className="mb-6">
          <Text className="font-body-medium text-text-primary mb-2">Amount (₹)</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            className="border border-border rounded-xl px-4 py-3.5 font-body text-text-primary bg-white text-lg"
            placeholder="0"
          />
          {feeRecord && (
            <TouchableOpacity onPress={() => setAmount(feeRecord.pendingAmount.toString())}>
              <Text className="font-body text-sm mt-1" style={{ color: primaryColor }}>
                Pay full amount: {formatINR(feeRecord.pendingAmount)}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View className="bg-info/10 border border-info/30 rounded-xl p-4 mb-6 flex-row">
          <Text className="text-base mr-2">🔒</Text>
          <Text className="font-body text-info text-sm flex-1">
            Your payment is secured by Cashfree. UPI, Cards, and Netbanking accepted.
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => initiateMutation.mutate({ studentId: studentId!, amount: parsedAmount })}
          disabled={initiateMutation.isPending || parsedAmount <= 0}
          className="rounded-xl py-4 items-center"
          style={{
            backgroundColor: parsedAmount > 0 ? primaryColor : VITANA_DESIGN_TOKENS.colors.border,
          }}
        >
          {initiateMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="font-body-semibold text-white text-base">
              Pay {parsedAmount > 0 ? formatINR(parsedAmount) : '—'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()} className="items-center mt-4">
          <Text className="font-body text-text-secondary">Cancel</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
```

### 6.7 Leave Application with Offline Queue

```typescript
// mobile/app/(parent)/leaves/apply.tsx
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { generateUUID } from '@vitana/shared-utils';
import { parentApi } from '../../../src/api/endpoints/parent';
import { useSchoolStore } from '../../../src/stores/schoolStore';
import { VITANA_DESIGN_TOKENS } from '@vitana/shared-utils';
import { useEffect, useState } from 'react';

const schema = z.object({
  fromDate: z.string().min(1, 'From date required'),
  toDate:   z.string().min(1, 'To date required'),
  reason:   z.string().min(10, 'Please provide a reason (min 10 characters)').max(500),
});
type FormData = z.infer<typeof schema>;

export default function ApplyLeave() {
  const { branding } = useSchoolStore();
  const primaryColor = branding?.primaryColor ?? VITANA_DESIGN_TOKENS.colors.primary;
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const unsub = NetInfo.addEventListener(state => setIsConnected(!!state.isConnected));
    return unsub;
  }, []);

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: async (data: FormData & { studentId: string }) => {
      if (isConnected) {
        return parentApi.applyLeave(data);
      } else {
        // Queue offline
        // Import the db in PROMPT-12 when SQLite is set up
        // For now, store in AsyncStorage as a simple queue
        const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
        const existingQueue = JSON.parse(await AsyncStorage.getItem('offline_leave_queue') || '[]');
        existingQueue.push({
          id: generateUUID(),
          method: 'POST',
          endpoint: '/leavemanagement/student-leave',
          body: data,
          createdAt: Date.now(),
        });
        await AsyncStorage.setItem('offline_leave_queue', JSON.stringify(existingQueue));
        return { queued: true };
      }
    },
    onSuccess: (result: any) => {
      const message = result?.queued
        ? 'Leave request saved. Will be submitted when you reconnect.'
        : 'Leave request submitted successfully.';
      alert(message);
      router.back();
    },
  });

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-6 pt-4">
        <Text className="font-heading text-xl text-text-primary mb-6">Apply for Leave</Text>

        {!isConnected && (
          <View className="bg-warning/10 border border-warning/30 rounded-xl px-4 py-3 mb-4 flex-row items-center">
            <Feather name="wifi-off" size={16} color={VITANA_DESIGN_TOKENS.colors.warning} />
            <Text className="font-body text-warning text-sm ml-2">
              Offline — request will be saved and submitted later
            </Text>
          </View>
        )}

        <View className="flex-row gap-4 mb-4">
          <View className="flex-1">
            <Text className="font-body-medium text-text-primary mb-1.5">From Date</Text>
            <Controller
              control={control} name="fromDate"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  value={value} onChangeText={onChange}
                  placeholder="YYYY-MM-DD"
                  className={`border rounded-xl px-4 py-3.5 font-body text-text-primary bg-surface ${errors.fromDate ? 'border-danger' : 'border-border'}`}
                />
              )}
            />
          </View>
          <View className="flex-1">
            <Text className="font-body-medium text-text-primary mb-1.5">To Date</Text>
            <Controller
              control={control} name="toDate"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  value={value} onChangeText={onChange}
                  placeholder="YYYY-MM-DD"
                  className={`border rounded-xl px-4 py-3.5 font-body text-text-primary bg-surface ${errors.toDate ? 'border-danger' : 'border-border'}`}
                />
              )}
            />
          </View>
        </View>

        <View className="mb-6">
          <Text className="font-body-medium text-text-primary mb-1.5">Reason</Text>
          <Controller
            control={control} name="reason"
            render={({ field: { onChange, value } }) => (
              <TextInput
                value={value} onChangeText={onChange}
                multiline numberOfLines={4} placeholder="Reason for leave..."
                placeholderTextColor={VITANA_DESIGN_TOKENS.colors.textSecondary}
                textAlignVertical="top"
                className={`border rounded-xl px-4 py-3 font-body text-text-primary bg-surface h-24 ${errors.reason ? 'border-danger' : 'border-border'}`}
              />
            )}
          />
          {errors.reason && <Text className="text-danger text-sm mt-1 font-body">{errors.reason.message}</Text>}
        </View>

        <TouchableOpacity
          onPress={handleSubmit((data) => mutation.mutate({ ...data, studentId: 'will-be-resolved' }))}
          disabled={mutation.isPending}
          className="rounded-xl py-4 items-center"
          style={{ backgroundColor: primaryColor }}
        >
          {mutation.isPending ? <ActivityIndicator color="#fff" /> : (
            <Text className="font-body-semibold text-white text-base">
              {isConnected ? 'Submit Request' : 'Save Offline'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
```

---

## PHASE 7: AI/ML Integration

> Not applicable for the Parent Portal.

---

## PHASE 8: External Integrations

### 8.1 Cashfree Payment Gateway

```bash
# Option A: expo-web-browser (already installed — use this first)
# Opens Cashfree hosted checkout in system browser
# Returns to app via deep link

# Option B: Cashfree React Native SDK (if available and stable)
# cd mobile
# pnpm add @cashfreepayments/cashfree-sdk-reactnative
# Follow: https://docs.cashfree.com/docs/react-native-integration
```

**Deep link setup** for payment return:

```javascript
// app.config.js — add to scheme
scheme: 'vitanasms',
// Expo Router handles the deep link: vitanasms://fees/pay/result?orderId=X
```

```typescript
// mobile/app/(parent)/fees/pay/result.tsx
// Handles deep link return from Cashfree
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect } from 'react';

export default function PaymentResult() {
  const params = useLocalSearchParams();
  useEffect(() => {
    if (params.status === 'SUCCESS') {
      router.replace('/(parent)/fees/success');
    } else {
      router.replace('/(parent)/fees/failed');
    }
  }, []);
  return null;
}
```

---

## PHASE 9: Testing & Validation

### 9.1 Tests

```typescript
// mobile/src/api/endpoints/__tests__/parent.test.ts
import { parentApi } from '../parent';
import apiClient from '../../client';

jest.mock('../../client');
const mockedClient = apiClient as jest.Mocked<typeof apiClient>;

describe('parentApi', () => {
  it('getDashboard calls correct endpoint', async () => {
    mockedClient.get.mockResolvedValueOnce({ children: [], unreadNotificationCount: 0 });
    await parentApi.getDashboard();
    expect(mockedClient.get).toHaveBeenCalledWith('/mobile/parent-dashboard');
  });

  it('getAttendance passes correct params', async () => {
    mockedClient.get.mockResolvedValueOnce({ records: [], attendancePercent: 95 });
    await parentApi.getAttendance('student-1', 6, 2026);
    expect(mockedClient.get).toHaveBeenCalledWith('/attendance/students', {
      params: { studentId: 'student-1', month: 6, year: 2026 },
    });
  });
});
```

### 9.2 Maestro E2E

```yaml
# mobile/maestro/tests/parent_view_attendance.yaml
appId: com.vitana.sms
---
- launchApp
- tapOn: "Attendance"
- assertVisible: "Attendance"
- assertVisible: "%"  # attendance percentage shown
- tapOn: "←"  # previous month
- assertVisible: "Attendance"
```

```yaml
# mobile/maestro/tests/parent_apply_leave.yaml
appId: com.vitana.sms
---
- launchApp
- tapOn: "More"
- tapOn: "Leaves"
- tapOn: "Apply for Leave"
- tapOn: "From Date"
- inputText: "2026-07-01"
- tapOn: "To Date"
- inputText: "2026-07-02"
- tapOn: "Reason"
- inputText: "Family function attendance"
- tapOn: "Submit Request"
- assertVisible: "submitted successfully"
```

### 9.3 Validation Checklist

- [ ] Parent dashboard loads with correct child data
- [ ] Child switcher switches data when tapped (multi-child parent)
- [ ] Attendance calendar shows correct P/A/L colors
- [ ] Shortage alert shown when attendance < 75%
- [ ] Fee summary shows correct pending amount
- [ ] "Pay Online" disabled when offline
- [ ] Cashfree payment opens (test with sandbox credentials)
- [ ] Payment receipt opens PDF in browser
- [ ] Exam results show subject-wise marks
- [ ] Announcements load with infinite scroll
- [ ] Leave form validates from/to date and reason
- [ ] Leave queues offline and submits when reconnected
- [ ] Notification bell shows unread count
- [ ] All loading states show skeletons (not blank screens)

---

## PHASE 10: Documentation & Verification

### Verification Commands

```bash
pnpm --filter @vitana/mobile typecheck
pnpm --filter @vitana/mobile lint
pnpm --filter @vitana/mobile test
pnpm --filter @vitana/mobile start
# Test on physical Android + iOS simulator with demo credentials
```

### Git Commit

```bash
git add .
git commit -m "feat(mobile/parent): complete parent portal

- Dashboard with child switcher, attendance, fees, results, announcements
- Monthly attendance calendar heatmap with P/A/L color coding
- Fee summary with breakdown by fee head + online payment (Cashfree)
- Exam results list with subject-wise marks + report card PDF
- Announcements infinite scroll feed
- Class diary entries
- Leave application with offline queue support
- Notification center
- SkeletonLoader, AttendanceBadge, EmptyState reusable components

Next: PROMPT-08 (Student Portal) or PROMPT-04 (Teacher Portal)"
```

---

**END OF PROMPT-03**
