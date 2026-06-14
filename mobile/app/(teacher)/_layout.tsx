import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAppTheme } from '@/theme';
import { FeatureErrorBoundary } from '@/components/common/FeatureErrorBoundary';
import { getTabBarStyle } from '@/theme/tabBarStyle';
import { useAuthStore } from '@/stores/authStore';
import type { UserRole } from '@/shared-types/api/auth';

// Non-teaching roles that land in this portal but should not see the Classes
// or Schedule tabs (those screens are irrelevant to their function).
const NON_TEACHING_ROLES = new Set<UserRole>([
  'Librarian', 'TransportManager', 'HostelWarden', 'Receptionist', 'Accountant',
]);

export default function TeacherLayout() {
  const { colors } = useAppTheme();
  const { screenOptions } = getTabBarStyle(colors.primary);
  const role = useAuthStore((s) => s.user?.role as UserRole | undefined);
  const isNonTeaching = role ? NON_TEACHING_ROLES.has(role) : false;

  return (
    <FeatureErrorBoundary featureName="Teacher Portal">
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => <Feather name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="classes/index"
        options={{
          title: 'Classes',
          tabBarLabel: 'Classes',
          tabBarIcon: ({ color, size }) => <Feather name="users" size={size} color={color} />,
          // Hide the Classes tab for roles that don't manage classes.
          href: isNonTeaching ? null : undefined,
        }}
      />
      <Tabs.Screen
        name="timetable/index"
        options={{
          title: 'Timetable',
          tabBarLabel: 'Schedule',
          tabBarIcon: ({ color, size }) => <Feather name="calendar" size={size} color={color} />,
          // Non-teaching roles have no class schedule to view.
          href: isNonTeaching ? null : undefined,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarLabel: 'More',
          tabBarIcon: ({ color, size }) => <Feather name="grid" size={size} color={color} />,
        }}
      />

      {/* Hidden screens */}
      <Tabs.Screen name="classes/[classId]/index" options={{ href: null }} />
      <Tabs.Screen name="attendance/[classId]" options={{ href: null }} />
      <Tabs.Screen name="leaves/index" options={{ href: null }} />
      <Tabs.Screen name="leaves/apply" options={{ href: null }} />
      <Tabs.Screen name="leaves/status" options={{ href: null }} />
      <Tabs.Screen name="notifications/index" options={{ href: null }} />
      <Tabs.Screen name="notifications/settings" options={{ href: null }} />
      <Tabs.Screen name="sync-status" options={{ href: null }} />
      {/* EP-15: Messaging */}
      <Tabs.Screen name="messages/index" options={{ href: null }} />
      <Tabs.Screen name="messages/new" options={{ href: null }} />
      <Tabs.Screen name="messages/[conversationId]" options={{ href: null }} />
      {/* EP-15: Announcements */}
      <Tabs.Screen name="announcements/index" options={{ href: null }} />
      <Tabs.Screen name="announcements/create" options={{ href: null }} />
      {/* Marks */}
      <Tabs.Screen name="marks/index" options={{ href: null }} />
      <Tabs.Screen name="marks/[examSetupId]/index" options={{ href: null }} />
      <Tabs.Screen name="marks/[examSetupId]/[examSetupSubjectId]" options={{ href: null }} />
      <Tabs.Screen name="marks/[examSetupId]/performance" options={{ href: null }} />
      {/* Assignments */}
      <Tabs.Screen name="assignments/index" options={{ href: null }} />
      <Tabs.Screen name="assignments/create" options={{ href: null }} />
      <Tabs.Screen name="assignments/[id]/submissions" options={{ href: null }} />
      <Tabs.Screen name="assignments/[id]/grade/[submissionId]" options={{ href: null }} />
      {/* Online Classes */}
      <Tabs.Screen name="online-classes/index" options={{ href: null }} />
      <Tabs.Screen name="online-classes/schedule" options={{ href: null }} />
      <Tabs.Screen name="online-classes/meeting" options={{ href: null }} />
      <Tabs.Screen name="online-classes/[id]/index" options={{ href: null }} />
      <Tabs.Screen name="online-classes/[id]/attendance" options={{ href: null }} />
      {/* Health Records — accessible to HostelWarden and class teachers */}
      <Tabs.Screen name="health/index" options={{ href: null }} />
      {/* Receptionist: Visitor Management */}
      <Tabs.Screen name="visitors/index" options={{ href: null }} />
      {/* Librarian: Library Management */}
      <Tabs.Screen name="library/index" options={{ href: null }} />
      {/* Transport Manager: Route & Vehicle Management */}
      <Tabs.Screen name="transport/index" options={{ href: null }} />
      <Tabs.Screen name="transport/route/[id]" options={{ href: null }} />
      {/* Hostel Warden: Hostel Management */}
      <Tabs.Screen name="hostel/index" options={{ href: null }} />
      <Tabs.Screen name="hostel/attendance" options={{ href: null }} />
      <Tabs.Screen name="hostel/visitors" options={{ href: null }} />
      {/* Teacher: Profile, Curriculum, Diary, PTM */}
      <Tabs.Screen name="profile/index" options={{ href: null }} />
      <Tabs.Screen name="syllabus/index" options={{ href: null }} />
      <Tabs.Screen name="diary/index" options={{ href: null }} />
      <Tabs.Screen name="ptm/index" options={{ href: null }} />
      {/* Teacher: Self-service — Attendance, Salary, Performance */}
      <Tabs.Screen name="attendance/my" options={{ href: null }} />
      <Tabs.Screen name="salary/index" options={{ href: null }} />
      <Tabs.Screen name="salary/[id]" options={{ href: null }} />
      <Tabs.Screen name="performance/index" options={{ href: null }} />
    </Tabs>
    </FeatureErrorBoundary>
  );
}
