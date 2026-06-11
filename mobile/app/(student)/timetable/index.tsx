import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { studentApi } from '@/api/endpoints/student';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { SkeletonLoader } from '@/components/common/SkeletonLoader';
import { VITANA_COLORS } from '@/theme/tokens';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const SHORT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

function getCurrentDayIndex(): number {
  const day = new Date().getDay();
  return day >= 1 && day <= 5 ? day - 1 : 0;
}

export default function TimetableScreen() {
  const { primaryColor } = useSchoolTheme();
  const [selectedDay, setSelectedDay] = useState(getCurrentDayIndex());

  // We get classId from the student profile or stored in state
  const { data: profile } = useQuery({
    queryKey: ['student-profile'],
    queryFn: studentApi.getProfile,
    staleTime: 30 * 60 * 1000,
  });

  const { data: timetable, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['student-timetable', profile?.className],
    queryFn: () => studentApi.getTimetable(profile?.className ?? ''),
    enabled: !!profile?.className,
    staleTime: 60 * 60 * 1000,
  });

  const selectedDayData = timetable?.find(
    (d) => d.day.toLowerCase() === DAYS[selectedDay]?.toLowerCase(),
  );
  const periods = selectedDayData?.periods ?? [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f7fa' }}>
      {/* Header */}
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
          Timetable
        </Text>
      </View>

      {/* Day selector */}
      <View style={{ backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: VITANA_COLORS.border }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 8 }}>
          {SHORT_DAYS.map((day, index) => {
            const isToday = index === getCurrentDayIndex();
            const isSelected = index === selectedDay;
            return (
              <TouchableOpacity
                key={day}
                onPress={() => setSelectedDay(index)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderBottomWidth: 2,
                  borderBottomColor: isSelected ? primaryColor : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: isSelected ? '600' : '400',
                    color: isSelected ? primaryColor : VITANA_COLORS.textSecondary,
                  }}
                >
                  {day}
                  {isToday ? ' ·' : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <View style={{ padding: 16, gap: 10 }}>
          {!profile?.className ? (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Feather name="info" size={32} color={VITANA_COLORS.textSecondary} />
              <Text style={{ color: VITANA_COLORS.textSecondary, fontSize: 14, marginTop: 8, textAlign: 'center' }}>
                Class information not available.{'\n'}Please contact your school administrator.
              </Text>
            </View>
          ) : isLoading ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonLoader key={i} height={72} borderRadius={12} />)
          ) : periods.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Feather name="coffee" size={32} color={VITANA_COLORS.textSecondary} />
              <Text style={{ color: VITANA_COLORS.textSecondary, fontSize: 14, marginTop: 8 }}>
                No classes on {DAYS[selectedDay]}
              </Text>
            </View>
          ) : (
            periods.map((period, index) => (
              <View
                key={index}
                style={{
                  backgroundColor: '#fff',
                  borderRadius: 12,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: period.isCurrentPeriod ? primaryColor + '40' : VITANA_COLORS.border,
                  borderLeftWidth: period.isCurrentPeriod ? 3 : 1,
                  borderLeftColor: period.isCurrentPeriod ? primaryColor : VITANA_COLORS.border,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <View
                        style={{
                          backgroundColor: primaryColor + '20',
                          borderRadius: 6,
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                        }}
                      >
                        <Text style={{ fontSize: 11, color: primaryColor, fontWeight: '600' }}>
                          Period {period.periodNumber}
                        </Text>
                      </View>
                      {period.isCurrentPeriod && (
                        <View style={{ backgroundColor: '#dcfce7', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 11, color: '#16a34a', fontWeight: '600' }}>Now</Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: VITANA_COLORS.text }}>
                      {period.subjectName}
                    </Text>
                    <Text style={{ fontSize: 13, color: VITANA_COLORS.textSecondary, marginTop: 2 }}>
                      {period.teacherName}
                      {period.roomNumber ? ` · Room ${period.roomNumber}` : ''}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 13, color: VITANA_COLORS.textSecondary, marginLeft: 8 }}>
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
