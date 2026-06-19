/**
 * AdminAlertBanner — contextual in-page notification banners for admin screens.
 *
 * Reads from the cached admin-dashboard query (no extra API call) and surfaces
 * alerts relevant to the screen it is placed on.
 *
 * Usage:
 *   <AdminAlertBanner context="fees" />
 *   <AdminAlertBanner context="attendance" />
 *   <AdminAlertBanner context="approvals" />
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { VITANA_COLORS } from '@/theme/tokens';
import { formatINR } from '@vitana/shared-utils';
import type { AdminDashboardResponse } from '@/api/endpoints/admin';

export type AdminAlertContext =
  | 'fees'
  | 'attendance'
  | 'approvals'
  | 'students'
  | 'staff'
  | 'admissions'
  | 'library'
  | 'announcements'
  | 'reports';

interface AlertConfig {
  icon: string;
  color: string;
  bg: string;
  border: string;
  title: string;
  subtitle?: string;
  route?: string;
  routeLabel?: string;
}

function buildAlerts(data: AdminDashboardResponse, context: AdminAlertContext): AlertConfig[] {
  const alerts: AlertConfig[] = [];

  const leaveCount      = data.pendingApprovals?.leaveRequests ?? 0;
  const admissionCount  = data.pendingApprovals?.admissionApplications ?? 0;
  const docsCount       = data.pendingApprovals?.documentVerifications ?? 0;
  const totalApprovals  = leaveCount + admissionCount + docsCount;
  const attendanceRate  = data.attendanceRate ?? 0;
  const overdueCount    = data.billingAlert?.overdueCount ?? 0;
  const overdueAmount   = data.billingAlert?.overdueAmount ?? 0;
  const unreadCount     = data.unreadCount ?? 0;

  switch (context) {
    case 'fees':
      if (overdueCount > 0) {
        alerts.push({
          icon: 'alert-triangle',
          color: '#dc2626',
          bg: '#fef2f2',
          border: '#fecaca',
          title: `${overdueCount} fee record${overdueCount !== 1 ? 's' : ''} are overdue`,
          subtitle: overdueAmount > 0 ? `Total outstanding: ${formatINR(overdueAmount)}` : 'Collect pending dues to resolve',
        });
      }
      if (data.feeCollection?.collectedToday === 0) {
        alerts.push({
          icon: 'info',
          color: '#2563eb',
          bg: '#eff6ff',
          border: '#dbeafe',
          title: 'No fees collected today yet',
          subtitle: `₹${formatINR(data.feeCollection?.collectedThisMonth ?? 0)} collected this month`,
        });
      }
      break;

    case 'attendance':
      if (attendanceRate < 75 && attendanceRate > 0) {
        alerts.push({
          icon: 'alert-triangle',
          color: '#dc2626',
          bg: '#fef2f2',
          border: '#fecaca',
          title: `Low attendance today — ${attendanceRate.toFixed(1)}%`,
          subtitle: 'School-wide attendance is below 75%. Review absentee list.',
        });
      } else if (attendanceRate === 0) {
        alerts.push({
          icon: 'clock',
          color: '#d97706',
          bg: '#fffbeb',
          border: '#fde68a',
          title: 'Attendance not marked yet today',
          subtitle: 'Teachers can mark attendance from their app. Records appear here once submitted.',
        });
      } else if (attendanceRate >= 75 && attendanceRate < 85) {
        alerts.push({
          icon: 'info',
          color: '#d97706',
          bg: '#fffbeb',
          border: '#fde68a',
          title: `Attendance at ${attendanceRate.toFixed(1)}% — could be better`,
          subtitle: 'Target 85%+ for healthy attendance.',
        });
      }
      break;

    case 'approvals':
      if (totalApprovals > 0) {
        const parts: string[] = [];
        if (leaveCount > 0)     parts.push(`${leaveCount} leave request${leaveCount !== 1 ? 's' : ''}`);
        if (admissionCount > 0) parts.push(`${admissionCount} admission${admissionCount !== 1 ? 's' : ''}`);
        if (docsCount > 0)      parts.push(`${docsCount} document${docsCount !== 1 ? 's' : ''}`);
        alerts.push({
          icon: 'clock',
          color: '#d97706',
          bg: '#fffbeb',
          border: '#fde68a',
          title: `${totalApprovals} item${totalApprovals !== 1 ? 's' : ''} waiting for your decision`,
          subtitle: parts.join(' · '),
        });
      }
      break;

    case 'students': {
      const inactive = (data.totalStudents ?? 0) - (data.activeStudents ?? 0);
      if (inactive > 0) {
        alerts.push({
          icon: 'user-x',
          color: '#d97706',
          bg: '#fffbeb',
          border: '#fde68a',
          title: `${inactive} student${inactive !== 1 ? 's' : ''} are inactive`,
          subtitle: `${data.activeStudents ?? 0} of ${data.totalStudents ?? 0} students are active`,
        });
      }
      if (admissionCount > 0) {
        alerts.push({
          icon: 'user-plus',
          color: '#2563eb',
          bg: '#eff6ff',
          border: '#dbeafe',
          title: `${admissionCount} admission application${admissionCount !== 1 ? 's' : ''} pending`,
          subtitle: 'Review and process pending admissions',
          route: '/(admin)/admissions',
          routeLabel: 'Go to Admissions',
        });
      }
      break;
    }

    case 'staff': {
      const inactiveStaff = (data.totalStaff ?? 0) - (data.activeStaff ?? 0);
      if (leaveCount > 0) {
        alerts.push({
          icon: 'calendar',
          color: '#d97706',
          bg: '#fffbeb',
          border: '#fde68a',
          title: `${leaveCount} staff leave request${leaveCount !== 1 ? 's' : ''} pending`,
          subtitle: 'Approve or reject pending leave applications',
          route: '/(admin)/approvals',
          routeLabel: 'Review Approvals',
        });
      }
      if (inactiveStaff > 0) {
        alerts.push({
          icon: 'info',
          color: '#64748b',
          bg: '#f8fafc',
          border: '#e2e8f0',
          title: `${inactiveStaff} staff member${inactiveStaff !== 1 ? 's' : ''} are inactive`,
          subtitle: `${data.activeStaff ?? 0} of ${data.totalStaff ?? 0} staff are active`,
        });
      }
      break;
    }

    case 'admissions':
      if (admissionCount > 0) {
        alerts.push({
          icon: 'user-check',
          color: '#2563eb',
          bg: '#eff6ff',
          border: '#dbeafe',
          title: `${admissionCount} application${admissionCount !== 1 ? 's' : ''} need review`,
          subtitle: 'Students are waiting for admission status update',
        });
      }
      break;

    case 'announcements':
      if (unreadCount > 0) {
        alerts.push({
          icon: 'bell',
          color: '#7c3aed',
          bg: '#f5f3ff',
          border: '#e9d5ff',
          title: `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`,
          subtitle: 'Check your notification center for updates',
          route: '/(admin)/notifications',
          routeLabel: 'View Notifications',
        });
      }
      break;

    case 'reports':
      if (attendanceRate < 75 && attendanceRate > 0) {
        alerts.push({
          icon: 'trending-down',
          color: '#dc2626',
          bg: '#fef2f2',
          border: '#fecaca',
          title: `Attendance at ${attendanceRate.toFixed(1)}% — below threshold`,
          subtitle: 'School-wide attendance needs attention',
        });
      }
      if (overdueCount > 0) {
        alerts.push({
          icon: 'dollar-sign',
          color: '#d97706',
          bg: '#fffbeb',
          border: '#fde68a',
          title: `${overdueCount} overdue fee record${overdueCount !== 1 ? 's' : ''}`,
          subtitle: `${formatINR(overdueAmount)} outstanding — follow up required`,
        });
      }
      break;

    case 'library':
      // Library-specific alerts would come from library analytics — no dashboard data for this
      break;
  }

  return alerts;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface AdminAlertBannerProps {
  context: AdminAlertContext;
  /** Extra top margin. Defaults to 0. */
  marginTop?: number;
}

