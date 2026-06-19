import { useState } from 'react';
import {
  View, Text, TouchableOpacity, Alert, ActivityIndicator,
  Platform, TextInput, Modal, KeyboardAvoidingView, FlatList, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { adminApi, type AdminLeaveRequest } from '@/api/endpoints/admin';
import { useAppTheme } from '@/theme';
import { VITANA_COLORS } from '@/theme/tokens';
import { EmptyState } from '@/components/ui/EmptyState';
import { SubScreenHeader } from '@/components/ui/SubScreenHeader';
import { queryClient } from '@/api/queryClient';
import { formatDate } from '@vitana/shared-utils';
import { apiClient } from '@/api/client';

type Tab = 'staff' | 'student' | 'admissions' | 'documents';

interface PendingDocument {
  id: string;
  studentName: string;
  admissionNumber?: string;
  documentType: string;
  fileName?: string;
  uploadedAt: string;
  verificationStatus: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysWaiting(appliedAt: string): number {
  return Math.floor((Date.now() - new Date(appliedAt).getTime()) / 86_400_000);
}

function urgencyConfig(days: number): { color: string; bg: string; label: string } {
  if (days >= 7) return { color: '#dc2626', bg: '#fef2f2', label: `${days}d waiting` };
  if (days >= 3) return { color: '#d97706', bg: '#fffbeb', label: `${days}d waiting` };
  return { color: '#2563eb', bg: '#eff6ff', label: days === 0 ? 'Today' : `${days}d ago` };
}

function leaveTypeConfig(typeName: string): { color: string; bg: string } {
  const lower = typeName.toLowerCase();
  if (lower.includes('sick') || lower.includes('medical')) return { color: '#dc2626', bg: '#fef2f2' };
  if (lower.includes('emergency')) return { color: '#d97706', bg: '#fffbeb' };
  if (lower.includes('casual')) return { color: '#2563eb', bg: '#eff6ff' };
  if (lower.includes('earned') || lower.includes('annual')) return { color: '#059669', bg: '#f0fdf4' };
  if (lower.includes('maternity') || lower.includes('paternity')) return { color: '#7c3aed', bg: '#f5f3ff' };
  return { color: '#64748b', bg: '#f1f5f9' };
}

// ─── Modals ───────────────────────────────────────────────────────────────────

function useRejectModal() {
  const [visible, setVisible] = useState(false);
  const [reason, setReason] = useState('');
  const [onConfirm, setOnConfirm] = useState<((r: string) => void) | null>(null);
  function prompt(callback: (r: string) => void) { setReason(''); setOnConfirm(() => callback); setVisible(true); }
  function confirm() { if (!reason.trim()) { Alert.alert('Required', 'Please enter a reason for rejection.'); return; } setVisible(false); onConfirm?.(reason.trim()); }
  return { visible, reason, setReason, prompt, confirm, cancel: () => setVisible(false) };
}

function useRemarkModal() {
  const [visible, setVisible] = useState(false);
  const [remark, setRemark] = useState('');
  const [onConfirm, setOnConfirm] = useState<((r?: string) => void) | null>(null);
  function prompt(callback: (r?: string) => void) { setRemark(''); setOnConfirm(() => callback); setVisible(true); }
  function confirm() { setVisible(false); onConfirm?.(remark.trim() || undefined); }
  return { visible, remark, setRemark, prompt, confirm, cancel: () => setVisible(false) };
}

function invalidateLeaveQueries(tab: Tab) {
  queryClient.invalidateQueries({ queryKey: ['pending-leaves', tab] });
  queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
}

// ─── Leave card ───────────────────────────────────────────────────────────────

function LeaveCard({ item, onApprove, onReject, isPending }: {
  item: AdminLeaveRequest;
  onApprove: () => void;
  onReject: () => void;
  isPending: boolean;
}) {
  const { colors } = useAppTheme();
  const name = item.staffName ?? item.studentName ?? 'Unknown';
  const waiting = daysWaiting(item.appliedAt);
  const urgency = urgencyConfig(waiting);
  const typeConf = leaveTypeConfig(item.leaveTypeName);
  const isHighUrgency = waiting >= 7;

  return (
    <View style={[styles.leaveCard, isHighUrgency && { borderLeftColor: '#dc2626', borderLeftWidth: 4 }]}>
      {/* Header row: name + urgency badge */}
      <View style={styles.cardHeaderRow}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarInitials}>
            {name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.applicantName}>{name}</Text>
          {item.className ? (
            <Text style={styles.applicantMeta}>Class: {item.className}</Text>
          ) : null}
        </View>
        {/* Urgency badge */}
        <View style={[styles.urgencyBadge, { backgroundColor: urgency.bg }]}>
          <Feather name="clock" size={10} color={urgency.color} />
          <Text style={[styles.urgencyText, { color: urgency.color }]}>{urgency.label}</Text>
        </View>
      </View>

      {/* Type + date row */}
      <View style={styles.typeDateRow}>
        <View style={[styles.typeTag, { backgroundColor: typeConf.bg }]}>
          <Text style={[styles.typeTagText, { color: typeConf.color }]}>{item.leaveTypeName || 'Leave'}</Text>
        </View>
        <View style={styles.daysBadge}>
          <Text style={styles.daysText}>{item.days} day{item.days !== 1 ? 's' : ''}</Text>
        </View>
      </View>

      {/* Date range */}
      <View style={styles.dateRow}>
        <Feather name="calendar" size={13} color={VITANA_COLORS.textSecondary} />
        <Text style={styles.dateText}>
          {formatDate(item.fromDate)} → {formatDate(item.toDate)}
        </Text>
      </View>

      {/* Reason */}
      {!!item.reason && (
        <View style={styles.reasonBox}>
          <Text style={styles.reasonText} numberOfLines={3}>"{item.reason}"</Text>
        </View>
      )}

      {/* High urgency warning */}
      {isHighUrgency && (
        <View style={styles.urgencyWarning}>
          <Feather name="alert-triangle" size={12} color="#dc2626" />
          <Text style={styles.urgencyWarningText}>Waiting {waiting} days — action needed</Text>
        </View>
      )}

      {/* Action buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          onPress={onReject}
          disabled={isPending}
          style={styles.rejectBtn}
          activeOpacity={0.75}
        >
          <Feather name="x-circle" size={15} color="#dc2626" />
          <Text style={styles.rejectBtnText}>Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onApprove}
          disabled={isPending}
          style={[styles.approveBtn, { backgroundColor: colors.primary }]}
          activeOpacity={0.75}
        >
          {isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Feather name="check-circle" size={15} color="#fff" />
              <Text style={styles.approveBtnText}>Approve</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function LeaveApprovals() {
  const [activeTab, setActiveTab] = useState<Tab>('staff');
  const { colors } = useAppTheme();
  const router = useRouter();
  const rejectModal = useRejectModal();
  const remarkModal = useRemarkModal();

  // Fetch leave requests for both tabs.
  // retry: false prevents multiple failed requests from each triggering the global error toast.
  // throwOnError: false keeps the error contained in the query — we show our own error state.
  const {
    data: staffLeaves, isLoading: staffLoading, isError: staffError, refetch: refetchStaff,
  } = useQuery<AdminLeaveRequest[]>({
    queryKey: ['pending-leaves', 'staff'],
    queryFn: () => adminApi.getPendingLeaves('staff'),
    staleTime: 2 * 60 * 1000,
    retry: false,
    throwOnError: false,
  });

  const {
    data: studentLeaves, isLoading: studentLoading, isError: studentError, refetch: refetchStudent,
  } = useQuery<AdminLeaveRequest[]>({
    queryKey: ['pending-leaves', 'student'],
    queryFn: () => adminApi.getPendingLeaves('student'),
    staleTime: 2 * 60 * 1000,
    retry: false,
    throwOnError: false,
  });

  // Secondary queries: only fetch when tab is active, errors are silent (badge-count only).
  const { data: pendingDocs, isLoading: docsLoading, refetch: docsRefetch } = useQuery<PendingDocument[]>({
    queryKey: ['pending-documents'],
    queryFn: () =>
      (apiClient.get('/documents', { params: { verificationStatus: 'pending', pageSize: 50 } }) as Promise<any>)
        .then((r: any) => {
          const arr = r?.items ?? r?.data ?? r;
          return Array.isArray(arr) ? arr : [];
        })
        .catch(() => [] as PendingDocument[]),  // silent — docs 403 must not block the whole screen
    enabled: activeTab === 'documents',
    staleTime: 2 * 60 * 1000,
    retry: false,
    throwOnError: false,
  });

  const { data: admissionsData } = useQuery<any>({
    queryKey: ['pending-admissions-approvals'],
    queryFn: () => adminApi.getAdmissions(1, 'Pending').catch(() => ({ items: [], totalCount: 0 })),
    enabled: activeTab === 'admissions',
    staleTime: 2 * 60 * 1000,
    retry: false,
    throwOnError: false,
  });

  const verifyDocMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'verified' | 'rejected' }) =>
      apiClient.put(`/documents/${id}/verify`, { verificationStatus: status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-documents'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
    onError: () => Alert.alert('Error', 'Failed to update document status.'),
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, remark, source }: { id: string; remark?: string; source: 'staff' | 'student' }) =>
      source === 'student' ? adminApi.approveStudentLeave(id, remark) : adminApi.approveLeave(id, remark),
    onSuccess: () => {
      invalidateLeaveQueries(activeTab);
      queryClient.invalidateQueries({ queryKey: ['pending-leaves', 'staff'] });
      queryClient.invalidateQueries({ queryKey: ['pending-leaves', 'student'] });
    },
    onError: () => Alert.alert('Error', 'Failed to approve leave. Please try again.'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason, source }: { id: string; reason: string; source: 'staff' | 'student' }) =>
      source === 'student' ? adminApi.rejectStudentLeave(id, reason) : adminApi.rejectLeave(id, reason),
    onSuccess: () => {
      invalidateLeaveQueries(activeTab);
      queryClient.invalidateQueries({ queryKey: ['pending-leaves', 'staff'] });
      queryClient.invalidateQueries({ queryKey: ['pending-leaves', 'student'] });
    },
    onError: () => Alert.alert('Error', 'Failed to reject leave. Please try again.'),
  });

  function handleApprove(item: AdminLeaveRequest) {
    const name = item.staffName ?? item.studentName ?? 'this person';
    const doApprove = (remark?: string) => approveMutation.mutate({ id: item.id, remark, source: item.leaveSource });
    if (Platform.OS === 'ios') {
      Alert.prompt('Approve Leave', `Add a remark for ${name} (optional):`,
        [{ text: 'Cancel', style: 'cancel' }, { text: 'Approve', onPress: (r) => doApprove(r?.trim() || undefined) }],
        'plain-text');
    } else {
      remarkModal.prompt((r) => doApprove(r));
    }
  }

  function handleReject(item: AdminLeaveRequest) {
    const name = item.staffName ?? item.studentName ?? 'this person';
    const doReject = (reason: string) => rejectMutation.mutate({ id: item.id, reason, source: item.leaveSource });
    if (Platform.OS === 'ios') {
      Alert.prompt('Reject Leave', `Reason for rejecting ${name}'s leave (required):`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Reject', style: 'destructive', onPress: (r) => { if (!r?.trim()) { Alert.alert('Required', 'Enter a rejection reason.'); return; } doReject(r.trim()); } },
        ], 'plain-text');
    } else {
      rejectModal.prompt((r) => doReject(r));
    }
  }

  const isPending = approveMutation.isPending || rejectMutation.isPending;

  // Use live query data for all counts; lazy-loaded tabs default to 0 until active.
  const staffCount     = staffLeaves?.length ?? 0;
  const studentCount   = studentLeaves?.length ?? 0;
  const docsCount      = activeTab === 'documents' && Array.isArray(pendingDocs)
    ? pendingDocs.length
    : 0;
  const admissionCount = admissionsData?.items?.length ?? admissionsData?.totalCount ?? 0;

  const totalPending = staffCount + studentCount + docsCount + admissionCount;

  const TABS = [
    { id: 'staff' as Tab,      label: 'Staff Leave',  count: staffCount,    icon: 'briefcase' },
    { id: 'student' as Tab,    label: 'Student Leave', count: studentCount,  icon: 'user' },
    { id: 'admissions' as Tab, label: 'Admissions',    count: admissionCount, icon: 'user-plus' },
    { id: 'documents' as Tab,  label: 'Documents',     count: docsCount,     icon: 'file-text' },
  ];

  const activeLeaves = activeTab === 'staff' ? staffLeaves : studentLeaves;
  const activeLoading = activeTab === 'staff' ? staffLoading : studentLoading;
  const activeError   = activeTab === 'staff' ? staffError  : studentError;
  const activeRefetch = activeTab === 'staff' ? refetchStaff : refetchStudent;

  return (
    <SafeAreaView style={styles.safe}>
      <SubScreenHeader title="Pending Approvals" />

      {/* Summary strip */}
      {totalPending > 0 ? (
        <View style={[styles.summaryStrip, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}30` }]}>
          <Feather name="clock" size={14} color={colors.primary} />
          <Text style={[styles.summaryText, { color: colors.primary }]}>
            <Text style={{ fontWeight: '800' }}>{totalPending}</Text> item{totalPending !== 1 ? 's' : ''} need your attention
          </Text>
        </View>
      ) : null}

      {/* Tab bar with counts */}
      <View style={styles.tabBar}>
        {TABS.map((t) => {
          const isActive = activeTab === t.id;
          return (
            <TouchableOpacity
              key={t.id}
              onPress={() => setActiveTab(t.id)}
              style={[styles.tabBtn, isActive && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
              activeOpacity={0.7}
            >
              <View style={styles.tabContent}>
                <Feather name={t.icon as any} size={13} color={isActive ? colors.primary : VITANA_COLORS.textSecondary} />
                <Text style={[styles.tabLabel, isActive && { color: colors.primary, fontWeight: '700' }]}>
                  {t.label}
                </Text>
                {t.count > 0 && (
                  <View style={[styles.tabBadge, { backgroundColor: isActive ? colors.primary : '#ef4444' }]}>
                    <Text style={styles.tabBadgeText}>{t.count}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Staff / Student Leave tabs ── */}
      {(activeTab === 'staff' || activeTab === 'student') && (
        activeLoading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : activeError ? (
          // Show a proper error state so admin knows data failed to load
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 }}>
            <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="wifi-off" size={26} color="#dc2626" />
            </View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: VITANA_COLORS.text }}>Could not load requests</Text>
            <Text style={{ fontSize: 13, color: VITANA_COLORS.textSecondary, textAlign: 'center', lineHeight: 19 }}>
              Unable to fetch {activeTab === 'staff' ? 'staff' : 'student'} leave requests.
              Check your connection to the server and try again.
            </Text>
            <TouchableOpacity
              style={{ backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 11, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}
              onPress={() => activeTab === 'staff' ? refetchStaff() : refetchStudent()}
            >
              <Feather name="refresh-cw" size={15} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : !activeLeaves || activeLeaves.length === 0 ? (
          <EmptyState
            icon="check-circle"
            title={`No pending ${activeTab === 'staff' ? 'staff' : 'student'} leave requests`}
            subtitle="All caught up! No requests waiting for your action."
          />
        ) : (
          <FlashList
            data={activeLeaves}
            estimatedItemSize={200}
            keyExtractor={(item) => item.id}
            refreshing={false}
            onRefresh={activeRefetch}
            contentContainerStyle={{ padding: 12, paddingBottom: 32 }}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            ListHeaderComponent={
              <View style={styles.listSectionHeader}>
                <Text style={styles.listSectionTitle}>
                  {activeLeaves.length} request{activeLeaves.length !== 1 ? 's' : ''} pending review
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <LeaveCard
                item={item}
                onApprove={() => handleApprove(item)}
                onReject={() => handleReject(item)}
                isPending={isPending}
              />
            )}
          />
        )
      )}

      {/* ── Admissions tab ── */}
      {activeTab === 'admissions' && (
        admissionCount === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 }}>
            <Feather name="check-circle" size={48} color={VITANA_COLORS.border} />
            <Text style={{ fontSize: 16, fontWeight: '600', color: VITANA_COLORS.text }}>No pending admissions</Text>
            <Text style={{ fontSize: 13, color: VITANA_COLORS.textSecondary, textAlign: 'center' }}>
              All admission applications have been processed.
            </Text>
            <TouchableOpacity
              style={[styles.openBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/(admin)/admissions')}
            >
              <Feather name="user-plus" size={15} color="#fff" />
              <Text style={styles.openBtnText}>View All Admissions</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={admissionsData?.items ?? []}
            keyExtractor={(item: any) => item.id}
            contentContainerStyle={{ padding: 12, paddingBottom: 32 }}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            ListHeaderComponent={
              <View style={styles.listSectionHeader}>
                <Text style={styles.listSectionTitle}>{admissionCount} applications pending review</Text>
                <TouchableOpacity onPress={() => router.push('/(admin)/admissions')}>
                  <Text style={[styles.viewAllText, { color: colors.primary }]}>View All →</Text>
                </TouchableOpacity>
              </View>
            }
            renderItem={({ item }: any) => (
              <TouchableOpacity
                style={styles.admissionCard}
                onPress={() => router.push('/(admin)/admissions')}
                activeOpacity={0.75}
              >
                <View style={[styles.admissionIconBg, { backgroundColor: `${colors.primary}15` }]}>
                  <Feather name="user-plus" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.admissionName}>{item.studentName}</Text>
                  <Text style={styles.admissionMeta}>
                    {item.gradeApplied ? `For ${item.gradeApplied}` : 'Grade not specified'}
                    {item.parentName ? ` · Parent: ${item.parentName}` : ''}
                  </Text>
                  <Text style={styles.admissionMeta}>
                    Submitted: {new Date(item.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: '#fef3c7', borderColor: '#fde68a' }]}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#92400e' }}>PENDING</Text>
                </View>
              </TouchableOpacity>
            )}
            ListFooterComponent={
              <TouchableOpacity
                style={[styles.openBtn, { backgroundColor: colors.primary, marginTop: 12 }]}
                onPress={() => router.push('/(admin)/admissions')}
              >
                <Feather name="external-link" size={15} color="#fff" />
                <Text style={styles.openBtnText}>Open Admissions Portal</Text>
              </TouchableOpacity>
            }
          />
        )
      )}

      {/* ── Documents tab ── */}
      {activeTab === 'documents' && (
        docsLoading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : !pendingDocs || pendingDocs.length === 0 ? (
          <EmptyState icon="file" title="No pending documents" subtitle="All document verifications are up to date." />
        ) : (
          <FlatList
            data={pendingDocs}
            keyExtractor={(d) => d.id}
            refreshing={false}
            onRefresh={docsRefetch}
            contentContainerStyle={{ padding: 12, paddingBottom: 32 }}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            ListHeaderComponent={
              <View style={styles.listSectionHeader}>
                <Text style={styles.listSectionTitle}>{pendingDocs.length} document{pendingDocs.length !== 1 ? 's' : ''} to verify</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.docCard}>
                <View style={styles.docIconBg}>
                  <Feather name="file-text" size={20} color="#3b82f6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.docStudentName}>{item.studentName}</Text>
                  {item.admissionNumber && (
                    <Text style={styles.docMeta}>Adm# {item.admissionNumber}</Text>
                  )}
                  <View style={[styles.docTypeBadge]}>
                    <Text style={styles.docTypeText}>
                      {item.documentType.replace(/([A-Z])/g, ' $1').trim()}
                    </Text>
                  </View>
                  {item.fileName && <Text style={styles.docFileName} numberOfLines={1}>{item.fileName}</Text>}
                </View>
                <View style={styles.docActions}>
                  <TouchableOpacity
                    style={styles.docRejectBtn}
                    onPress={() => Alert.alert('Reject Document', 'Mark this document as rejected?', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Reject', style: 'destructive', onPress: () => verifyDocMutation.mutate({ id: item.id, status: 'rejected' }) },
                    ])}
                  >
                    <Feather name="x" size={14} color="#dc2626" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.docVerifyBtn, { backgroundColor: '#059669' }]}
                    onPress={() => verifyDocMutation.mutate({ id: item.id, status: 'verified' })}
                  >
                    <Feather name="check" size={14} color="#fff" />
                    <Text style={styles.docVerifyText}>Verify</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        )
      )}

      {/* Android Approve modal */}
      <Modal visible={remarkModal.visible} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Approve Leave</Text>
            <Text style={styles.modalSubtitle}>Add a remark (optional):</Text>
            <TextInput
              value={remarkModal.remark}
              onChangeText={remarkModal.setRemark}
              placeholder="e.g. Approved. Please ensure class coverage."
              placeholderTextColor={VITANA_COLORS.textSecondary}
              style={styles.modalInput}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity onPress={remarkModal.cancel} style={styles.modalCancelBtn}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={remarkModal.confirm} style={[styles.modalConfirmBtn, { backgroundColor: '#059669' }]}>
                <Feather name="check-circle" size={14} color="#fff" />
                <Text style={styles.modalConfirmText}>Approve</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Android Reject modal */}
      <Modal visible={rejectModal.visible} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reject Leave</Text>
            <Text style={styles.modalSubtitle}>Reason for rejection (required):</Text>
            <TextInput
              value={rejectModal.reason}
              onChangeText={rejectModal.setReason}
              placeholder="Enter rejection reason..."
              placeholderTextColor={VITANA_COLORS.textSecondary}
              style={styles.modalInput}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity onPress={rejectModal.cancel} style={styles.modalCancelBtn}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={rejectModal.confirm} style={[styles.modalConfirmBtn, { backgroundColor: '#dc2626' }]}>
                <Feather name="x-circle" size={14} color="#fff" />
                <Text style={styles.modalConfirmText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f7fa' },

  summaryStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, marginBottom: 0,
  },
  summaryText: { fontSize: 13, fontWeight: '600' },

  tabBar: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  tabBtn: {
    flex: 1, paddingVertical: 10, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabContent: { alignItems: 'center', gap: 2 },
  tabLabel: { fontSize: 9, fontWeight: '500', color: VITANA_COLORS.textSecondary, textAlign: 'center' },
  tabBadge: {
    minWidth: 16, height: 16, borderRadius: 8,
    paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center',
  },
  tabBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },

  listSectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 10,
  },
  listSectionTitle: { fontSize: 13, fontWeight: '700', color: VITANA_COLORS.textSecondary },
  viewAllText: { fontSize: 13, fontWeight: '600' },

  // Leave card
  leaveCard: {
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1, borderColor: '#f1f5f9',
    borderLeftWidth: 4, borderLeftColor: '#e5e7eb',
    padding: 14, gap: 10,
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#e0e7ff', alignItems: 'center', justifyContent: 'center',
  },
  avatarInitials: { fontSize: 14, fontWeight: '700', color: '#4f46e5' },
  applicantName: { fontSize: 15, fontWeight: '700', color: VITANA_COLORS.text },
  applicantMeta: { fontSize: 11, color: VITANA_COLORS.textSecondary, marginTop: 1 },
  urgencyBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10,
  },
  urgencyText: { fontSize: 10, fontWeight: '700' },

  typeDateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  typeTagText: { fontSize: 12, fontWeight: '700' },
  daysBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  daysText: { fontSize: 12, fontWeight: '600', color: VITANA_COLORS.text },

  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateText: { fontSize: 13, color: VITANA_COLORS.textSecondary },

  reasonBox: {
    backgroundColor: '#f9fafb', borderRadius: 8,
    padding: 10, borderLeftWidth: 3, borderLeftColor: '#e5e7eb',
  },
  reasonText: { fontSize: 13, color: '#64748b', fontStyle: 'italic', lineHeight: 18 },

  urgencyWarning: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fef2f2', borderRadius: 8, padding: 8,
  },
  urgencyWarningText: { fontSize: 12, color: '#dc2626', fontWeight: '600' },

  actionRow: { flexDirection: 'row', gap: 10, marginTop: 2 },
  rejectBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 11, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#fca5a5', backgroundColor: '#fff1f2',
  },
  rejectBtnText: { fontSize: 14, fontWeight: '700', color: '#dc2626' },
  approveBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 11, borderRadius: 10,
  },
  approveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Admission card
  admissionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#f1f5f9',
  },
  admissionIconBg: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  admissionName: { fontSize: 14, fontWeight: '700', color: VITANA_COLORS.text },
  admissionMeta: { fontSize: 11, color: VITANA_COLORS.textSecondary, marginTop: 2 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },

  openBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 13, borderRadius: 12,
  },
  openBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Doc card
  docCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#f1f5f9',
  },
  docIconBg: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  docStudentName: { fontSize: 14, fontWeight: '700', color: VITANA_COLORS.text },
  docMeta: { fontSize: 11, color: VITANA_COLORS.textSecondary, marginTop: 1 },
  docTypeBadge: { marginTop: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: '#eff6ff' },
  docTypeText: { fontSize: 11, fontWeight: '600', color: '#2563eb' },
  docFileName: { fontSize: 10, color: '#9ca3af', marginTop: 2 },
  docActions: { flexDirection: 'column', gap: 6 },
  docRejectBtn: {
    width: 34, height: 34, borderRadius: 10, borderWidth: 1.5, borderColor: '#fca5a5',
    backgroundColor: '#fff1f2', alignItems: 'center', justifyContent: 'center',
  },
  docVerifyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10,
  },
  docVerifyText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  modalCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, width: '100%' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: VITANA_COLORS.text, marginBottom: 4 },
  modalSubtitle: { fontSize: 13, color: VITANA_COLORS.textSecondary, marginBottom: 12 },
  modalInput: {
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
    color: VITANA_COLORS.text, backgroundColor: '#f9fafb', marginBottom: 16,
  },
  modalBtns: { flexDirection: 'row', gap: 10 },
  modalCancelBtn: { flex: 1, paddingVertical: 11, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center' },
  modalCancelText: { fontSize: 14, fontWeight: '600', color: VITANA_COLORS.textSecondary },
  modalConfirmBtn: { flex: 1, paddingVertical: 11, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  modalConfirmText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
