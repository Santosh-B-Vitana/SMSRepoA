import React, { useState } from 'react';
import {
  ScrollView, View, Text, TouchableOpacity, ActivityIndicator,
  RefreshControl, StyleSheet, Modal, FlatList, Share, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { adminApi, type AnalyticsDashboard } from '@/api/endpoints/admin';
import { useAppTheme } from '@/theme';
import { VITANA_COLORS } from '@/theme/tokens';

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

// ─── SVG-free fallback charts (no Skia dependency) ────────────────────────────

function FallbackLineChart({ points, color }: {
  points: { value: number; label: string }[];
  color: string;
}) {
  if (!points.length) return null;
  const max = Math.max(...points.map(p => p.value), 1);
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 80, gap: 2, paddingHorizontal: 4 }}>
        {points.map((p, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
            <View style={{
              width: '70%', borderRadius: 3,
              height: Math.max(4, (p.value / max) * 72),
              backgroundColor: color, opacity: 0.85,
            }} />
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', paddingHorizontal: 4, gap: 2 }}>
        {points.map((p, i) => (
          <Text key={i} style={{ flex: 1, fontSize: 8, color: VITANA_COLORS.textSecondary, textAlign: 'center' }} numberOfLines={1}>
            {p.label.slice(-5)}
          </Text>
        ))}
      </View>
    </View>
  );
}

function FallbackBarChart({ points, color, formatValue }: {
  points: { value: number; label: string }[];
  color: string;
  formatValue?: (v: number) => string;
}) {
  if (!points.length) return null;
  const max = Math.max(...points.map(p => p.value), 1);
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 90, gap: 4, paddingHorizontal: 4 }}>
        {points.map((p, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
            <Text style={{ fontSize: 8, color: VITANA_COLORS.textSecondary }} numberOfLines={1}>
              {formatValue ? formatValue(p.value) : String(p.value)}
            </Text>
            <View style={{
              width: '70%', borderRadius: 3,
              height: Math.max(4, (p.value / max) * 68),
              backgroundColor: color,
            }} />
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', paddingHorizontal: 4, gap: 4 }}>
        {points.map((p, i) => (
          <Text key={i} style={{ flex: 1, fontSize: 8, color: VITANA_COLORS.textSecondary, textAlign: 'center' }} numberOfLines={1}>
            {p.label.slice(-5)}
          </Text>
        ))}
      </View>
    </View>
  );
}

function FallbackHorizontalBar({ items, color }: {
  items: { label: string; value: number }[];
  color: string;
}) {
  const max = Math.max(...items.map(i => i.value), 1);
  return (
    <View style={{ gap: 8 }}>
      {items.slice(0, 8).map((item, i) => {
        const pct = (item.value / max) * 100;
        const barColor = item.value >= 75 ? '#059669' : item.value >= 60 ? '#d97706' : '#dc2626';
        return (
          <View key={i} style={{ gap: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12, color: VITANA_COLORS.text, fontWeight: '500' }} numberOfLines={1}>
                {item.label}
              </Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: barColor }}>{item.value.toFixed(0)}%</Text>
            </View>
            <View style={{ height: 6, backgroundColor: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
              <View style={{ height: 6, width: `${pct}%` as any, backgroundColor: barColor, borderRadius: 3 }} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && onAction && (
        <TouchableOpacity onPress={onAction} activeOpacity={0.7}>
          <Text style={styles.sectionAction}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
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

// ─── Attendance Detail Modal ──────────────────────────────────────────────────

function AttendanceModal({
  visible,
  onClose,
  classAttendance,
  todayPct,
}: {
  visible: boolean;
  onClose: () => void;
  classAttendance: { className: string; rate: number; present: number; total: number }[];
  todayPct: number;
}) {
  const attColor = todayPct >= 75 ? '#059669' : todayPct >= 60 ? VITANA_COLORS.warning : '#ef4444';
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f7fa' }}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Today's Attendance</Text>
          <TouchableOpacity onPress={onClose} style={styles.modalClose}>
            <Feather name="x" size={20} color={VITANA_COLORS.text} />
          </TouchableOpacity>
        </View>

        {/* Overall rate */}
        <View style={styles.modalHeroCard}>
          <Text style={[styles.modalHeroValue, { color: attColor }]}>{todayPct.toFixed(1)}%</Text>
          <Text style={styles.modalHeroLabel}>School-wide attendance today</Text>
          <View style={styles.attBarTrack}>
            <View style={[styles.attBarFill, { width: `${Math.min(todayPct, 100)}%` as any, backgroundColor: attColor }]} />
          </View>
          <Text style={[styles.attBarNote, { color: attColor }]}>
            {todayPct >= 90 ? 'Excellent attendance!' : todayPct >= 75 ? 'Good attendance' : 'Below threshold — check absent students'}
          </Text>
        </View>

        {/* Class-wise list */}
        <Text style={[styles.sectionTitle, { paddingHorizontal: 16, marginTop: 8 }]}>Class-wise Breakdown</Text>
        {classAttendance.length === 0 ? (
          <View style={{ padding: 32, alignItems: 'center', gap: 8 }}>
            <Feather name="calendar" size={32} color={VITANA_COLORS.border} />
            <Text style={{ color: VITANA_COLORS.textSecondary, fontSize: 14 }}>No class attendance data yet</Text>
          </View>
        ) : (
          <FlatList
            data={classAttendance}
            keyExtractor={(item) => item.className}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, gap: 8 }}
            renderItem={({ item }) => {
              const c = item.rate >= 75 ? '#059669' : item.rate >= 60 ? VITANA_COLORS.warning : '#ef4444';
              return (
                <View style={styles.classRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.className}>{item.className}</Text>
                    {item.total > 0 && (
                      <Text style={styles.classMeta}>{item.present} / {item.total} students present</Text>
                    )}
                  </View>
                  <View style={[styles.rateBadge, { backgroundColor: `${c}15` }]}>
                    <Text style={[styles.rateText, { color: c }]}>{item.rate.toFixed(0)}%</Text>
                  </View>
                </View>
              );
            }}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AnalyticsReports() {
  const { colors } = useAppTheme();
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);

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
          <TouchableOpacity
            onPress={() => void refetch()}
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const attendanceTrend  = data?.attendanceTrend  ?? [];
  const feeBarChart      = data?.feeBarChart      ?? [];
  const classAttendance  = data?.classAttendance  ?? [];
  const todayPct         = data?.todayAttendancePercentage ?? 0;

  const attendanceChartData = attendanceTrend.map((p, i)  => ({ x: i, rate: p.rate, label: p.date }));
  const feeChartData        = feeBarChart.map((p, i)      => ({ x: i, amount: p.amount, label: p.date }));
  const classChartData      = classAttendance.map((p, i)  => ({ x: i, rate: p.rate, label: p.className }));

  // ─── Stat cards ────────────────────────────────────────────────────────────
  // Each card: what it shows, where it goes, what action label to show
  const overviewStats = [
    {
      label: 'Students',
      value: data?.activeStudents ?? 0,
      sub: data?.totalStudents ? `of ${data.totalStudents} total` : 'enrolled',
      hint: 'View directory',
      icon: 'users' as const,
      color: colors.primary,
      tappable: true,
      onPress: () => router.push('/(admin)/students' as never),
    },
    {
      label: 'Staff',
      value: data?.activeStaff ?? 0,
      sub: data?.totalStaff ? `of ${data.totalStaff} total` : 'active',
      hint: 'View directory',
      icon: 'briefcase' as const,
      color: '#7c3aed',
      tappable: true,
      onPress: () => router.push('/(admin)/staff' as never),
    },
    {
      label: 'Classes',
      value: data?.totalClasses ?? 0,
      sub: 'active this year',
      hint: 'View students',
      icon: 'book-open' as const,
      color: '#059669',
      tappable: true,
      onPress: () => router.push('/(admin)/students' as never),
    },
    {
      label: 'Attendance Today',
      value: `${todayPct.toFixed(1)}%`,
      sub: todayPct >= 75 ? 'On track' : todayPct === 0 ? 'Not marked yet' : 'Below threshold',
      hint: 'See class-wise',
      icon: 'user-check' as const,
      color: todayPct >= 75 ? '#059669' : todayPct === 0 ? VITANA_COLORS.textSecondary : VITANA_COLORS.warning,
      tappable: true,
      onPress: () => setAttendanceModalOpen(true),
    },
    {
      label: 'Library',
      value: data?.booksIssued ?? 0,
      sub: data?.totalBooks ? `of ${data.totalBooks} books` : 'books issued',
      hint: 'Manage library',
      icon: 'book' as const,
      color: '#0891b2',
      tappable: true,
      onPress: () => router.push('/(admin)/library' as never),
    },
    {
      label: 'Hostel Occupied',
      value: data?.hostelOccupied ?? 0,
      sub: 'students in hostel',
      hint: 'View students',
      icon: 'home' as const,
      color: '#db2777',
      tappable: true,
      onPress: () => router.push('/(admin)/students' as never),
    },
  ];

  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  function handleExport() {
    if (!data) { Alert.alert('No Data', 'Analytics data is not loaded yet.'); return; }
    const summary = [
      `📊 School Analytics Report — ${today}`,
      ``,
      `SCHOOL OVERVIEW`,
      `Students: ${data.activeStudents ?? 0} active / ${data.totalStudents ?? 0} total`,
      `Staff: ${data.activeStaff ?? 0} active / ${data.totalStaff ?? 0} total`,
      `Classes: ${data.totalClasses ?? 0}`,
      ``,
      `ATTENDANCE`,
      `Today's Rate: ${(data.todayAttendancePercentage ?? 0).toFixed(1)}%`,
      ``,
      `LIBRARY`,
      `Books Issued: ${data.booksIssued ?? 0} / ${data.totalBooks ?? 0}`,
      ``,
      `OTHER`,
      `Hostel Occupied: ${data.hostelOccupied ?? 0}`,
      `Transport Students: ${data.transportStudents ?? 0}`,
      `Pending Admissions: ${data.pendingAdmissions ?? 0}`,
      ``,
      `Generated from School Admin App`,
    ].join('\n');

    void Share.share({
      title: 'School Analytics Report',
      message: summary,
    });
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Analytics & Reports</Text>
          <Text style={styles.headerSub}>As of {today}</Text>
        </View>
        <TouchableOpacity
          onPress={handleExport}
          style={styles.exportBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="share" size={18} color={colors.primary} />
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
        {/* ── Overview Stats Grid ───────────────────────────────────── */}
        <SectionTitle
          title="School Overview"
          action="All students"
          onAction={() => router.push('/(admin)/students' as never)}
        />
        <View style={styles.statsGrid}>
          {overviewStats.map((stat) => (
            <TouchableOpacity
              key={stat.label}
              style={[styles.statCard, stat.tappable && styles.statCardTappable]}
              onPress={stat.onPress}
              activeOpacity={stat.tappable ? 0.68 : 1}
            >
              {/* Icon row: icon left, chevron right */}
              <View style={styles.statCardTop}>
                <View style={[styles.statIconWrap, { backgroundColor: `${stat.color}18` }]}>
                  <Feather name={stat.icon} size={17} color={stat.color} />
                </View>
                {stat.tappable && (
                  <Feather name="chevron-right" size={13} color="#d1d5db" />
                )}
              </View>

              {/* Value */}
              <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
                {stat.value}
              </Text>

              {/* Sub-label */}
              {stat.sub ? (
                <Text style={styles.statSub} numberOfLines={1}>{stat.sub}</Text>
              ) : null}

              {/* Label */}
              <Text style={styles.statLabel} numberOfLines={1}>{stat.label}</Text>

              {/* CTA hint on its own line */}
              {stat.tappable && stat.hint ? (
                <Text style={[styles.statHint, { color: stat.color }]} numberOfLines={1}>
                  {stat.hint} →
                </Text>
              ) : null}
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Quick Actions ─────────────────────────────────────────── */}
        <SectionTitle title="Quick Actions" />
        <View style={styles.actionRow}>
          {[
            { label: 'Add Student', icon: 'user-plus', color: colors.primary, onPress: () => router.push('/(admin)/students' as never) },
            { label: 'Add Staff', icon: 'user-check', color: '#7c3aed', onPress: () => router.push('/(admin)/staff' as never) },
            { label: 'Approvals', icon: 'check-circle', color: '#059669', onPress: () => router.push('/(admin)/approvals' as never) },
            { label: 'Announce', icon: 'bell', color: '#f59e0b', onPress: () => router.push('/(admin)/announcements/create' as never) },
          ].map((action) => (
            <TouchableOpacity
              key={action.label}
              style={styles.actionBtn}
              onPress={action.onPress}
              activeOpacity={0.75}
            >
              <View style={[styles.actionIcon, { backgroundColor: `${action.color}15` }]}>
                <Feather name={action.icon as any} size={18} color={action.color} />
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Other Highlights ─────────────────────────────────────── */}
        {((data?.transportStudents ?? 0) > 0 || (data?.pendingAdmissions ?? 0) > 0) && (
          <>
            <SectionTitle title="Other Highlights" />
            <View style={styles.highlightRow}>
              {(data?.transportStudents ?? 0) > 0 && (
                <TouchableOpacity
                  style={styles.highlightItem}
                  onPress={() => router.push('/(admin)/students' as never)}
                  activeOpacity={0.7}
                >
                  <Feather name="truck" size={20} color="#f59e0b" />
                  <Text style={styles.highlightValue}>{data!.transportStudents}</Text>
                  <Text style={styles.highlightLabel}>Transport Students</Text>
                  <Text style={[styles.statHint, { color: '#f59e0b', fontSize: 10 }]}>View list →</Text>
                </TouchableOpacity>
              )}
              {(data?.pendingAdmissions ?? 0) > 0 && (
                <TouchableOpacity
                  style={[styles.highlightItem, { borderColor: '#fee2e2' }]}
                  onPress={() => router.push('/(admin)/approvals' as never)}
                  activeOpacity={0.7}
                >
                  <Feather name="user-plus" size={20} color="#ef4444" />
                  <Text style={styles.highlightValue}>{data!.pendingAdmissions}</Text>
                  <Text style={styles.highlightLabel}>Pending Admissions</Text>
                  <Text style={[styles.statHint, { color: '#ef4444', fontSize: 10 }]}>Review →</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        {/* ── Attendance Trend Chart ──────────────────────────────── */}
        <SectionTitle
          title="7-Day Attendance Trend"
          action="Class-wise"
          onAction={() => setAttendanceModalOpen(true)}
        />
        <ChartCard isEmpty={attendanceChartData.length === 0}>
          {attendanceChartData.length > 0 && (
            skiaAvailable ? (
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
            ) : (
              <FallbackLineChart
                color={colors.primary}
                points={attendanceChartData.map(p => ({ value: p.rate, label: p.label }))}
              />
            )
          )}
        </ChartCard>

        {/* ── Fee Collection Chart ────────────────────────────────── */}
        <SectionTitle title="Fee Collection (Monthly)" />
        <ChartCard isEmpty={feeChartData.length === 0}>
          {feeChartData.length > 0 && (
            skiaAvailable ? (
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
                    <Bar
                      points={points.amount}
                      chartBounds={chartBounds}
                      color={colors.primary}
                      roundedCorners={{ topLeft: 4, topRight: 4 }}
                      animate={{ type: 'spring' }}
                    />
                  )}
                </CartesianChart>
              </View>
            ) : (
              <FallbackBarChart
                color={colors.primary}
                points={feeChartData.map(p => ({ value: p.amount, label: p.label }))}
                formatValue={(v) => v >= 100000 ? `${(v / 100000).toFixed(1)}L` : `${(v / 1000).toFixed(0)}K`}
              />
            )
          )}
        </ChartCard>

        {/* ── Class-wise Attendance Chart ─────────────────────────── */}
        <SectionTitle
          title="Class-wise Attendance"
          action="Full breakdown"
          onAction={() => setAttendanceModalOpen(true)}
        />
        <ChartCard isEmpty={classChartData.length === 0}>
          {classChartData.length > 0 && (
            skiaAvailable ? (
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
                    <Bar
                      points={points.rate}
                      chartBounds={chartBounds}
                      color={VITANA_COLORS.accent}
                      roundedCorners={{ topLeft: 4, topRight: 4 }}
                      animate={{ type: 'spring' }}
                    />
                  )}
                </CartesianChart>
              </View>
            ) : (
              <FallbackHorizontalBar
                color={VITANA_COLORS.accent}
                items={classChartData.map(p => ({ label: p.label, value: p.rate }))}
              />
            )
          )}
        </ChartCard>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Attendance modal */}
      <AttendanceModal
        visible={attendanceModalOpen}
        onClose={() => setAttendanceModalOpen(false)}
        classAttendance={classAttendance as any}
        todayPct={todayPct}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: '#f5f7fa' },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, backgroundColor: '#f5f7fa' },
  headerTitle:     { fontSize: 20, fontWeight: '700', color: VITANA_COLORS.text, fontFamily: 'Poppins' },
  headerSub:       { fontSize: 12, color: VITANA_COLORS.textSecondary, marginTop: 2 },
  exportBtn:       { width: 38, height: 38, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e5e7eb' },
  settingsBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 },
  scrollContent:   { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 32 },
  sectionHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, marginTop: 4 },
  sectionTitle:    { fontSize: 15, fontWeight: '700', color: VITANA_COLORS.text, fontFamily: 'Poppins' },
  sectionAction:   { fontSize: 12, color: '#1a6fd8', fontWeight: '600' },
  card:            { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#f1f5f9', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  emptyChartPlaceholder: { height: 140, alignItems: 'center', justifyContent: 'center', gap: 8 },
  noDataText:      { fontSize: 14, fontWeight: '500', color: VITANA_COLORS.textSecondary },
  noDataSub:       { fontSize: 12, color: '#9ca3af', textAlign: 'center', paddingHorizontal: 20 },

  statsGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  statCard:        { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#f1f5f9', borderRadius: 14, padding: 12, width: '47%', flexGrow: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  statCardTappable:{ borderColor: '#e8edf5' },
  statCardTop:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  statIconWrap:    { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  statValue:       { fontSize: 22, fontWeight: '700', color: VITANA_COLORS.text, fontFamily: 'Poppins', marginBottom: 1 },
  statSub:         { fontSize: 11, color: '#9ca3af', marginBottom: 1 },
  statLabel:       { fontSize: 12, color: VITANA_COLORS.textSecondary, fontFamily: 'Inter', marginBottom: 3 },
  statHint:        { fontSize: 11, fontWeight: '600' },

  actionRow:       { flexDirection: 'row', gap: 10, marginBottom: 20 },
  actionBtn:       { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 12, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  actionIcon:      { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionLabel:     { fontSize: 11, fontWeight: '600', color: VITANA_COLORS.text, textAlign: 'center' },

  highlightRow:    { flexDirection: 'row', gap: 12, marginBottom: 20 },
  highlightItem:   { flex: 1, backgroundColor: '#ffffff', borderRadius: 14, padding: 16, alignItems: 'center', gap: 5, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  highlightValue:  { fontSize: 22, fontWeight: '700', color: VITANA_COLORS.text },
  highlightLabel:  { fontSize: 12, color: VITANA_COLORS.textSecondary, textAlign: 'center' },

  errorBox:        { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  errorTitle:      { fontSize: 16, fontWeight: '600', color: VITANA_COLORS.text },
  errorSub:        { fontSize: 13, color: VITANA_COLORS.textSecondary, textAlign: 'center' },
  retryBtn:        { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10, marginTop: 8 },
  retryText:       { color: '#fff', fontWeight: '600', fontSize: 14 },

  // Attendance modal
  modalHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', backgroundColor: '#fff' },
  modalTitle:      { fontSize: 17, fontWeight: '700', color: VITANA_COLORS.text, fontFamily: 'Poppins' },
  modalClose:      { width: 34, height: 34, borderRadius: 17, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  modalHeroCard:   { backgroundColor: '#fff', margin: 16, borderRadius: 16, padding: 20, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#f1f5f9' },
  modalHeroValue:  { fontSize: 44, fontWeight: '800', fontFamily: 'Poppins' },
  modalHeroLabel:  { fontSize: 13, color: VITANA_COLORS.textSecondary },
  attBarTrack:     { height: 8, width: '100%', backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden', marginTop: 8 },
  attBarFill:      { height: 8, borderRadius: 4 },
  attBarNote:      { fontSize: 12, fontWeight: '600', marginTop: 2 },
  classRow:        { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#f1f5f9' },
  className:       { fontSize: 14, fontWeight: '600', color: VITANA_COLORS.text },
  classMeta:       { fontSize: 12, color: VITANA_COLORS.textSecondary, marginTop: 2 },
  rateBadge:       { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  rateText:        { fontSize: 14, fontWeight: '700' },
});
