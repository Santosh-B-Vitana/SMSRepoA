import { View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { VITANA_COLORS } from '@/theme/tokens';

interface Props {
  icon?: keyof typeof Feather.glyphMap;
  title: string;
  subtitle?: string;
}

export function EmptyState({ icon = 'inbox', title, subtitle }: Props) {
  return (
    <View className="flex-1 items-center justify-center py-16 px-6">
      <Feather name={icon} size={48} color={VITANA_COLORS.textSecondary} />
      <Text className="text-lg mt-4 text-center" style={{ fontWeight: '600', color: VITANA_COLORS.text }}>
        {title}
      </Text>
      {subtitle ? (
        <Text className="text-sm text-center mt-2" style={{ color: VITANA_COLORS.textSecondary }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