export function AdminAlertBanner({ context, marginTop = 0 }: AdminAlertBannerProps) {
  const queryClient = useQueryClient();

  // Read from the already-cached dashboard response — no extra API call
  const data = queryClient.getQueryData<AdminDashboardResponse>(['admin-dashboard']);
  if (!data) return null;

  const alerts = buildAlerts(data, context);
  if (alerts.length === 0) return null;

  return (
    <View style={[styles.container, { marginTop }]}>
      {alerts.map((alert, i) => (
        <View
          key={i}
          style={[styles.banner, { backgroundColor: alert.bg, borderColor: alert.border }]}
        >
          <View style={[styles.iconWrap, { backgroundColor: `${alert.color}18` }]}>
            <Feather name={alert.icon as any} size={15} color={alert.color} />
          </View>
          <View style={styles.textCol}>
            <Text style={[styles.title, { color: alert.color }]}>{alert.title}</Text>
            {alert.subtitle ? <Text style={styles.subtitle}>{alert.subtitle}</Text> : null}
          </View>
          {alert.route ? (
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: alert.color }]}
              onPress={() => router.push(alert.route as any)}
              activeOpacity={0.7}
            >
              <Text style={[styles.actionText, { color: alert.color }]}>{alert.routeLabel ?? 'View'}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6, paddingHorizontal: 12, paddingTop: 8 },
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12,
    borderWidth: 1,
  },
  iconWrap: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  textCol: { flex: 1 },
  title: { fontSize: 12, fontWeight: '700', lineHeight: 16 },
  subtitle: { fontSize: 11, color: VITANA_COLORS.textSecondary, marginTop: 1, lineHeight: 15 },
  actionBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, flexShrink: 0 },
  actionText: { fontSize: 11, fontWeight: '700' },
});
