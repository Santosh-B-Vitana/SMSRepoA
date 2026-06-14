import {
  View, Text, ActivityIndicator, ScrollView, RefreshControl, StyleSheet, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { apiClient } from '@/api/client';
import { useAuthStore } from '@/stores/authStore';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { VITANA_COLORS } from '@/theme/tokens';
import { SubScreenHeader } from '@/components/ui/SubScreenHeader';

interface StudentTransportInfo {
  studentName: string;
  studentId?: string;
  pickupPoint: string;
  dropPoint: string;
  routeNumber: string;
  routeName: string;
  vehicleId?: string | null;
  vehicleNumber?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  departureTime?: string | null;
  returnTime?: string | null;
  monthlyFee?: number | null;
}

interface GpsData {
  vehicleId: string;
  vehicleNumber?: string;
  latitude: number;
  longitude: number;
  speedKmh?: number;
  status: string;
  pingTime: string;
  isStale: boolean;
  staleSeconds: number;
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Feather name={icon as any} size={14} color={VITANA_COLORS.textSecondary} />
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function ParentTransportScreen() {
  const { primaryColor } = useSchoolTheme();
  const user = useAuthStore((s) => s.user);

  const { data, isLoading, isRefetching, refetch, error } = useQuery<StudentTransportInfo[]>({
    queryKey: ['parent-transport', user?.id],
    queryFn: async () => {
      const res = await apiClient.get('/transport/parent/my-children') as any;
      return Array.isArray(res) ? res : res?.items ?? [];
    },
    staleTime: 10 * 60 * 1000,
  });

  // Live GPS tracking — polls every 30 seconds
  const { data: gpsData = [], refetch: refetchGps } = useQuery<GpsData[]>({
    queryKey: ['parent-bus-gps'],
    queryFn: async () => {
      const res = await apiClient.get('/transport/gps/parent/my-children') as any;
      return Array.isArray(res) ? res : [];
    },
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
    enabled: (data ?? []).length > 0,
  });

  const children = data ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SubScreenHeader title="Transport" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={primaryColor} />}
      >
        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={primaryColor} size="large" />
          </View>
        ) : error || children.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="truck" size={40} color={VITANA_COLORS.border} />
            <Text style={styles.emptyTitle}>No Transport Assigned</Text>
            <Text style={styles.emptySubtitle}>
              Your child is not currently assigned to any school transport route.
              Contact the school admin to enroll in transport services.
            </Text>
          </View>
        ) : (
          children.map((child, idx) => {
            const gps = gpsData.find((g) => g.vehicleId && child.vehicleId && g.vehicleId === child.vehicleId);
            return (
            <View key={idx} style={styles.card}>
              {/* GPS Live indicator */}
              {gps && (
                <View style={[styles.gpsBanner, { backgroundColor: gps.isStale ? '#fef9c3' : '#dcfce7' }]}>
                  <View style={[styles.gpsDot, { backgroundColor: gps.isStale ? '#d97706' : '#16a34a' }]} />
                  <Text style={[styles.gpsText, { color: gps.isStale ? '#92400e' : '#15803d' }]}>
                    {gps.isStale
                      ? `Last seen ${Math.round(gps.staleSeconds / 60)}m ago`
                      : `Bus live · ${gps.speedKmh != null ? `${Math.round(gps.speedKmh)} km/h` : 'Moving'}`}
                  </Text>
                  <TouchableOpacity onPress={() => refetchGps()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Feather name="refresh-cw" size={12} color={gps.isStale ? '#92400e' : '#15803d'} />
                  </TouchableOpacity>
                </View>
              )}
              {/* Child header */}
              <View style={styles.cardHeader}>
                <View style={[styles.avatarCircle, { backgroundColor: `${primaryColor}20` }]}>
                  <Feather name="user" size={18} color={primaryColor} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.childName}>{child.studentName}</Text>
                  <Text style={styles.routeTag}>Route {child.routeNumber} · {child.routeName}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Stops */}
              <View style={styles.stopsRow}>
                <View style={styles.stopBox}>
                  <Feather name="map-pin" size={14} color={primaryColor} />
                  <View style={{ marginLeft: 6 }}>
                    <Text style={styles.stopLabel}>Pickup</Text>
                    <Text style={styles.stopValue}>{child.pickupPoint}</Text>
                  </View>
                </View>
                <Feather name="arrow-right" size={14} color={VITANA_COLORS.border} />
                <View style={styles.stopBox}>
                  <Feather name="flag" size={14} color="#059669" />
                  <View style={{ marginLeft: 6 }}>
                    <Text style={styles.stopLabel}>Drop</Text>
                    <Text style={styles.stopValue}>{child.dropPoint}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Details */}
              <View style={styles.details}>
                <InfoRow icon="clock" label="Departure" value={child.departureTime} />
                <InfoRow icon="clock" label="Return" value={child.returnTime} />
                <InfoRow icon="truck" label="Vehicle" value={child.vehicleNumber} />
                <InfoRow icon="user" label="Driver" value={child.driverName} />
                <InfoRow icon="phone" label="Driver Phone" value={child.driverPhone} />
                {child.monthlyFee != null && (
                  <InfoRow icon="credit-card" label="Monthly Fee" value={`₹${child.monthlyFee.toLocaleString('en-IN')}`} />
                )}
              </View>
            </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f7fa' },
  scroll: { padding: 16, gap: 14, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyState: { alignItems: 'center', gap: 12, padding: 40, marginTop: 40 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: VITANA_COLORS.text },
  emptySubtitle: { fontSize: 14, color: VITANA_COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },

  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#f1f5f9', gap: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  childName: { fontSize: 15, fontWeight: '700', color: VITANA_COLORS.text },
  routeTag: { fontSize: 12, color: VITANA_COLORS.textSecondary, marginTop: 2 },
  divider: { height: 1, backgroundColor: '#f1f5f9' },

  gpsBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  gpsDot: { width: 7, height: 7, borderRadius: 3.5 },
  gpsText: { flex: 1, fontSize: 12, fontWeight: '500' },
  stopsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  stopBox: { flexDirection: 'row', alignItems: 'flex-start', flex: 1 },
  stopLabel: { fontSize: 11, color: VITANA_COLORS.textSecondary, fontWeight: '500' },
  stopValue: { fontSize: 13, fontWeight: '600', color: VITANA_COLORS.text, marginTop: 2 },

  details: { gap: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoLabel: { fontSize: 11, color: VITANA_COLORS.textSecondary },
  infoValue: { fontSize: 14, fontWeight: '500', color: VITANA_COLORS.text, marginTop: 2 },
});
