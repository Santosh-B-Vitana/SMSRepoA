import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { apiClient } from '@/api/client';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { VITANA_COLORS } from '@/theme/tokens';
import { SubScreenHeader } from '@/components/ui/SubScreenHeader';
import { EmptyState } from '@/components/ui/EmptyState';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TransportRoute {
  id: string;
  routeNumber: string;
  routeName: string;
  vehicleNumber?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  capacity: number;
  studentsAssigned: number;
  startTime?: string | null;
  endTime?: string | null;
  isActive: boolean;
}

interface Vehicle {
  id: string;
  vehicleNumber: string;
  vehicleType: string;
  driverName?: string | null;
  capacity: number;
  isAC: boolean;
  isActive: boolean;
  currentRoute?: string | null;
}

type Tab = 'routes' | 'vehicles';

// ─── Route Card ───────────────────────────────────────────────────────────────

function RouteCard({ route, primaryColor }: { route: TransportRoute; primaryColor: string }) {
  const utilization = route.capacity > 0 ? Math.round((route.studentsAssigned / route.capacity) * 100) : 0;
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push({ pathname: '/(teacher)/transport/route/[id]', params: { id: route.id } })}
      activeOpacity={0.75}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.routeNumber, { backgroundColor: `${primaryColor}15` }]}>
          <Text style={[styles.routeNumberText, { color: primaryColor }]}>{route.routeNumber}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.routeName}>{route.routeName}</Text>
          {route.vehicleNumber && <Text style={styles.routeMeta}>Vehicle: {route.vehicleNumber}</Text>}
        </View>
        <View style={[styles.statusDot, { backgroundColor: route.isActive ? '#16a34a' : '#94a3b8' }]} />
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Feather name="users" size={13} color={VITANA_COLORS.textSecondary} />
          <Text style={styles.statText}>{route.studentsAssigned}/{route.capacity}</Text>
        </View>
        {route.driverName && (
          <View style={styles.stat}>
            <Feather name="user" size={13} color={VITANA_COLORS.textSecondary} />
            <Text style={styles.statText}>{route.driverName}</Text>
          </View>
        )}
        {(route.startTime || route.endTime) && (
          <View style={styles.stat}>
            <Feather name="clock" size={13} color={VITANA_COLORS.textSecondary} />
            <Text style={styles.statText}>{route.startTime ?? '?'} – {route.endTime ?? '?'}</Text>
          </View>
        )}
      </View>

      {/* Utilization bar */}
      <View style={styles.progressWrap}>
        <View style={[styles.progressBar, { width: `${Math.min(utilization, 100)}%` as any, backgroundColor: utilization > 90 ? '#dc2626' : primaryColor }]} />
      </View>
      <Text style={styles.utilizationText}>{utilization}% occupied</Text>
    </TouchableOpacity>
  );
}

// ─── Vehicle Card ─────────────────────────────────────────────────────────────

