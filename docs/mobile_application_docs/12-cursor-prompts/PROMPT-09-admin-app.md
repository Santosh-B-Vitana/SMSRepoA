# PROMPT-09: Admin & Principal Portal

> **Version**: 2.0 — Full 10-Phase Anatomy  
> **Epic**: EP-13 — Admin Portal  
> **Sprint**: 14 (Weeks 27–28)  
> **Story Points**: 24  
> **Prerequisites**: PROMPT-01 ✓, PROMPT-02 ✓, PROMPT-10 ✓ (feature flags for dynamic nav)  
> **Backend Dependency**: `GET /api/mobile/admin-dashboard` (PROMPT-11D)  
> **Runs in parallel with**: PROMPT-13 (Teacher Marks Entry) — different engineer

---

## PHASE 1: Context & Scope

> **ONE APP — ADMIN PORTAL:** This prompt builds the `(admin)` route group inside the single Vitana SMS app binary. It is **not** a separate app. Users with roles `Admin`, `Principal`, `HRManager`, and `Accountant` are routed here after login. The same `com.vitana.sms` binary serves all roles.

### What We're Building

The Admin/Principal Portal — designed for executive decision-making on the go. Admins use this to approve leaves, post announcements, check KPIs, and monitor school health without opening the web portal.

**Capabilities:**
- Admin dashboard (school-wide KPIs for the day)
- Leave approvals (staff + student, bulk approve)
- Create and broadcast announcements
- Analytics overview (attendance trend, fee collection charts)
- Quick student + staff search
- Billing status alert
- Notification center

### Current State

- ✅ Auth + navigation skeleton
- ✅ Feature flags via PROMPT-10 (dynamic nav)
- ✅ `useAppTheme()` for consistent colors
- ❌ All admin screens empty

### Success Criteria

- [ ] Dashboard KPIs load < 2s
- [ ] Pending approval count badge visible on Approvals tab
- [ ] Staff leave approval sends push notification to staff member
- [ ] Reject requires mandatory reason (form validation)
- [ ] Announcement form validates required fields before posting
- [ ] Urgent announcement shows confirmation dialog with recipient count
- [ ] Analytics charts render without crash on empty data
- [ ] Student/staff search results appear with 300ms debounce
- [ ] Billing alert shown when subscription < 30 days remaining

---

## PHASE 2: Analysis Phase

### Read First

```bash
docs/mobile_application_docs/epics/EP-13-admin-app.md
```

### API Contracts

```
GET /api/mobile/admin-dashboard       → { todayAttendanceRate, todayFeeCollection, pendingApprovals, billingAlert }
GET /api/attendance/stats             → { presentCount, absentCount, percent, markedClassCount, totalClassCount }
GET /api/fees/stats                   → { collectedToday, collectedThisMonth, targetThisMonth }
GET /api/leavemanagement/leave-requests?status=pending&type=staff  → LeaveRequest[]
GET /api/leavemanagement/leave-requests?status=pending&type=student → LeaveRequest[]
PUT /api/leavemanagement/leave-requests/{id}/approve → { remark?: string }
PUT /api/leavemanagement/leave-requests/{id}/reject  → { reason: string }
POST /api/announcements               → CreateAnnouncementRequest
GET /api/announcements                → PaginatedResponse<Announcement>
PUT /api/announcements/{id}           → Update
DELETE /api/announcements/{id}        → {}
GET /api/analytics/dashboard          → AnalyticsDashboard
GET /api/students?search=X&page=1&pageSize=10 → PaginatedResponse<Student>
GET /api/staff?search=X&page=1&pageSize=10    → PaginatedResponse<StaffMember>
```

---

## PHASE 3: Technical Planning

### Screen Map

```
mobile/app/(admin)/
├── _layout.tsx              ← Tabs: Dashboard | Approvals [badge] | Post | Reports | More
├── index.tsx                ← Admin Dashboard
├── approvals/
│   ├── index.tsx            ← Tabs: Staff Leave | Student Leave
│   └── _layout.tsx
├── announcements/
│   ├── index.tsx            ← My announcements list
│   └── create.tsx           ← Create announcement form
├── reports/
│   └── index.tsx            ← Analytics charts
└── more.tsx                 ← Student search, staff search, settings, notifications
```

