import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAppTheme } from '@/theme';

export default function ParentLayout() {
  const { colors } = useAppTheme();

  return (
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
        name="fees/index"
        options={{
          title: 'Fees',
          tabBarLabel: 'Fees',
          tabBarIcon: ({ color, size }) => (
            <Feather name="credit-card" size={size} color={color} />
          ),
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
      <Tabs.Screen name="attendance/[studentId]" options={{ href: null }} />
      <Tabs.Screen name="fees/pay" options={{ href: null }} />
      <Tabs.Screen name="fees/success" options={{ href: null }} />
      <Tabs.Screen name="fees/failed" options={{ href: null }} />
      <Tabs.Screen name="fees/receipt/[id]" options={{ href: null }} />
      <Tabs.Screen name="results/[studentId]" options={{ href: null }} />
      <Tabs.Screen name="announcements/index" options={{ href: null }} />
      <Tabs.Screen name="announcements/[id]" options={{ href: null }} />
      <Tabs.Screen name="diary/[studentId]" options={{ href: null }} />
      <Tabs.Screen name="leaves/index" options={{ href: null }} />
      <Tabs.Screen name="leaves/apply" options={{ href: null }} />
      <Tabs.Screen name="notifications/index" options={{ href: null }} />
      <Tabs.Screen name="notifications/settings" options={{ href: null }} />
    </Tabs>
  );
}
