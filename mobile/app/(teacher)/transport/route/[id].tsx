import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { apiClient } from '@/api/client';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { VITANA_COLORS } from '@/theme/tokens';
import { SubScreenHeader } from '@/components/ui/SubScreenHeader';
import { EmptyState } from '@/components/ui/EmptyState';

interface RouteDetail {
  id: string;
  routeNumber: string;
  routeName: string;
  vehicleNumber?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  capacity: number;
  startTime?: string | null;
  endTime?: string | null;
  stops: { name: string; estimatedTime?: string | null; studentsAtStop: number }[];
  students: { id: string; name: string; className?: string | null; pickupPoint?: string | null }[];
}

export default function RouteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { primaryColor } = useSchoolTheme();

  const { data, isLoading } = useQuery<RouteDetail>({
    queryKey: ['transport-route', id],
    queryFn: () => apiClient.get(`/transport/routes/${id}`),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });

  if (isLoading || !data) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <SubScreenHeader title="Route Details" />
        <View style={styles.center}>
          {isLoading ? <ActivityIndicator color={primaryColor} size="large" /> : (
            <EmptyState icon="map" title="Route not found" subtitle="Unable to load route details." />
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SubScreenHeader title={`Route ${data.routeNumber}`} />

      <FlatList
        data={data.students}
        keyExtractor={(s) => s.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        ListHeaderComponent={
          <>
            {/* Route info */}
            <View style={styles.infoCard}>
              <Text style={styles.routeName}>{data.routeName}</Text>
              <View style={styles.infoGrid}>
                {data.vehicleNumber && <InfoRow icon="truck" label={data.vehicleNumber} />}
                {data.driverName && <InfoRow icon="user" label={data.driverName} />}
                {data.driverPhone && <InfoRow icon="phone" label={data.driverPhone} />}
                {data.startTime && <InfoRow icon="clock" label={`${data.startTime ?? ''}–${data.endTime ?? ''}`} />}
                <InfoRow icon="users" label={`${data.students.length}/${data.capacity} students`} />
              </View>
            </View>

            {/* Stops */}
            {(data.stops ?? []).length > 0 && (
              <View style={[styles.infoCard, { marginTop: 12 }]}>
                <Text style={styles.sectionTitle}>Stops</Text>
                {data.stops.map((stop, i) => (
                  <View key={i} style={styles.stopRow}>
                    <View style={[styles.stopDot, { backgroundColor: primaryColor }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.stopName}>{stop.name}</Text>
                      {stop.estimatedTime && <Text style={styles.stopMeta}>{stop.estimatedTime}</Text>}
                    </View>
                    <Text style={styles.stopCount}>{stop.studentsAtStop}</Text>
                  </View>
                ))}
              </View>
            )}

            <Text style={[styles.sectionTitle, { marginTop: 16, marginBottom: 8 }]}>
              Students ({data.students.length})
            </Text>
          </>
        }
        renderItem={({ item, index }) => (
          <View style={[styles.studentRow, index < data.students.length - 1 && styles.borderBottom]}>
            <View style={[styles.rollBadge, { backgroundColor: `${primaryColor}15` }]}>
              <Text style={[styles.rollText, { color: primaryColor }]}>{index + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.studentName}>{item.name}</Text>
              {item.className && <Text style={styles.studentMeta}>{item.className}</Text>}
              {item.pickupPoint && (
                <Text style={styles.studentMeta}>
                  <Feather name="map-pin" size={10} /> {item.pickupPoint}
                </Text>
              )}
            </View>
          </View>
        )}
        ListEmptyComponent={<EmptyState icon="users" title="No students assigned" subtitle="No students assigned to this route yet." />}
      />
    </SafeAreaView>
  );
}

function InfoRow({ icon, label }: { icon: any; label: string }) {
  return (
    <View style={styles.infoRow}>
      <Feather name={icon} size={13} color={VITANA_COLORS.textSecondary} />
      <Text style={styles.infoText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: VITANA_COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: VITANA_COLORS.border,
  },
  routeName: { fontSize: 16, fontWeight: '700', color: VITANA_COLORS.text, marginBottom: 12 },
  infoGrid: { gap: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontSize: 13, color: VITANA_COLORS.textSecondary, flex: 1 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: VITANA_COLORS.text },
  stopRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  stopDot: { width: 10, height: 10, borderRadius: 5 },
  stopName: { fontSize: 13, fontWeight: '500', color: VITANA_COLORS.text },
  stopMeta: { fontSize: 11, color: VITANA_COLORS.textSecondary },
  stopCount: { fontSize: 12, color: VITANA_COLORS.textSecondary, minWidth: 20, textAlign: 'right' },
  studentRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, backgroundColor: '#fff', paddingHorizontal: 14 },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  rollBadge: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  rollText: { fontSize: 12, fontWeight: '700' },
  studentName: { fontSize: 14, fontWeight: '600', color: VITANA_COLORS.text },
  studentMeta: { fontSize: 12, color: VITANA_COLORS.textSecondary, marginTop: 1 },
});