---

## PHASE 4: Database Design

> No SQLite changes. Admin portal is primarily read-only with approval mutations.

---

## PHASE 5: Backend Implementation

### Admin Dashboard

```csharp
[HttpGet("admin-dashboard")]
[Authorize(Roles = "Admin,Principal")]
public async Task<IActionResult> GetAdminDashboard()
{
    var today = DateOnly.FromDateTime(DateTime.UtcNow);

    var (attendanceStats, feeStats, pendingLeaveCount, billingInfo) = await (
        _attendanceService.GetSchoolWideTodayStatsAsync(),
        _feeService.GetTodayCollectionStatsAsync(),
        _leaveManagementService.GetPendingCountAsync(),
        _schoolFeaturePermissionService.GetBillingStatusAsync(_schoolId)
    );

    string? billingAlert = null;
    if (billingInfo?.ExpiryDate != null)
    {
        var daysUntilExpiry = (billingInfo.ExpiryDate.Value - DateTime.UtcNow).Days;
        if (daysUntilExpiry <= 30)
            billingAlert = daysUntilExpiry <= 0
                ? "Subscription has expired. Please renew immediately."
                : $"Subscription expires in {daysUntilExpiry} days. Please renew.";
    }

    return Ok(new {
        todayAttendanceRate = attendanceStats.AttendancePercent,
        markedClasses = attendanceStats.MarkedClassCount,
        totalClasses = attendanceStats.TotalClassCount,
        todayFeeCollection = feeStats.CollectedToday,
        monthFeeCollection = feeStats.CollectedThisMonth,
        pendingApprovals = pendingLeaveCount,
        billingAlert,
        unreadNotificationCount = await _notificationService.GetUnreadCountAsync(_userId)
    });
}
```

---

## PHASE 6: Mobile Implementation

### 6.1 Admin API Layer

```typescript
// mobile/src/api/endpoints/admin.ts
import apiClient from '../client';

export const adminApi = {
  getDashboard: () => apiClient.get('/mobile/admin-dashboard'),
  getAttendanceStats: () => apiClient.get('/attendance/stats'),
  getFeeStats: () => apiClient.get('/fees/stats'),

  getPendingLeaves: (type: 'staff' | 'student') =>
    apiClient.get('/leavemanagement/leave-requests', { params: { status: 'pending', type } }),

  approveLeave: (id: string, remark?: string) =>
    apiClient.put(`/leavemanagement/leave-requests/${id}/approve`, { remark }),

  rejectLeave: (id: string, reason: string) =>
    apiClient.put(`/leavemanagement/leave-requests/${id}/reject`, { reason }),

  createAnnouncement: (data: {
    title: string; body: string; priority: string; audience: string;
    classIds?: string[]; expiresAt?: string;
  }) => apiClient.post('/announcements', data),

  getMyAnnouncements: (page = 1) =>
    apiClient.get('/announcements', { params: { page, pageSize: 20 } }),

  deleteAnnouncement: (id: string) => apiClient.delete(`/announcements/${id}`),

  getAnalytics: () => apiClient.get('/analytics/dashboard'),

  searchStudents: (query: string, page = 1) =>
    apiClient.get('/students', { params: { search: query, page, pageSize: 15 } }),

  searchStaff: (query: string, page = 1) =>
    apiClient.get('/staff', { params: { search: query, page, pageSize: 15 } }),
};
```

### 6.2 Admin Dashboard

