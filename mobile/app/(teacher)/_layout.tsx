import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAppTheme } from '@/theme';
import { FeatureErrorBoundary } from '@/components/common/FeatureErrorBoundary';
import { getTabBarStyle } from '@/theme/tabBarStyle';

export default function TeacherLayout() {
  const { colors } = useAppTheme();
  const { screenOptions } = getTabBarStyle(colors.primary);

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
        }}
      />
      <Tabs.Screen
        name="timetable/index"
        options={{
          title: 'Timetable',
          tabBarLabel: 'Schedule',
          tabBarIcon: ({ color, size }) => <Feather name="calendar" size={size} color={color} />,
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
    </Tabs>
    </FeatureErrorBoundary>
  );
}
