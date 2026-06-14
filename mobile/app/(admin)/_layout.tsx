import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useAppTheme } from '@/theme';
import { adminApi, type AdminDashboardResponse } from '@/api/endpoints/admin';
import { FeatureErrorBoundary } from '@/components/common/FeatureErrorBoundary';
import { getTabBarStyle } from '@/theme/tabBarStyle';

function totalPendingApprovals(data: AdminDashboardResponse | undefined): number | undefined {
  if (!data) return undefined;
  const t =
    (data.pendingApprovals?.leaveRequests ?? 0) +
    (data.pendingApprovals?.admissionApplications ?? 0) +
    (data.pendingApprovals?.documentVerifications ?? 0);
  return t > 0 ? t : undefined;
}

export default function AdminLayout() {
  const { colors } = useAppTheme();
  const { screenOptions } = getTabBarStyle(colors.primary);

  const { data } = useQuery<AdminDashboardResponse>({
    queryKey: ['admin-dashboard'],
    queryFn: adminApi.getDashboard,
    staleTime: 3 * 60 * 1000,
  });

  const badgeCount = totalPendingApprovals(data);

  return (
    <FeatureErrorBoundary featureName="Admin Portal">
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Feather name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="approvals/index"
        options={{
          title: 'Approvals',
          tabBarLabel: 'Approvals',
          tabBarBadge: badgeCount,
          tabBarIcon: ({ color, size }) => (
            <Feather name="check-circle" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="announcements/index"
        options={{
          title: 'Announcements',
          tabBarLabel: 'Announce',
          tabBarIcon: ({ color, size }) => (
            <Feather name="volume-2" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="reports/index"
        options={{
          title: 'Reports',
          tabBarLabel: 'Reports',
          tabBarIcon: ({ color, size }) => (
            <Feather name="bar-chart-2" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarLabel: 'More',
          tabBarIcon: ({ color, size }) => (
            <Feather name="more-horizontal" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="notifications/index" options={{ href: null }} />
      <Tabs.Screen name="notifications/settings" options={{ href: null }} />
      <Tabs.Screen name="announcements/create" options={{ href: null }} />
      <Tabs.Screen name="staff/index" options={{ href: null }} />
      <Tabs.Screen name="staff/[id]" options={{ href: null }} />
      <Tabs.Screen name="students/index" options={{ href: null }} />
      <Tabs.Screen name="students/[id]" options={{ href: null }} />
      <Tabs.Screen name="library/index" options={{ href: null }} />
    </Tabs>
    </FeatureErrorBoundary>
  );
}
