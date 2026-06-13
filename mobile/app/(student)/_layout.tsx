import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAppTheme } from '@/theme';
import { FeatureErrorBoundary } from '@/components/common/FeatureErrorBoundary';

export default function StudentLayout() {
  const { colors } = useAppTheme();

  return (
    <FeatureErrorBoundary featureName="Student Portal">
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
        name="timetable/index"
        options={{
          title: 'Schedule',
          tabBarLabel: 'Schedule',
          tabBarIcon: ({ color, size }) => <Feather name="calendar" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="results/index"
        options={{
          title: 'Results',
          tabBarLabel: 'Results',
          tabBarIcon: ({ color, size }) => <Feather name="award" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="assignments/index"
        options={{
          title: 'Assignments',
          tabBarLabel: 'Assignments',
          tabBarIcon: ({ color, size }) => <Feather name="book-open" size={size} color={color} />,
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

      {/* Hidden screens — navigated to via router.push */}
      <Tabs.Screen name="timetable/[day]" options={{ href: null }} />
      <Tabs.Screen name="results/[examId]" options={{ href: null }} />
      <Tabs.Screen name="results/report-card/[id]" options={{ href: null }} />
      <Tabs.Screen name="assignments/[id]" options={{ href: null }} />
      <Tabs.Screen name="assignments/[id]/submit" options={{ href: null }} />
      <Tabs.Screen name="attendance/index" options={{ href: null }} />
      <Tabs.Screen name="fees/index" options={{ href: null }} />
      <Tabs.Screen name="leaves/index" options={{ href: null }} />
      <Tabs.Screen name="leaves/apply" options={{ href: null }} />
      <Tabs.Screen name="library/index" options={{ href: null }} />
      <Tabs.Screen name="announcements/index" options={{ href: null }} />
      <Tabs.Screen name="notifications/index" options={{ href: null }} />
      <Tabs.Screen name="notifications/settings" options={{ href: null }} />
      <Tabs.Screen name="profile/index" options={{ href: null }} />
    </Tabs>
    </FeatureErrorBoundary>
  );
}
