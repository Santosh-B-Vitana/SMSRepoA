import { Platform } from 'react-native';
import { VITANA_COLORS } from './tokens';

export const getTabBarStyle = (primaryColor: string) => ({
  screenOptions: {
    headerShown: false,
    tabBarActiveTintColor: primaryColor,
    tabBarInactiveTintColor: '#94a3b8',
    tabBarStyle: {
      backgroundColor: '#ffffff',
      borderTopColor: VITANA_COLORS.border,
      borderTopWidth: 1,
      height: Platform.OS === 'ios' ? 82 : 64,
      paddingBottom: Platform.OS === 'ios' ? 22 : 8,
      paddingTop: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 8,
    },
    tabBarLabelStyle: {
      fontSize: 11,
      fontFamily: 'Inter',
      fontWeight: '600' as const,
      marginTop: 2,
    },
    tabBarIconStyle: {
      marginBottom: 0,
    },
  },
});
