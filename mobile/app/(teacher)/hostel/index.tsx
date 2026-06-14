import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { apiClient } from '@/api/client';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { VITANA_COLORS } from '@/theme/tokens';
import { SubScreenHeader } from '@/components/ui/SubScreenHeader';
import { EmptyState } from '@/components/ui/EmptyState';

// ─── Types ────────────────────────────────────────────────────────────────────

interface HostelRoom {
  id: string;
  blockName: string;
  roomNumber: string;
  roomType: 'boys' | 'girls' | 'mixed';
  capacity: number;
  occupiedBeds: number;
  floor?: number | null;
  rentPerBed: number;
  status: 'available' | 'full' | 'maintenance';
  students: { id: string; name: string; admissionNumber?: string | null }[];
}

type Tab = 'rooms' | 'attendance' | 'visitors';

// ─── Room Card ────────────────────────────────────────────────────────────────

function RoomCard({ room, primaryColor }: { room: HostelRoom; primaryColor: string }) {
  const occupancy = room.capacity > 0 ? Math.round((room.occupiedBeds / room.capacity) * 100) : 0;
  const isFull = room.status === 'full' || room.occupiedBeds >= room.capacity;
  const statusColor = room.status === 'maintenance' ? '#f97316' : isFull ? '#dc2626' : '#16a34a';

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.roomIcon, { backgroundColor: `${primaryColor}15` }]}>
          <Feather name="home" size={18} color={primaryColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.roomNumber}>Room {room.roomNumber}</Text>
          <Text style={styles.roomMeta}>{room.blockName}{room.floor != null ? ` · Floor ${room.floor}` : ''}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {room.status === 'maintenance' ? 'Maintenance' : isFull ? 'Full' : 'Available'}
          </Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Feather name="users" size={13} color={VITANA_COLORS.textSecondary} />
          <Text style={styles.statText}>{room.occupiedBeds}/{room.capacity} beds</Text>
        </View>
        <View style={styles.stat}>
          <Feather name="dollar-sign" size={13} color={VITANA_COLORS.textSecondary} />
          <Text style={styles.statText}>₹{room.rentPerBed}/bed</Text>
        </View>
        <View style={styles.stat}>
          <Feather name="tag" size={13} color={VITANA_COLORS.textSecondary} />
          <Text style={styles.statText}>{room.roomType}</Text>
        </View>
      </View>

      {/* Occupancy bar */}
      <View style={styles.progressWrap}>
        <View style={[styles.progressBar, {
          width: `${Math.min(occupancy, 100)}%` as any,
          backgroundColor: occupancy > 90 ? '#dc2626' : primaryColor,
        }]} />
      </View>
      <Text style={styles.occupancyText}>{occupancy}% occupied</Text>

      {room.students.length > 0 && (
        <View style={styles.studentList}>
          {room.students.slice(0, 3).map((s) => (
            <Text key={s.id} style={styles.studentChip}>{s.name}</Text>
          ))}
          {room.students.length > 3 && (
            <Text style={[styles.studentChip, { color: VITANA_COLORS.textSecondary }]}>+{room.students.length - 3} more</Text>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function HostelScreen() {
  const { primaryColor } = useSchoolTheme();
  const [activeTab, setActiveTab] = useState<Tab>('rooms');

  const roomsQuery = useQuery<HostelRoom[]>({
    queryKey: ['hostel-rooms'],
    queryFn: () =>
      (apiClient.get('/hostel/rooms', { params: { pageSize: 100 } }) as Promise<any>)
        .then((r) => r?.items ?? r?.rooms ?? r ?? []),
    staleTime: 2 * 60 * 1000,
  });

  const rooms = roomsQuery.data ?? [];
  const totalCapacity = rooms.reduce((s, r) => s + r.capacity, 0);
  const totalOccupied = rooms.reduce((s, r) => s + r.occupiedBeds, 0);
  const availableRooms = rooms.filter((r) => r.status === 'available' && r.occupiedBeds < r.capacity).length;

  const TABS: { key: Tab; label: string }[] = [
    { key: 'rooms', label: 'Rooms' },
    { key: 'attendance', label: 'Attendance' },
    { key: 'visitors', label: 'Visitors' },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SubScreenHeader title="Hostel Management" />

      {/* Stats bar */}
      <View style={styles.statsBar}>
        <StatItem label="Occupied" value={totalOccupied} color={primaryColor} />
        <StatItem label="Capacity" value={totalCapacity} color="#64748b" />
        <StatItem label="Available Rooms" value={availableRooms} color="#16a34a" />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            onPress={() => {
              if (key === 'attendance') {
                router.push('/(teacher)/hostel/attendance');
              } else if (key === 'visitors') {
                router.push('/(teacher)/hostel/visitors');
              } else {
                setActiveTab(key);
              }
            }}
            style={[styles.tab, activeTab === key && { borderBottomColor: primaryColor, borderBottomWidth: 2 }]}
          >
            <Text style={[styles.tabText, activeTab === key && { color: primaryColor, fontWeight: '600' }]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Rooms list */}
      {roomsQuery.isLoading ? (
        <View style={styles.center}><ActivityIndicator color={primaryColor} size="large" /></View>
      ) : rooms.length === 0 ? (
        <EmptyState icon="home" title="No rooms found" subtitle="No hostel rooms configured yet." />
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          renderItem={({ item }) => <RoomCard room={item} primaryColor={primaryColor} />}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          refreshing={roomsQuery.isFetching}
          onRefresh={() => roomsQuery.refetch()}
        />
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
  roomIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  roomNumber: { fontSize: 15, fontWeight: '700', color: VITANA_COLORS.text },
  roomMeta: { fontSize: 12, color: VITANA_COLORS.textSecondary, marginTop: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '600' },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 12, color: VITANA_COLORS.textSecondary },
  progressWrap: { height: 4, backgroundColor: '#f1f5f9', borderRadius: 2, overflow: 'hidden', marginBottom: 4 },
  progressBar: { height: '100%', borderRadius: 2 },
  occupancyText: { fontSize: 11, color: VITANA_COLORS.textSecondary, marginBottom: 8 },
  studentList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  studentChip: { fontSize: 11, color: VITANA_COLORS.text, backgroundColor: '#f8fafc', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: VITANA_COLORS.border },
});
