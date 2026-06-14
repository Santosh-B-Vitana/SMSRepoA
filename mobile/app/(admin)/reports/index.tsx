import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { adminApi, type AnalyticsDashboard } from '@/api/endpoints/admin';
import { useAppTheme } from '@/theme';
import { VITANA_COLORS } from '@/theme/tokens';
import { formatINR } from '@vitana/shared-utils';

// Lazy-load victory-native so a missing Skia binary shows a fallback
let CartesianChart: any, Line: any, Bar: any, Area: any;
let skiaAvailable = false;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('victory-native');
  const ns = mod?.default ?? mod;
  CartesianChart = ns?.CartesianChart;
  Line = ns?.Line;
  Bar = ns?.Bar;
  Area = ns?.Area;
  skiaAvailable = !!(CartesianChart && Line && Bar && Area);
} catch {
  skiaAvailable = false;
}

const CHART_HEIGHT = 180;

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function ChartCard({ children, isEmpty }: { children: React.ReactNode; isEmpty?: boolean }) {
  return (
    <View style={styles.card}>
      {isEmpty ? (
        <View style={styles.emptyChartPlaceholder}>
          <Feather name="bar-chart-2" size={28} color={VITANA_COLORS.border} />
          <Text style={styles.noDataText}>No data available</Text>
          <Text style={styles.noDataSub}>Data will appear once attendance and fee records are added</Text>
        </View>
      ) : (
        children
      )}
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AnalyticsReports() {
  const { colors } = useAppTheme();

  const { data, isLoading, refetch, isRefetching, isError } = useQuery<AnalyticsDashboard>({
    queryKey: ['admin-analytics'],
    queryFn: adminApi.getAnalytics,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safe, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: VITANA_COLORS.textSecondary, fontSize: 13, marginTop: 10 }}>
          Loading analytics...
        </Text>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.errorBox}>
          <Feather name="alert-circle" size={36} color={VITANA_COLORS.error} />
          <Text style={styles.errorTitle}>Analytics unavailable</Text>
          <Text style={styles.errorSub}>Could not load analytics data.</Text>
          <TouchableOpacity onPress={() => void refetch()} style={[styles.retryBtn, { backgroundColor: colors.primary }]}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const attendanceTrend = data?.attendanceTrend ?? [];
  const feeBarChart = data?.feeBarChart ?? [];
  const classAttendance = data?.classAttendance ?? [];

  const attendanceChartData = attendanceTrend.map((p, i) => ({ x: i, rate: p.rate, label: p.date }));
  const feeChartData = feeBarChart.map((p, i) => ({ x: i, amount: p.amount, label: p.date }));
  const classChartData = classAttendance.map((p, i) => ({ x: i, rate: p.rate, label: p.className }));

  // Overview stats from /analytics/overview
  const overviewStats = [
    {
      label: 'Students',
      value: data?.activeStudents ?? 0,
      sub: data?.totalStudents ? `of ${data.totalStudents} total` : undefined,
      icon: 'users' as const,
      color: colors.primary,
      onPress: () => router.push('/(admin)/students/index' as never),
    },
    {
      label: 'Staff',
      value: data?.activeStaff ?? 0,
      sub: data?.totalStaff ? `of ${data.totalStaff} total` : undefined,
      icon: 'briefcase' as const,
      color: '#7c3aed',
      onPress: () => router.push('/(admin)/staff/index' as never),
    },
    {
      label: 'Classes',
      value: data?.totalClasses ?? 0,
      sub: undefined,
      icon: 'book-open' as const,
      color: '#059669',
      onPress: undefined,
    },
    {
      label: 'Attendance Today',
      value: `${(data?.todayAttendancePercentage ?? 0).toFixed(1)}%`,
      sub: undefined,
      icon: 'user-check' as const,
      color: (data?.todayAttendancePercentage ?? 0) >= 75 ? '#059669' : VITANA_COLORS.warning,
      onPress: undefined,
    },
    {
      label: 'Library',
      value: data?.booksIssued ?? 0,
      sub: data?.totalBooks ? `of ${data.totalBooks} books` : undefined,
      icon: 'book' as const,
      color: '#0891b2',
      onPress: () => router.push('/(admin)/library/index' as never),
    },
    {
      label: 'Hostel Occupied',
      value: data?.hostelOccupied ?? 0,
      sub: undefined,
      icon: 'home' as const,
      color: '#db2777',
      onPress: undefined,
    },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Analytics & Reports</Text>
          <Text style={styles.headerSub}>School-wide performance overview</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/(admin)/notifications/settings')}
          style={styles.settingsBtn}
        >
          <Feather name="settings" size={18} color={VITANA_COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
        }
      >
        {/* ── Overview Stats Grid ─────────────────────────────────────── */}
        <SectionTitle title="School Overview" />
        <View style={styles.statsGrid}>
          {overviewStats.map((stat) => (
            <TouchableOpacity
              key={stat.label}
              style={styles.statCard}
              onPress={stat.onPress}
              activeOpacity={stat.onPress ? 0.7 : 1}
            >
              <View style={[styles.statIconWrap, { backgroundColor: `${stat.color}15` }]}>
                <Feather name={stat.icon} size={18} color={stat.color} />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              {stat.sub && <Text style={styles.statSub}>{stat.sub}</Text>}
              <Text style={styles.statLabel}>{stat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Transport & Admissions ───────────────────────────────────── */}
        {((data?.transportStudents ?? 0) > 0 || (data?.pendingAdmissions ?? 0) > 0) && (
          <>
            <SectionTitle title="Other Highlights" />
            <View style={styles.highlightRow}>
              {(data?.transportStudents ?? 0) > 0 && (
                <View style={styles.highlightItem}>
                  <Feather name="truck" size={20} color="#f59e0b" />
                  <Text style={styles.highlightValue}>{data!.transportStudents}</Text>
                  <Text style={styles.highlightLabel}>Transport Students</Text>
                </View>
              )}
              {(data?.pendingAdmissions ?? 0) > 0 && (
                <View style={styles.highlightItem}>
                  <Feather name="user-plus" size={20} color="#ef4444" />
                  <Text style={styles.highlightValue}>{data!.pendingAdmissions}</Text>
                  <Text style={styles.highlightLabel}>Pending Admissions</Text>
                </View>
              )}
            </View>
          </>
        )}

        {/* ── Attendance Trend Chart ───────────────────────────────────── */}
        <SectionTitle title="7-Day Attendance Trend" />
        <ChartCard isEmpty={attendanceChartData.length === 0}>
          {attendanceChartData.length > 0 && skiaAvailable && (
            <View style={{ height: CHART_HEIGHT }}>
              <CartesianChart
                data={attendanceChartData}
                xKey="x"
                yKeys={['rate']}
                domainPadding={{ left: 10, right: 10, top: 20, bottom: 0 }}
                domain={{ y: [0, 100] }}
                axisOptions={{
                  font: undefined,
                  tickCount: { x: Math.min(attendanceChartData.length, 7), y: 5 },
                  formatXLabel: (val: number) => attendanceChartData[Math.round(val)]?.label?.slice(5) ?? '',
                  formatYLabel: (val: number) => `${val}%`,
                  labelColor: VITANA_COLORS.textSecondary,
                }}
              >
                {({ points, chartBounds }: any) => (
                  <>
                    <Area points={points.rate} y0={chartBounds.bottom} color={colors.primary} opacity={0.15} animate={{ type: 'spring' }} />
                    <Line points={points.rate} color={colors.primary} strokeWidth={2.5} animate={{ type: 'spring' }} />
                  </>
                )}
              </CartesianChart>
            </View>
          )}
        </ChartCard>

        {/* ── Fee Collection Chart ─────────────────────────────────────── */}
        <SectionTitle title="Fee Collection (Monthly)" />
        <ChartCard isEmpty={feeChartData.length === 0}>
          {feeChartData.length > 0 && skiaAvailable && (
            <View style={{ height: CHART_HEIGHT }}>
              <CartesianChart
                data={feeChartData}
                xKey="x"
                yKeys={['amount']}
                domainPadding={{ left: 20, right: 20, top: 20, bottom: 0 }}
                axisOptions={{
                  font: undefined,
                  tickCount: { x: Math.min(feeChartData.length, 6), y: 4 },
                  formatXLabel: (val: number) => feeChartData[Math.round(val)]?.label?.slice(8) ?? '',
                  formatYLabel: (val: number) =>
                    val >= 100000 ? `${(val / 100000).toFixed(1)}L` : `${(val / 1000).toFixed(0)}K`,
                  labelColor: VITANA_COLORS.textSecondary,
                }}
              >
                {({ points, chartBounds }: any) => (
                  <Bar points={points.amount} chartBounds={chartBounds} color={colors.primary} roundedCorners={{ topLeft: 4, topRight: 4 }} animate={{ type: 'spring' }} />
                )}
              </CartesianChart>
            </View>
          )}
        </ChartCard>

        {/* ── Class-wise Attendance Chart ──────────────────────────────── */}
        <SectionTitle title="Class-wise Attendance" />
        <ChartCard isEmpty={classChartData.length === 0}>
          {classChartData.length > 0 && skiaAvailable && (
            <View style={{ height: Math.max(CHART_HEIGHT, classChartData.length * 28) }}>
              <CartesianChart
                data={classChartData}
                xKey="x"
                yKeys={['rate']}
                domainPadding={{ left: 10, right: 20, top: 10, bottom: 0 }}
                domain={{ y: [0, 100] }}
                axisOptions={{
                  font: undefined,
                  tickCount: { x: Math.min(classChartData.length, 8), y: 5 },
                  formatXLabel: (val: number) => {
                    const label = classChartData[Math.round(val)]?.label ?? '';
                    return label.length > 6 ? label.slice(0, 6) : label;
                  },
                  formatYLabel: (val: number) => `${val}%`,
                  labelColor: VITANA_COLORS.textSecondary,
                }}
              >
                {({ points, chartBounds }: any) => (
                  <Bar points={points.rate} chartBounds={chartBounds} color={VITANA_COLORS.accent} roundedCorners={{ topLeft: 4, topRight: 4 }} animate={{ type: 'spring' }} />
                )}
              </CartesianChart>
            </View>
          )}
        </ChartCard>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#f5f7fa',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: VITANA_COLORS.text,
    fontFamily: 'Poppins',
  },
  headerSub: {
    fontSize: 12,
    color: VITANA_COLORS.textSecondary,
    marginTop: 2,
  },
  settingsBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: VITANA_COLORS.text,
    fontFamily: 'Poppins',
    marginBottom: 10,
    marginTop: 4,
  },
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyChartPlaceholder: {
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  noDataText: {
    fontSize: 14,
    fontWeight: '500',
    color: VITANA_COLORS.textSecondary,
  },
  noDataSub: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 14,
    padding: 14,
    width: '47%',
    flexGrow: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    gap: 4,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: VITANA_COLORS.text,
    fontFamily: 'Poppins',
  },
  statSub: {
    fontSize: 11,
    color: '#9ca3af',
  },
  statLabel: {
    fontSize: 13,
    color: VITANA_COLORS.textSecondary,
    fontFamily: 'Inter',
  },
  highlightRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  highlightItem: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  highlightValue: {
    fontSize: 22,
    fontWeight: '700',
    color: VITANA_COLORS.text,
  },
  highlightLabel: {
    fontSize: 12,
    color: VITANA_COLORS.textSecondary,
    textAlign: 'center',
  },
  errorBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: VITANA_COLORS.text,
  },
  errorSub: {
    fontSize: 13,
    color: VITANA_COLORS.textSecondary,
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
