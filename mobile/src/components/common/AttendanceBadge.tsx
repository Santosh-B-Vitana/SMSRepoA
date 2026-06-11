import { View, Text } from 'react-native';

interface Props {
  percentage: number;
  size?: 'sm' | 'md' | 'lg';
}

type ColorConfig = { bg: string; text: string; border: string };

function getColors(percentage: number): ColorConfig {
  if (percentage >= 85) return { bg: '#dcfce7', text: '#16a34a', border: '#16a34a' };
  if (percentage >= 75) return { bg: '#fef3c7', text: '#d97706', border: '#f59e0b' };
  return { bg: '#fee2e2', text: '#dc2626', border: '#ef4444' };
}

const paddingMap = { sm: { paddingHorizontal: 8, paddingVertical: 2 }, md: { paddingHorizontal: 12, paddingVertical: 4 }, lg: { paddingHorizontal: 16, paddingVertical: 8 } };
const fontSizeMap = { sm: 11, md: 13, lg: 17 };

export function AttendanceBadge({ percentage, size = 'md' }: Props) {
  const colors = getColors(percentage);
  const padding = paddingMap[size];
  const fontSize = fontSizeMap[size];

  return (
    <View
      style={{
        backgroundColor: colors.bg,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: 999,
        ...padding,
      }}
    >
      <Text style={{ color: colors.text, fontSize, fontWeight: '600' }}>
        {percentage.toFixed(1)}%
      </Text>
    </View>
  );
}
