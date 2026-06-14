import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { teacherApi, type AssignmentDto } from '@/api/endpoints/teacher';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { VITANA_COLORS } from '@/theme/tokens';
import { SubScreenHeader } from '@/components/ui/SubScreenHeader';

type TabKey = 'active' | 'grading' | 'closed';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'grading', label: 'Pending Grading' },
  { key: 'closed', label: 'Closed' },
];

function formatDueDate(date: string): string {
  const d = new Date(date);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days < 0) return 'Overdue';
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `Due in ${days} days`;
}

function DueDateChip({ dueDate }: { dueDate: string }) {
  const d = new Date(dueDate);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  const isOverdue = days < 0;
  const isUrgent = days >= 0 && days <= 2;

  return (
    <View
      style={{
        backgroundColor: isOverdue
          ? VITANA_COLORS.errorLight
          : isUrgent
          ? VITANA_COLORS.warningLight
          : VITANA_COLORS.surface,
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 3,
      }}
    >
      <Text
        style={{
          fontSize: 11,
          fontWeight: '600',
          color: isOverdue
            ? VITANA_COLORS.error
            : isUrgent
            ? VITANA_COLORS.warning
            : VITANA_COLORS.textSecondary,
        }}
      >
        {formatDueDate(dueDate)}
      </Text>
    </View>
  );
}

function AssignmentCard({ assignment }: { assignment: AssignmentDto }) {
  const hasPendingGrading = assignment.pendingGradingCount > 0;

  return (
    <TouchableOpacity
      onPress={() => router.push(`/(teacher)/assignments/${assignment.id}/submissions` as never)}
      style={{
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: hasPendingGrading ? VITANA_COLORS.warning + '44' : VITANA_COLORS.border,
        marginBottom: 10,
        gap: 8,
      }}
      activeOpacity={0.75}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Text
          style={{
            fontSize: 15,
            fontWeight: '600',
            color: VITANA_COLORS.text,
            flex: 1,
            marginRight: 10,
          }}
          numberOfLines={2}
        >
          {assignment.title}
        </Text>
        <DueDateChip dueDate={assignment.dueDate} />
      </View>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        {assignment.className && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Feather name="users" size={12} color={VITANA_COLORS.textSecondary} />
            <Text style={{ fontSize: 12, color: VITANA_COLORS.textSecondary }}>
              {assignment.className}
            </Text>
          </View>
        )}
        {assignment.subjectName && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Feather name="book" size={12} color={VITANA_COLORS.textSecondary} />
            <Text style={{ fontSize: 12, color: VITANA_COLORS.textSecondary }}>
              {assignment.subjectName}
            </Text>
          </View>
        )}
        {assignment.maxMarks && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Feather name="award" size={12} color={VITANA_COLORS.textSecondary} />
            <Text style={{ fontSize: 12, color: VITANA_COLORS.textSecondary }}>
              {assignment.maxMarks} marks
            </Text>
          </View>
        )}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 12, color: VITANA_COLORS.textSecondary }}>
          {assignment.submissionCount} submission{assignment.submissionCount !== 1 ? 's' : ''}
        </Text>
        {hasPendingGrading && (
          <View
            style={{
              backgroundColor: VITANA_COLORS.warningLight,
              borderRadius: 20,
              paddingHorizontal: 10,
              paddingVertical: 3,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '600', color: VITANA_COLORS.warning }}>
              {assignment.pendingGradingCount} to grade
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function AssignmentsIndex() {
  const [activeTab, setActiveTab] = useState<TabKey>('active');
  const { primaryColor } = useSchoolTheme();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['my-assignments'],
    queryFn: () => teacherApi.getMyAssignments(),
    staleTime: 3 * 60 * 1000,
  });

  const assignments = data ?? [];

  const filtered = assignments.filter((a: AssignmentDto) => {
    const status = a.status.toLowerCase();
    if (activeTab === 'active') return status === 'active' || status === 'open';
    if (activeTab === 'grading') return a.pendingGradingCount > 0;
    return status === 'closed' || status === 'completed' || status === 'archived';
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: VITANA_COLORS.surface }} edges={['top']}>
      <SubScreenHeader
        title="Assignments"
        rightSlot={
          <TouchableOpacity
            onPress={() => router.push('/(teacher)/assignments/create' as never)}
            style={{
              backgroundColor: primaryColor ?? VITANA_COLORS.primary,
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 6,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <Feather name="plus" size={15} color="#fff" />
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>New</Text>
          </TouchableOpacity>
        }
      />

      {/* Tabs */}
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: '#fff',
          paddingHorizontal: 16,
          paddingBottom: 0,
          borderBottomWidth: 1,
          borderBottomColor: VITANA_COLORS.border,
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderBottomWidth: 2,
                borderBottomColor: isActive
                  ? (primaryColor ?? VITANA_COLORS.primary)
                  : 'transparent',
                marginRight: 4,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: isActive ? '700' : '500',
                  color: isActive
                    ? (primaryColor ?? VITANA_COLORS.primary)
                    : VITANA_COLORS.textSecondary,
                }}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        {isLoading && (
          <View style={{ gap: 10 }}>
            {[1, 2, 3].map((i) => (
              <View
                key={i}
                style={{
                  height: 100,
                  backgroundColor: VITANA_COLORS.border,
                  borderRadius: 12,
                  opacity: 0.5,
                }}
              />
            ))}
          </View>
        )}

        {!isLoading && filtered.length === 0 && (
          <View style={{ alignItems: 'center', paddingTop: 60, gap: 12 }}>
            <Feather name="clipboard" size={48} color={VITANA_COLORS.border} />
            <Text style={{ fontSize: 16, fontWeight: '600', color: VITANA_COLORS.text }}>
              No assignments
            </Text>
            {activeTab === 'active' && (
              <TouchableOpacity
                onPress={() => router.push('/(teacher)/assignments/create' as never)}
                style={{
                  backgroundColor: primaryColor ?? VITANA_COLORS.primary,
                  borderRadius: 10,
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>
                  Create Assignment
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {filtered.map((assignment: AssignmentDto) => (
          <AssignmentCard key={assignment.id} assignment={assignment} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