function VehicleCard({ vehicle, primaryColor }: { vehicle: Vehicle; primaryColor: string }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.vehicleIcon, { backgroundColor: `${primaryColor}15` }]}>
          <Feather name="truck" size={20} color={primaryColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.routeName}>{vehicle.vehicleNumber}</Text>
          <Text style={styles.routeMeta}>{vehicle.vehicleType}{vehicle.isAC ? ' · AC' : ''}</Text>
        </View>
        <View style={[styles.statusDot, { backgroundColor: vehicle.isActive ? '#16a34a' : '#94a3b8' }]} />
      </View>
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Feather name="users" size={13} color={VITANA_COLORS.textSecondary} />
          <Text style={styles.statText}>Capacity: {vehicle.capacity}</Text>
        </View>
        {vehicle.driverName && (
          <View style={styles.stat}>
            <Feather name="user" size={13} color={VITANA_COLORS.textSecondary} />
            <Text style={styles.statText}>{vehicle.driverName}</Text>
          </View>
        )}
      </View>
      {vehicle.currentRoute && (
        <Text style={styles.routeMeta}>Route: {vehicle.currentRoute}</Text>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function TransportManagerScreen() {
  const { primaryColor } = useSchoolTheme();
  const [activeTab, setActiveTab] = useState<Tab>('routes');

  const routesQuery = useQuery<TransportRoute[]>({
    queryKey: ['transport-routes'],
    queryFn: () =>
      (apiClient.get('/transport/routes', { params: { pageSize: 100 } }) as Promise<any>)
        .then((r) => r?.items ?? r?.routes ?? r ?? []),
    staleTime: 2 * 60 * 1000,
  });

  const vehiclesQuery = useQuery<Vehicle[]>({
    queryKey: ['transport-vehicles'],
    queryFn: () =>
      (apiClient.get('/transport/vehicles', { params: { pageSize: 100 } }) as Promise<any>)
        .then((r) => r?.items ?? r?.vehicles ?? r ?? []),
    enabled: activeTab === 'vehicles',
    staleTime: 5 * 60 * 1000,
  });

  const activeRoutes = (routesQuery.data ?? []).filter((r) => r.isActive).length;
  const totalStudents = (routesQuery.data ?? []).reduce((s, r) => s + r.studentsAssigned, 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SubScreenHeader title="Transport Management" />

      {/* Stats */}
      <View style={styles.statsBar}>
        <StatItem label="Active Routes" value={activeRoutes} color="#16a34a" />
        <StatItem label="Students in Transit" value={totalStudents} color={primaryColor} />
        <StatItem label="Vehicles" value={(vehiclesQuery.data ?? routesQuery.data ?? []).length} color="#d97706" />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['routes', 'vehicles'] as Tab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tab, activeTab === tab && { borderBottomColor: primaryColor, borderBottomWidth: 2 }]}
          >
            <Text style={[styles.tabText, activeTab === tab && { color: primaryColor, fontWeight: '600' }]}>
              {tab === 'routes' ? 'Routes' : 'Vehicles'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'routes' ? (
        routesQuery.isLoading ? (
          <View style={styles.center}><ActivityIndicator color={primaryColor} size="large" /></View>
        ) : (routesQuery.data ?? []).length === 0 ? (
          <EmptyState icon="truck" title="No routes found" subtitle="No transport routes configured." />
        ) : (
          <FlatList
            data={routesQuery.data ?? []}
            keyExtractor={(r) => r.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
            renderItem={({ item }) => <RouteCard route={item} primaryColor={primaryColor} />}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            refreshing={routesQuery.isFetching}
            onRefresh={() => routesQuery.refetch()}
          />
        )
      ) : (
        vehiclesQuery.isLoading ? (
          <View style={styles.center}><ActivityIndicator color={primaryColor} size="large" /></View>
        ) : (vehiclesQuery.data ?? []).length === 0 ? (
          <EmptyState icon="truck" title="No vehicles found" subtitle="No vehicles configured." />
        ) : (
          <FlatList
            data={vehiclesQuery.data ?? []}
            keyExtractor={(v) => v.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
            renderItem={({ item }) => <VehicleCard vehicle={item} primaryColor={primaryColor} />}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            refreshing={vehiclesQuery.isFetching}
            onRefresh={() => vehiclesQuery.refetch()}
          />
        )
      )}
    </SafeAreaView>
  );
}

function StatItem({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.statBarItem}>
      <Text style={[styles.statBarValue, { color }]}>{value}</Text>
      <Text style={styles.statBarLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: VITANA_COLORS.background },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: VITANA_COLORS.border,
  },
  statBarItem: { flex: 1, alignItems: 'center' },
  statBarValue: { fontSize: 20, fontWeight: '700' },
  statBarLabel: { fontSize: 10, color: VITANA_COLORS.textSecondary, marginTop: 2, textAlign: 'center' },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: VITANA_COLORS.border, backgroundColor: '#fff' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 13, color: VITANA_COLORS.textSecondary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: VITANA_COLORS.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  routeNumber: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, minWidth: 40, alignItems: 'center' },
  routeNumberText: { fontSize: 13, fontWeight: '700' },
  routeName: { fontSize: 14, fontWeight: '600', color: VITANA_COLORS.text },
  routeMeta: { fontSize: 12, color: VITANA_COLORS.textSecondary, marginTop: 1 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 12, color: VITANA_COLORS.textSecondary },
  progressWrap: { height: 4, backgroundColor: '#f1f5f9', borderRadius: 2, overflow: 'hidden', marginBottom: 4 },
  progressBar: { height: '100%', borderRadius: 2 },
  utilizationText: { fontSize: 11, color: VITANA_COLORS.textSecondary },
  vehicleIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
