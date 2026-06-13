import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAppTheme } from '@/theme';
import { FeatureErrorBoundary } from '@/components/common/FeatureErrorBoundary';

export default function TeacherLayout() {
  const { colors } = useAppTheme();

  return (
    <FeatureErrorBoundary featureName="Teacher Portal">
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          borderTopColor: '#f3f4f6',
          backgroundColor: '#ffffff',
          height: 60,
          paddingBottom: 8,
        },
      }}
    >
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
    </Tabs>
    </FeatureErrorBoundary>
  );
}
