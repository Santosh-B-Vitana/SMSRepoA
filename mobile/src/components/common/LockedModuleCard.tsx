import { View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { VITANA_COLORS } from '@/theme/tokens';

interface LockedModuleCardProps {
  name: string;
  description?: string;
}

/**
 * Displays a greyed-out locked state card for a module that is disabled
 * for the current school's plan or configuration.
 */
export function LockedModuleCard({ name, description }: LockedModuleCardProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: VITANA_COLORS.border,
        paddingHorizontal: 16,
        paddingVertical: 14,
        opacity: 0.55,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: VITANA_COLORS.surface,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
        }}
      >
        <Feather name="lock" size={16} color={VITANA_COLORS.textSecondary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '500', color: VITANA_COLORS.textSecondary }}>
          {name}
        </Text>
        <Text style={{ fontSize: 12, color: VITANA_COLORS.textSecondary, marginTop: 1 }}>
          {description ?? 'Not available on your current plan'}
        </Text>
      </View>
    </View>
  );
}
