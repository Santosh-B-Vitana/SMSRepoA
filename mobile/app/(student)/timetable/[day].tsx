import { View, Text, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import { studentApi } from '@/api/endpoints/student';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { SkeletonLoader } from '@/components/common/SkeletonLoader';
import { VITANA_COLORS } from '@/theme/tokens';

export default function TimetableDayDetail() {
  const { day } = useLocalSearchParams<{ day: string }>();
  const { primaryColor } = useSchoolTheme();

  const { data: profile } = useQuery({
    queryKey: ['student-profile'],
    queryFn: studentApi.getProfile,
    staleTime: 30 * 60 * 1000,
  });

  const { data: timetable, isLoading } = useQuery({
    queryKey: ['student-timetable', profile?.className],
    queryFn: () => studentApi.getTimetable(profile?.className ?? ''),
    enabled: !!profile?.className,
    staleTime: 60 * 60 * 1000,
  });

  const dayData = timetable?.find((d) => d.day.toLowerCase() === (day ?? '').toLowerCase());
  const periods = dayData?.periods ?? [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f7fa' }}>
      <View
        style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: 16, paddingVertical: 12,
          backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: VITANA_COLORS.border,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Feather name="arrow-left" size={22} color={VITANA_COLORS.text} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 17, fontWeight: '600', color: VITANA_COLORS.text, marginLeft: 12 }}>
          {day ? String(day).charAt(0).toUpperCase() + String(day).slice(1) : 'Schedule'}
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }}>
        <View style={{ padding: 16, gap: 10 }}>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <SkeletonLoader key={i} height={72} borderRadius={12} />)
          ) : periods.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Feather name="coffee" size={32} color={VITANA_COLORS.textSecondary} />
              <Text style={{ color: VITANA_COLORS.textSecondary, fontSize: 14, marginTop: 8 }}>
                No classes scheduled
              </Text>
            </View>
          ) : (
            periods.map((period, index) => (
              <View
                key={index}
                style={{
                  backgroundColor: '#fff', borderRadius: 12, padding: 14,
                  borderWidth: 1, borderColor: VITANA_COLORS.border,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <View
                      style={{
                        backgroundColor: primaryColor + '15', borderRadius: 6,
                        paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start', marginBottom: 6,
                      }}
                    >
                      <Text style={{ fontSize: 11, color: primaryColor, fontWeight: '600' }}>
                        Period {period.periodNumber}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: VITANA_COLORS.text }}>
                      {period.subjectName}
                    </Text>
                    <Text style={{ fontSize: 13, color: VITANA_COLORS.textSecondary, marginTop: 2 }}>
                      {period.teacherName}
                      {period.roomNumber ? ` · Room ${period.roomNumber}` : ''}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 13, color: VITANA_COLORS.textSecondary, textAlign: 'right' }}>
                    {period.startTime}{'\n'}{period.endTime}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
