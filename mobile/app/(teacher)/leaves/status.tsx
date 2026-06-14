import { View, Text, ScrollView, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { teacherApi } from '@/api/endpoints/teacher';
import { SkeletonCard, SkeletonLoader } from '@/components/common/SkeletonLoader';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDate } from '@vitana/shared-utils';
import { VITANA_COLORS, VITANA_SHADOWS } from '@/theme/tokens';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import type { OwnLeaveApplication, LeaveBalanceResponse } from '@/api/endpoints/teacher';

// ─── Status config ────────────────────────────────────────────────────────────

type LeaveStatus = 'Pending' | 'Approved' | 'Rejected';

const STATUS_CONFIG: Record<LeaveStatus, { bg: string; text: string; icon: keyof typeof Feather.glyphMap }> = {
  Pending:  { bg: '#fef3c7', text: '#d97706', icon: 'clock' },
  Approved: { bg: '#dcfce7', text: '#16a34a', icon: 'check-circle' },
  Rejected: { bg: '#fee2e2', text: '#dc2626', icon: 'x-circle' },
};

// ─── Balance mini card ────────────────────────────────────────────────────────

function BalanceMiniCard({ bal }: { bal: LeaveBalanceResponse }) {
  const total = bal.totalAllowed + bal.carriedForward;
  const pct = total > 0 ? Math.max(0, Math.min(100, Math.round((bal.available / total) * 100))) : 0;
  const barColor = bal.available <= 0 ? '#ef4444'
    : bal.available / Math.max(1, total) > 0.5 ? '#16a34a' : '#d97706';

  return (
    <View style={[balSt.card, VITANA_SHADOWS.sm]}>
      <Text style={balSt.typeName} numberOfLines={1}>{bal.leaveTypeName}</Text>
      <Text style={[balSt.count, { color: barColor }]}>{bal.available}</Text>
      <Text style={balSt.sub}>of {total} days</Text>
      <View style={balSt.barBg}>
        <View style={[balSt.barFill, { width: `${pct}%`, backgroundColor: barColor }]} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <Text style={balSt.usedLabel}>{bal.used} used</Text>
        {bal.carriedForward > 0 && (
          <Text style={balSt.cfLabel}>+{bal.carriedForward} c/f</Text>
        )}
      </View>
    </View>
  );
}

