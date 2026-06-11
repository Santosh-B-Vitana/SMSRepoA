import { Modal, View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { hasAskedPermission, markPermissionAsked, registerForPushNotifications } from '../../notifications/registration';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSchoolTheme } from '../../theme/useSchoolTheme';
import { VITANA_COLORS } from '../../theme/tokens';

const PUSH_DENIED_KEY = 'push_permission_denied';

const NOTIFICATION_BENEFITS: { icon: keyof typeof Feather.glyphMap; text: string }[] = [
  { icon: 'calendar', text: "Attendance updates and absence alerts" },
  { icon: 'credit-card', text: 'Fee due reminders and payment confirmations' },
  { icon: 'award', text: 'Exam result announcements' },
  { icon: 'bell', text: 'Important school announcements' },
];

export function PushPermissionRationale() {
  const [visible, setVisible] = useState(false);
  const { primaryColor } = useSchoolTheme();

  useEffect(() => {
    void hasAskedPermission().then((asked) => {
      if (!asked) setVisible(true);
    });
  }, []);

  async function handleAllow() {
    await markPermissionAsked();
    setVisible(false);
    await registerForPushNotifications();
  }

  async function handleDismiss() {
    await markPermissionAsked();
    await AsyncStorage.setItem(PUSH_DENIED_KEY, 'true');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <Modal visible animationType="slide" transparent statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' }}>
        <View
          style={{
            backgroundColor: '#fff',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingHorizontal: 24,
            paddingTop: 24,
            paddingBottom: 40,
          }}
        >
          {/* Icon */}
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: primaryColor + '20',
                marginBottom: 12,
              }}
            >
              <Feather name="bell" size={30} color={primaryColor} />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: VITANA_COLORS.text }}>
              Stay Informed
            </Text>
          </View>

          <Text
            style={{
              fontSize: 14,
              color: VITANA_COLORS.textSecondary,
              textAlign: 'center',
              marginBottom: 20,
              lineHeight: 20,
            }}
          >
            Allow Vitana SMS to send you notifications for:
          </Text>

          {NOTIFICATION_BENEFITS.map(({ icon, text }) => (
            <View
              key={icon}
              style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}
            >
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  backgroundColor: primaryColor + '15',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}
              >
                <Feather name={icon} size={16} color={primaryColor} />
              </View>
              <Text style={{ flex: 1, fontSize: 14, color: VITANA_COLORS.text }}>{text}</Text>
            </View>
          ))}

          <Text
            style={{
              fontSize: 12,
              color: VITANA_COLORS.textSecondary,
              textAlign: 'center',
              marginTop: 8,
              marginBottom: 20,
            }}
          >
            You can manage notification preferences in Settings anytime.
          </Text>

          <TouchableOpacity
            onPress={handleAllow}
            style={{
              borderRadius: 12,
              paddingVertical: 15,
              alignItems: 'center',
              backgroundColor: primaryColor,
              marginBottom: 12,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>
              Allow Notifications
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleDismiss} style={{ alignItems: 'center', paddingVertical: 8 }}>
            <Text style={{ color: VITANA_COLORS.textSecondary, fontSize: 14 }}>Not Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