```typescript
// mobile/app/(admin)/index.tsx
import { ScrollView, View, Text, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { adminApi } from '../../src/api/endpoints/admin';
import { useAuthStore } from '../../src/stores/authStore';
import { useAppTheme } from '../../src/theme/SchoolThemeProvider';
import { SkeletonLoader } from '../../src/components/common/SkeletonLoader';
import { formatINR, VITANA_DESIGN_TOKENS } from '@vitana/shared-utils';

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const { colors, schoolName } = useAppTheme();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: adminApi.getDashboard,
    staleTime: 3 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000, // auto-refresh every 5 min
  });

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata',
  });

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="px-4 pt-2 pb-3" style={{ backgroundColor: colors.primary }}>
        <View className="flex-row items-center justify-between">
          <Text className="text-white font-heading text-base">{schoolName}</Text>
          <TouchableOpacity onPress={() => router.push('/(admin)/notifications/')}>
            <View className="relative">
              <Feather name="bell" size={22} color="white" />
              {data?.unreadNotificationCount > 0 && (
                <View className="absolute -top-1 -right-1 bg-danger rounded-full w-4 h-4 items-center justify-center">
                  <Text className="text-white text-xs font-body-bold">{data.unreadNotificationCount}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
        <Text className="text-white/80 font-body text-xs mt-1">{today}</Text>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <View className="px-4 pt-4 pb-8">
          {/* Billing Alert */}
          {data?.billingAlert && (
            <TouchableOpacity
              className="bg-danger/10 border border-danger/30 rounded-xl p-4 mb-4 flex-row items-start"
              onPress={() => router.push('/(admin)/more/')}
            >
              <Feather name="alert-triangle" size={18} color={VITANA_DESIGN_TOKENS.colors.danger} />
              <Text className="font-body-medium text-danger text-sm ml-2 flex-1">{data.billingAlert}</Text>
            </TouchableOpacity>
          )}

          {/* Attendance Card */}
          <TouchableOpacity
            className="bg-white border border-border rounded-xl p-4 mb-3"
            onPress={() => router.push('/(admin)/reports/')}
          >
            <View className="flex-row items-center justify-between mb-2">
              <Text className="font-body-semibold text-text-primary">Today's Attendance</Text>
              <Feather name="chevron-right" size={16} color={VITANA_DESIGN_TOKENS.colors.textSecondary} />
            </View>
            {isLoading ? (
              <SkeletonLoader height={60} borderRadius={8} />
            ) : (
              <>
                {/* Progress bar */}
                <View className="h-3 bg-surface rounded-full overflow-hidden">
                  <View
                    className="h-3 rounded-full"
                    style={{
                      width: `${data?.todayAttendanceRate ?? 0}%`,
                      backgroundColor: data?.todayAttendanceRate >= 85 ? VITANA_DESIGN_TOKENS.colors.success
                        : data?.todayAttendanceRate >= 75 ? VITANA_DESIGN_TOKENS.colors.warning
                        : VITANA_DESIGN_TOKENS.colors.danger,
                    }}
                  />
                </View>
                <View className="flex-row items-center justify-between mt-2">
                  <Text className="font-heading text-xl text-text-primary">{data?.todayAttendanceRate?.toFixed(1)}%</Text>
                  <Text className="font-body text-text-secondary text-sm">
                    {data?.markedClasses}/{data?.totalClasses} classes marked
                  </Text>
                </View>
              </>
            )}
          </TouchableOpacity>

          {/* Pending Approvals */}
          <TouchableOpacity
            className="bg-white border border-border rounded-xl p-4 mb-3 flex-row items-center justify-between"
            onPress={() => router.push('/(admin)/approvals/')}
          >
            <View>
              <Text className="font-body-semibold text-text-primary">Pending Approvals</Text>
              {isLoading ? (
                <SkeletonLoader width={80} height={20} borderRadius={4} className="mt-1" />
              ) : (
                <Text className="font-heading text-xl text-text-primary mt-0.5">
                  {data?.pendingApprovals ?? 0}
                </Text>
              )}
              <Text className="font-body text-text-secondary text-sm">leave requests</Text>
            </View>
            <View className="flex-row items-center">
              {data?.pendingApprovals > 0 && (
                <View className="px-2 py-0.5 rounded-full bg-warning/10 border border-warning/30 mr-2">
                  <Text className="font-body text-warning text-xs">Action needed</Text>
                </View>
              )}
              <Feather name="chevron-right" size={18} color={VITANA_DESIGN_TOKENS.colors.textSecondary} />
            </View>
          </TouchableOpacity>

          {/* Fee Collection */}
          <TouchableOpacity
            className="bg-white border border-border rounded-xl p-4 mb-3"
            onPress={() => router.push('/(admin)/reports/')}
          >
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="font-body-semibold text-text-primary">Fee Collection Today</Text>
                {isLoading ? (
                  <SkeletonLoader width={120} height={28} borderRadius={4} className="mt-1" />
                ) : (
                  <Text className="font-heading text-xl text-text-primary mt-1">
                    {formatINR(data?.todayFeeCollection ?? 0)}
                  </Text>
                )}
                <Text className="font-body text-text-secondary text-sm">
                  This month: {formatINR(data?.monthFeeCollection ?? 0)}
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={VITANA_DESIGN_TOKENS.colors.textSecondary} />
            </View>
          </TouchableOpacity>

          {/* Quick Actions */}
          <Text className="font-body-semibold text-text-primary mb-3 mt-2">Quick Actions</Text>
          <View className="flex-row gap-3">
            <TouchableOpacity
              className="flex-1 bg-white border border-border rounded-xl p-4 items-center"
              onPress={() => router.push('/(admin)/announcements/create')}
            >
              <Feather name="megaphone" size={24} color={colors.primary} />
              <Text className="font-body-medium text-text-primary text-sm mt-2 text-center">Post Announcement</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-white border border-border rounded-xl p-4 items-center"
              onPress={() => router.push('/(admin)/approvals/')}
            >
              <Feather name="check-circle" size={24} color={colors.primary} />
              <Text className="font-body-medium text-text-primary text-sm mt-2 text-center">
                Approve Leaves{data?.pendingApprovals > 0 ? ` (${data.pendingApprovals})` : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
```

