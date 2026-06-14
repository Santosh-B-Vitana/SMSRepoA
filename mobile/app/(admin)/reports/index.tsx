import React from 'react';
import { ScrollView, View, Text, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { adminApi, type AnalyticsDashboard } from '@/api/endpoints/admin';
import { useAppTheme } from '@/theme';
import { VITANA_COLORS } from '@/theme/tokens';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatINR } from '@vitana/shared-utils';

// Lazy-load victory-native so a missing Skia binary shows a fallback
// instead of crashing the entire route at import time.
let CartesianChart: any, Line: any, Bar: any, Area: any;
let skiaAvailable = false;
try {
  const victoryNative = require('victory-native');
  CartesianChart = victoryNative.CartesianChart;
  Line = victoryNative.Line;
  Bar = victoryNative.Bar;
  Area = victoryNative.Area;
  skiaAvailable = true;
} catch {
  skiaAvailable = false;
}

const CHART_HEIGHT = 180;

function SectionTitle({ title }: { title: string }) {
  return <Text className="text-base font-bold text-gray-900 mb-3">{title}</Text>;
}

function ChartCard({ children, isEmpty }: { children: React.ReactNode; isEmpty?: boolean }) {
  return (
    <View className="bg-white border border-gray-100 rounded-xl p-4 mb-4 shadow-sm">
      {isEmpty ? (
        <View className="h-44 items-center justify-center">
          <Text className="text-gray-400 text-sm">No data available</Text>
        </View>
      ) : (
        children
      )}
    </View>
  );
}