const balSt = StyleSheet.create({
  card: {
    width: 120,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: VITANA_COLORS.border,
    padding: 12,
  },
  typeName: {
    fontSize: 9,
    fontWeight: '700',
    color: VITANA_COLORS.textSecondary,
    fontFamily: 'Inter',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  count: {
    fontSize: 26,
    fontWeight: '700',
    fontFamily: 'Poppins',
    lineHeight: 30,
  },
  sub: {
    fontSize: 9,
    color: VITANA_COLORS.textSecondary,
    fontFamily: 'Inter',
    marginTop: 1,
  },
  barBg: {
    height: 3,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  barFill: {
    height: 3,
    borderRadius: 2,
  },
  usedLabel: {
    fontSize: 9,
    color: VITANA_COLORS.textSecondary,
    fontFamily: 'Inter',
  },
  cfLabel: {
    fontSize: 9,
    color: '#7c3aed',
    fontWeight: '600',
    fontFamily: 'Inter',
  },
});

// ─── Leave application card ───────────────────────────────────────────────────

function LeaveCard({ leave }: { leave: OwnLeaveApplication }) {
  const status = leave.status as LeaveStatus;
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.Pending;
  const dayCount =
    Math.ceil(
      (new Date(leave.toDate).getTime() - new Date(leave.fromDate).getTime()) / 86400000,
    ) + 1;

  return (
    <View style={cardSt.card}>
      <View style={[cardSt.typeBar, { backgroundColor: `${config.text}15` }]}>
        <Text style={[cardSt.typeName, { color: config.text }]}>{leave.leaveType}</Text>
      </View>

      <View style={cardSt.body}>
        <View style={{ flex: 1 }}>
          <Text style={cardSt.dateRange}>
            {formatDate(leave.fromDate)}
            {leave.fromDate !== leave.toDate ? ` – ${formatDate(leave.toDate)}` : ''}
          </Text>
          <Text style={cardSt.dayCount}>
            {dayCount} {dayCount === 1 ? 'day' : 'days'}
          </Text>
          <Text style={cardSt.reason} numberOfLines={2}>{leave.reason}</Text>
          <Text style={cardSt.applied}>Applied {formatDate(leave.appliedAt)}</Text>
        </View>

        <View style={[cardSt.statusBadge, { backgroundColor: config.bg }]}>
          <Feather name={config.icon} size={12} color={config.text} />
          <Text style={[cardSt.statusText, { color: config.text }]}>{leave.status}</Text>
        </View>
      </View>
    </View>
  );
}

const cardSt = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: VITANA_COLORS.border,
    overflow: 'hidden',
  },
  typeBar: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: VITANA_COLORS.border,
  },
  typeName: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  body: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    gap: 12,
  },
  dateRange: {
    fontSize: 14,
    fontWeight: '600',
    color: VITANA_COLORS.text,
    fontFamily: 'Inter',
  },
  dayCount: {
    fontSize: 12,
    color: VITANA_COLORS.textSecondary,
    fontFamily: 'Inter',
    marginTop: 2,
  },
  reason: {
    fontSize: 13,
    color: VITANA_COLORS.textSecondary,
    lineHeight: 18,
    fontFamily: 'Inter',
    marginTop: 6,
  },
  applied: {
    fontSize: 11,
    color: VITANA_COLORS.textSecondary,
    fontFamily: 'Inter',
    marginTop: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function LeaveStatus() {
  const { primaryColor } = useSchoolTheme();

  const { data: rawLeaves, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['own-leaves'],
    queryFn: teacherApi.getOwnLeaves,
    staleTime: 5 * 60 * 1000,
  });

  const data: OwnLeaveApplication[] = Array.isArray(rawLeaves) ? rawLeaves : [];

  const { data: balanceRaw, isLoading: balLoading } = useQuery({
    queryKey: ['leave-balance'],
    queryFn: teacherApi.getLeaveBalance,
    staleTime: 5 * 60 * 1000,
  });
  const balanceList = Array.isArray(balanceRaw) ? balanceRaw : [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: VITANA_COLORS.surface }} edges={['top']}>
      {/* Header */}
      <View style={hdrSt.row}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="arrow-left" size={22} color={VITANA_COLORS.text} />
        </TouchableOpacity>
        <Text style={hdrSt.title}>My Leave Applications</Text>
        <TouchableOpacity
          onPress={() => router.push('/(teacher)/leaves/apply')}
          style={[hdrSt.applyBtn, { backgroundColor: primaryColor }]}
        >
          <Feather name="plus" size={14} color="#fff" />
          <Text style={hdrSt.applyText}>Apply</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={primaryColor} />}
      >
        <View style={{ padding: 16, paddingBottom: 40, gap: 16 }}>

          {/* ── Balance summary ──────────────────────────────── */}
          <View>
            <Text style={secSt.label}>Leave Balance</Text>
            {balLoading ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {[1, 2, 3].map((i) => (
                    <SkeletonLoader key={i} height={110} width={120} borderRadius={14} />
                  ))}
                </View>
              </ScrollView>
            ) : balanceList.length === 0 ? (
              <View style={secSt.noBalance}>
                <Feather name="info" size={14} color={VITANA_COLORS.textSecondary} />
                <Text style={secSt.noBalanceText}>Balance will appear after your first leave request</Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginHorizontal: -16 }}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
              >
                {balanceList.map((b) => <BalanceMiniCard key={b.leaveTypeId} bal={b} />)}
              </ScrollView>
            )}
          </View>

          {/* ── Applications list ────────────────────────────── */}
          <View>
            <Text style={secSt.label}>Applications</Text>
            {isLoading ? (
              [1, 2, 3].map((i) => <SkeletonCard key={i} lines={3} />)
            ) : !data || data.length === 0 ? (
              <EmptyState
                icon="calendar"
                title="No leave applications"
                subtitle="Tap 'Apply' to submit your first leave request."
              />
            ) : (
              <View style={{ gap: 10 }}>
                {data.map((leave) => <LeaveCard key={leave.id} leave={leave} />)}
              </View>
            )}
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const hdrSt = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: VITANA_COLORS.border,
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: VITANA_COLORS.text,
    fontFamily: 'Inter',
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  applyText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
    fontFamily: 'Inter',
  },
});

const secSt = StyleSheet.create({
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: VITANA_COLORS.textSecondary,
    fontFamily: 'Inter',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  noBalance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 12,
  },
  noBalanceText: {
    fontSize: 12,
    color: VITANA_COLORS.textSecondary,
    fontFamily: 'Inter',
    flex: 1,
  },
});
