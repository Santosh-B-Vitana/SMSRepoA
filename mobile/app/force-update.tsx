import { View, Text, TouchableOpacity, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { VITANA_COLORS } from '@/theme/tokens';

const STORE_URLS = {
  ios: 'https://apps.apple.com/app/vitana-sms',
  android: 'https://play.google.com/store/apps/details?id=com.vitana.sms',
} as const;

/**
 * Blocking force-update screen shown when app version < forceUpdateVersion.
 * No back navigation — user must update from the app store.
 * Store URLs are hardcoded until the backend VersionRequirementsDto adds androidStoreUrl/iosStoreUrl.
 */
export default function ForceUpdateScreen() {
  const { primaryColor } = useSchoolTheme();

  const storeUrl = Platform.OS === 'ios' ? STORE_URLS.ios : STORE_URLS.android;

  const handleUpdate = () => {
    Linking.openURL(storeUrl).catch(() => {
      // fallback: do nothing if URL can't be opened
    });
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: VITANA_COLORS.background, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}
    >
      <View
        style={{
          width: 96,
          height: 96,
          borderRadius: 24,
          backgroundColor: `${primaryColor}18`,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 24,
        }}
      >
        <Text style={{ fontSize: 48 }}>🔄</Text>
      </View>

      <Text
        style={{ fontSize: 24, fontWeight: '700', color: VITANA_COLORS.text, textAlign: 'center', marginBottom: 12 }}
      >
        Update Required
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
        A newer version of Vitana SMS is required to continue. Please update the app to access all
        features.
      </Text>

      <TouchableOpacity
        onPress={handleUpdate}
        style={{
          borderRadius: 12,
          paddingHorizontal: 32,
          paddingVertical: 16,
          alignItems: 'center',
          width: '100%',
          backgroundColor: primaryColor,
        }}
        activeOpacity={0.85}
      >
        <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff' }}>
          {Platform.OS === 'ios' ? 'Update on App Store' : 'Update on Play Store'}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