export default function AnalyticsReports() {
  const { colors } = useAppTheme();

  const { data, isLoading, refetch, isRefetching, isError } = useQuery<AnalyticsDashboard>({
    queryKey: ['admin-analytics'],
    queryFn: adminApi.getAnalytics,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="text-gray-500 text-sm mt-3">Loading analytics...</Text>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <EmptyState
          icon="alert-circle"
          title="Analytics unavailable"
          subtitle="Could not load analytics data. Pull down to retry."
        />
      </SafeAreaView>
    );
  }

  if (!skiaAvailable) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="px-4 pt-4 pb-2">
          <Text className="text-xl font-bold text-gray-900">Analytics & Reports</Text>
          <Text className="text-gray-500 text-sm mt-0.5">School-wide performance overview</Text>
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-4xl mb-3">📊</Text>
          <Text className="text-gray-700 font-semibold text-base text-center">Charts require updated app</Text>
          <Text className="text-gray-400 text-sm text-center mt-1">
            Install the latest build from the EAS dashboard to view analytics charts.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const attendanceTrend = data?.attendanceTrend ?? [];
  const feeBarChart = data?.feeBarChart ?? [];
  const classAttendance = data?.classAttendance ?? [];

  // victory-native v41 requires numeric x-axis — map date strings to indices
  const attendanceChartData = attendanceTrend.map((p, i) => ({ x: i, rate: p.rate, label: p.date }));
  const feeChartData = feeBarChart.map((p, i) => ({ x: i, amount: p.amount, label: p.date }));
  const classChartData = classAttendance.map((p, i) => ({ x: i, rate: p.rate, label: p.className }));

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-4 pt-4 pb-2">
        <Text className="text-xl font-bold text-gray-900">Analytics & Reports</Text>
        <Text className="text-gray-500 text-sm mt-0.5">School-wide performance overview</Text>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-2"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        {/* 7-Day Attendance Trend */}
        <SectionTitle title="7-Day Attendance Trend" />
        <ChartCard isEmpty={attendanceChartData.length === 0}>
          {attendanceChartData.length > 0 && (
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
                  formatXLabel: (val) => {
                    const idx = Math.round(val);
                    return attendanceChartData[idx]?.label?.slice(5) ?? '';
                  },
                  formatYLabel: (val) => `${val}%`,
                  labelColor: VITANA_COLORS.textSecondary,
                }}
              >
                {({ points, chartBounds }) => (
                  <>
                    <Area
                      points={points.rate}
                      y0={chartBounds.bottom}
                      color={colors.primary}
                      opacity={0.15}
                      animate={{ type: 'spring' }}
                    />
                    <Line
                      points={points.rate}
                      color={colors.primary}
                      strokeWidth={2.5}
                      animate={{ type: 'spring' }}
                    />
                  </>
                )}
              </CartesianChart>
            </View>
          )}
          <View className="flex-row justify-between mt-2">
            {attendanceTrend.slice(-3).map((p) => (
              <View key={p.date} className="items-center">
                <Text className="text-xs text-gray-400">{p.date.slice(5)}</Text>
                <Text
                  className="text-sm font-semibold"
                  style={{
                    color:
                      p.rate >= 85
                        ? VITANA_COLORS.success
                        : p.rate >= 75
                          ? VITANA_COLORS.warning
                          : VITANA_COLORS.error,
                  }}
                >
                  {p.rate.toFixed(1)}%
                </Text>
              </View>
            ))}
          </View>
        </ChartCard>

        {/* Fee Collection Bar Chart */}
        <SectionTitle title="Fee Collection (Monthly)" />
        <ChartCard isEmpty={feeChartData.length === 0}>
          {feeChartData.length > 0 && (
            <View style={{ height: CHART_HEIGHT }}>
              <CartesianChart
                data={feeChartData}
                xKey="x"
                yKeys={['amount']}
                domainPadding={{ left: 20, right: 20, top: 20, bottom: 0 }}
                axisOptions={{
                  font: undefined,
                  tickCount: { x: Math.min(feeChartData.length, 6), y: 4 },
                  formatXLabel: (val) => {
                    const idx = Math.round(val);
                    return feeChartData[idx]?.label?.slice(8) ?? '';
                  },
                  formatYLabel: (val) =>
                    val >= 100000 ? `${(val / 100000).toFixed(1)}L` : `${(val / 1000).toFixed(0)}K`,
                  labelColor: VITANA_COLORS.textSecondary,
                }}
              >
                {({ points, chartBounds }) => (
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
          )}
          {feeBarChart.length > 0 && (
            <View className="flex-row justify-between mt-2 pt-2 border-t border-gray-50">
              <View>
                <Text className="text-gray-400 text-xs">Total this period</Text>
                <Text className="text-gray-900 font-semibold text-sm">
                  {formatINR(feeBarChart.reduce((s, p) => s + p.amount, 0))}
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-gray-400 text-xs">Peak day</Text>
                <Text className="text-gray-900 font-semibold text-sm">
                  {formatINR(Math.max(...feeBarChart.map((p) => p.amount)))}
                </Text>
              </View>
            </View>
          )}
        </ChartCard>

        {/* Class-wise Attendance */}
        <SectionTitle title="Class-wise Attendance" />
        <ChartCard isEmpty={classChartData.length === 0}>
          {classChartData.length > 0 && (
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
                  formatXLabel: (val) => {
                    const idx = Math.round(val);
                    const label = classChartData[idx]?.label ?? '';
                    return label.length > 6 ? label.slice(0, 6) : label;
                  },
                  formatYLabel: (val) => `${val}%`,
                  labelColor: VITANA_COLORS.textSecondary,
                }}
              >
                {({ points, chartBounds }) => (
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
          )}
          {/* Worst / Best performers */}
          {classAttendance.length >= 2 && (
            <View className="flex-row justify-between mt-2 pt-2 border-t border-gray-50">
              <View>
                <Text className="text-gray-400 text-xs">Best class</Text>
                <Text className="text-green-600 font-semibold text-sm">
                  {
                    classAttendance.reduce((best, c) => (c.rate > best.rate ? c : best))
                      .className
                  }
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-gray-400 text-xs">Needs attention</Text>
                <Text className="text-red-500 font-semibold text-sm">
                  {
                    classAttendance.reduce((worst, c) => (c.rate < worst.rate ? c : worst))
                      .className
                  }
                </Text>
              </View>
            </View>
          )}
        </ChartCard>

        <View className="h-6" />
      </ScrollView>
    </SafeAreaView>
  );
}