### 6.3 Leave Approvals Screen

```typescript
// mobile/app/(admin)/approvals/index.tsx
import { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { adminApi } from '../../../src/api/endpoints/admin';
import { useAppTheme } from '../../../src/theme/SchoolThemeProvider';
import { queryClient } from '../../../src/api/queryClient';
import { formatDateIST, VITANA_DESIGN_TOKENS } from '@vitana/shared-utils';
import { EmptyState } from '../../../src/components/common/EmptyState';

type Tab = 'staff' | 'student';

export default function LeaveApprovals() {
  const [activeTab, setActiveTab] = useState<Tab>('staff');
  const { colors } = useAppTheme();

  const { data: leaves, isLoading, refetch } = useQuery({
    queryKey: ['pending-leaves', activeTab],
    queryFn: () => adminApi.getPendingLeaves(activeTab),
    staleTime: 2 * 60 * 1000,
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, remark }: { id: string; remark?: string }) => adminApi.approveLeave(id, remark),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-leaves'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adminApi.rejectLeave(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-leaves'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
  });

  function handleApprove(id: string, name: string) {
    Alert.prompt(
      `Approve Leave`,
      `Approve leave for ${name}? Add a remark (optional):`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: (remark) => approveMutation.mutate({ id, remark: remark || undefined }),
        },
      ],
      'plain-text'
    );
  }

  function handleReject(id: string, name: string) {
    Alert.prompt(
      `Reject Leave`,
      `Reason for rejecting ${name}'s leave (required):`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: (reason) => {
            if (!reason?.trim()) { Alert.alert('Reason required'); return; }
            rejectMutation.mutate({ id, reason: reason.trim() });
          },
        },
      ],
      'plain-text'
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-4 pt-4 pb-2">
        <Text className="font-heading text-xl text-text-primary mb-3">Leave Approvals</Text>
        <View className="flex-row bg-surface rounded-xl p-1">
          {(['staff', 'student'] as Tab[]).map(tab => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              className="flex-1 py-2.5 rounded-lg items-center"
              style={{ backgroundColor: activeTab === tab ? colors.primary : 'transparent' }}
            >
              <Text
                className="font-body-medium capitalize"
                style={{ color: activeTab === tab ? 'white' : VITANA_DESIGN_TOKENS.colors.textSecondary }}
              >
                {tab} Leave
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isLoading ? null : (!leaves || leaves.length === 0) ? (
        <EmptyState icon="check-circle" title="No pending requests" subtitle="All caught up!" />
      ) : (
        <FlashList
          data={leaves as any[]}
          estimatedItemSize={130}
          keyExtractor={(item: any) => item.id}
          renderItem={({ item }: { item: any }) => (
            <View className="bg-white border-b border-border px-4 py-4">
              <View className="flex-row items-start justify-between mb-3">
                <View className="flex-1">
                  <Text className="font-body-semibold text-text-primary">{item.staffName || item.studentName}</Text>
                  <Text className="font-body text-text-secondary text-sm">
                    {item.leaveTypeName} · {formatDateIST(item.fromDate)} – {formatDateIST(item.toDate)}
                  </Text>
                  <Text className="font-body text-text-secondary text-xs mt-0.5">
                    {item.days} day{item.days > 1 ? 's' : ''} · Balance: {item.remainingBalance}
                  </Text>
                </View>
              </View>
              {item.reason && (
                <Text className="font-body text-text-secondary text-sm mb-3 italic">
                  "{item.reason}"
                </Text>
              )}
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => handleReject(item.id, item.staffName || item.studentName)}
                  disabled={rejectMutation.isPending}
                  className="flex-1 py-2.5 rounded-xl border border-danger/50 items-center"
                  style={{ backgroundColor: '#fee2e2' }}
                >
                  <Text className="font-body-medium text-danger text-sm">Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleApprove(item.id, item.staffName || item.studentName)}
                  disabled={approveMutation.isPending}
                  className="flex-1 py-2.5 rounded-xl items-center"
                  style={{ backgroundColor: colors.primary }}
                >
                  {approveMutation.isPending ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text className="font-body-medium text-white text-sm">Approve</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}
```

### 6.4 Create Announcement Screen

```typescript
// mobile/app/(admin)/announcements/create.tsx
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { adminApi } from '../../../src/api/endpoints/admin';
import { useAppTheme } from '../../../src/theme/SchoolThemeProvider';
import { queryClient } from '../../../src/api/queryClient';
import { VITANA_DESIGN_TOKENS } from '@vitana/shared-utils';

const schema = z.object({
  title: z.string().min(3).max(100),
  body:  z.string().min(10).max(4000),
  priority: z.enum(['Low', 'Normal', 'High', 'Urgent']),
  audience: z.enum(['All', 'Parents', 'Staff', 'Students']),
});
type FormData = z.infer<typeof schema>;

const PRIORITY_COLORS = {
  Low: '#94a3b8', Normal: '#6b7280', High: '#f59e0b', Urgent: '#ef4444',
};

export default function CreateAnnouncement() {
  const { colors } = useAppTheme();
  const { control, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { priority: 'Normal', audience: 'All' },
  });
  const watchedPriority = watch('priority');

  const mutation = useMutation({
    mutationFn: adminApi.createAnnouncement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-announcements'] });
      Alert.alert('Posted!', 'Announcement has been published.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: () => Alert.alert('Error', 'Failed to post announcement.'),
  });

  function onSubmit(data: FormData) {
    if (data.priority === 'Urgent') {
      Alert.alert(
        'Urgent Announcement',
        'This will send push notifications to all recipients. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Post', onPress: () => mutation.mutate(data) },
        ]
      );
    } else {
      mutation.mutate(data);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        <View className="px-4 pt-4 pb-8">
          <Text className="font-heading text-xl text-text-primary mb-4">Post Announcement</Text>

          {/* Title */}
          <View className="mb-4">
            <Text className="font-body-medium text-text-primary mb-1.5">Title *</Text>
            <Controller control={control} name="title"
              render={({ field: { onChange, value } }) => (
                <TextInput value={value} onChangeText={onChange}
                  placeholder="Announcement title..."
                  placeholderTextColor={VITANA_DESIGN_TOKENS.colors.textSecondary}
                  className={`border rounded-xl px-4 py-3.5 font-body text-text-primary bg-surface ${errors.title ? 'border-danger' : 'border-border'}`}
                />
              )}
            />
            {errors.title && <Text className="text-danger text-xs mt-1 font-body">{errors.title.message}</Text>}
          </View>

          {/* Body */}
          <View className="mb-4">
            <Text className="font-body-medium text-text-primary mb-1.5">Message *</Text>
            <Controller control={control} name="body"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  value={value} onChangeText={onChange} multiline numberOfLines={6}
                  placeholder="Write your announcement..."
                  placeholderTextColor={VITANA_DESIGN_TOKENS.colors.textSecondary}
                  textAlignVertical="top"
                  className={`border rounded-xl px-4 py-3 font-body text-text-primary bg-surface h-36 ${errors.body ? 'border-danger' : 'border-border'}`}
                />
              )}
            />
          </View>

          {/* Priority */}
          <View className="mb-4">
            <Text className="font-body-medium text-text-primary mb-2">Priority</Text>
            <Controller control={control} name="priority"
              render={({ field: { onChange, value } }) => (
                <View className="flex-row gap-2">
                  {(['Low', 'Normal', 'High', 'Urgent'] as const).map(p => (
                    <TouchableOpacity
                      key={p}
                      onPress={() => onChange(p)}
                      className="flex-1 py-2 rounded-xl items-center border"
                      style={{
                        backgroundColor: value === p ? PRIORITY_COLORS[p] + '20' : 'white',
                        borderColor: value === p ? PRIORITY_COLORS[p] : VITANA_DESIGN_TOKENS.colors.border,
                      }}
                    >
                      <Text className="font-body text-xs" style={{ color: PRIORITY_COLORS[p] }}>{p}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            />
          </View>

          {/* Audience */}
          <View className="mb-6">
            <Text className="font-body-medium text-text-primary mb-2">Send To</Text>
            <Controller control={control} name="audience"
              render={({ field: { onChange, value } }) => (
                <View className="flex-row flex-wrap gap-2">
                  {(['All', 'Parents', 'Staff', 'Students'] as const).map(a => (
                    <TouchableOpacity
                      key={a}
                      onPress={() => onChange(a)}
                      className="px-4 py-2 rounded-full border"
                      style={{
                        backgroundColor: value === a ? colors.primary : 'white',
                        borderColor: value === a ? colors.primary : VITANA_DESIGN_TOKENS.colors.border,
                      }}
                    >
                      <Text className="font-body-medium text-sm" style={{ color: value === a ? 'white' : VITANA_DESIGN_TOKENS.colors.textSecondary }}>
                        {a === 'All' ? 'All School' : `${a} Only`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            />
          </View>

          <TouchableOpacity
            onPress={handleSubmit(onSubmit)}
            disabled={mutation.isPending}
            className="rounded-xl py-4 items-center"
            style={{ backgroundColor: watchedPriority === 'Urgent' ? VITANA_DESIGN_TOKENS.colors.danger : colors.primary }}
          >
            {mutation.isPending ? <ActivityIndicator color="#fff" /> : (
              <Text className="font-body-semibold text-white text-base">
                {watchedPriority === 'Urgent' ? '⚠️ Post Urgent Announcement' : 'Post Announcement'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
```

---

## PHASE 9: Testing

### Maestro E2E

```yaml
# mobile/maestro/tests/admin_approve_leave.yaml
appId: com.vitana.sms
---
- launchApp
- tapOn: "Approvals"
- assertVisible: "Leave Approvals"
- tapOn: "Approve"  # first pending leave
- inputText: "Approved. Please ensure work is covered."
- tapOn: "Approve"  # confirm button
- assertNotVisible: "Action needed"  # badge gone if no more pending
```

### Validation Checklist

- [ ] Dashboard loads KPIs in < 2s
- [ ] Pending approvals count badge visible on Approvals tab
- [ ] Approve with remark → backend API called with remark
- [ ] Reject without reason → Alert.prompt prevents submission
- [ ] Announcement created → appears in announcements list
- [ ] Urgent announcement → confirmation dialog appears
- [ ] Search debounced (300ms) — verify no API call on each keystroke
- [ ] Billing alert shown (simulate via backend with 15 days left)

---

## PHASE 10: Documentation & Verification

### Git Commit

```bash
git add .
git commit -m "feat(mobile/admin): admin and principal app

- Admin dashboard: attendance rate, pending approvals, fee collection, billing alert
- Leave approvals: staff + student tabs, approve/reject with remark/reason
- Create announcement: priority selector, audience, urgent confirmation dialog
- Analytics overview (charts via victory-native-xl)
- Quick student + staff search with 300ms debounce
- Pending approvals badge on Approvals tab (from admin-dashboard count)

Next: PROMPT-12 (Advanced Offline) or PROMPT-13 (Marks Entry)"
```

---

**END OF PROMPT-09**
