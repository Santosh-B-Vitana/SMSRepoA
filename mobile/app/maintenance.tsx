import { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSchoolStore } from '@/stores/schoolStore';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { queryClient } from '@/api/queryClient';
import { APP_CONFIG_QUERY_KEY } from '@/features/appConfig/hooks/useAppConfig';
import { VITANA_COLORS } from '@/theme/tokens';

/**
 * Blocking maintenance mode screen shown when maintenanceMode=true.
 * "Check Again" re-fetches app config and redirects home if maintenance is over.
 */
export default function MaintenanceScreen() {
  const { primaryColor } = useSchoolTheme();
  const versionRequirements = useSchoolStore((s) => s.versionRequirements);
  const [isChecking, setIsChecking] = useState(false);

  const message =
    versionRequirements?.maintenanceMessage ??
    "We're performing scheduled maintenance. The app will be back shortly.";

  const handleCheckAgain = async () => {
    setIsChecking(true);
    try {
      await queryClient.invalidateQueries({ queryKey: APP_CONFIG_QUERY_KEY });
      await queryClient.refetchQueries({ queryKey: APP_CONFIG_QUERY_KEY });
      const latestRequirements = useSchoolStore.getState().versionRequirements;
      if (!latestRequirements?.maintenanceMode) {
        router.replace('/');
      }
    } catch {
      // Still in maintenance — show nothing, let the user try again
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: VITANA_COLORS.background,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
      }}
    >
      <View
        style={{
          width: 96,
          height: 96,
          borderRadius: 24,
          backgroundColor: VITANA_COLORS.warningLight,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 24,
        }}
      >
        <Text style={{ fontSize: 48 }}>🔧</Text>
      </View>

      <Text
        style={{
          fontSize: 24,
          fontWeight: '700',
          color: VITANA_COLORS.text,
          textAlign: 'center',
          marginBottom: 12,
        }}
      >
        Under Maintenance
      </Text>

      <Text
        style={{
          fontSize: 15,
          color: VITANA_COLORS.textSecondary,
          textAlign: 'center',
          lineHeight: 24,
          marginBottom: 32,
        }}
      >
        {message}
      </Text>

      <TouchableOpacity
        onPress={() => { void handleCheckAgain(); }}
        disabled={isChecking}
        style={{
          borderRadius: 12,
          paddingHorizontal: 32,
          paddingVertical: 16,
          alignItems: 'center',
          width: '100%',
          backgroundColor: isChecking ? `${primaryColor}80` : primaryColor,
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 8,
        }}
        activeOpacity={0.85}
      >
        {isChecking && <ActivityIndicator size="small" color="#fff" />}
        <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff' }}>
          {isChecking ? 'Checking...' : 'Check Again'}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
