import { View, Text, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { FlashList } from '@shopify/flash-list';
import { useState } from 'react';
import { studentApi } from '@/api/endpoints/student';
import type { AssignmentSummary } from '@/api/endpoints/student';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { SkeletonCard } from '@/components/common/SkeletonLoader';
import { EmptyState } from '@/components/ui/EmptyState';
import { VITANA_COLORS } from '@/theme/tokens';
import { SubScreenHeader } from '@/components/ui/SubScreenHeader';

type Filter = 'All' | 'Pending' | 'Submitted' | 'Graded';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Pending: { bg: '#fef3c7', text: '#d97706' },
  Submitted: { bg: '#dbeafe', text: '#2563eb' },
  Graded: { bg: '#dcfce7', text: '#16a34a' },
  Late: { bg: '#fee2e2', text: '#dc2626' },
  RevisionRequested: { bg: '#fce7f3', text: '#be185d' },
};

function AssignmentRow({ item }: { item: AssignmentSummary }) {
  const colors = STATUS_COLORS[item.status] ?? { bg: '#f3f4f6', text: '#6b7280' };
  const dueDate = item.dueDate ? item.dueDate.split('T')[0] : '';

  return (
    <TouchableOpacity
      onPress={() => router.push({ pathname: '/(student)/assignments/[id]', params: { id: item.id } })}
      activeOpacity={0.7}
      style={{
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: VITANA_COLORS.border,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        minHeight: 72,
      }}
    >
      <View
        style={{
          width: 4, borderRadius: 2, height: 44,
          backgroundColor: item.isOverdue ? '#dc2626' : item.status === 'Graded' ? '#16a34a' : '#d97706',
        }}
      />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: VITANA_COLORS.text }} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={{ fontSize: 13, color: VITANA_COLORS.textSecondary, marginTop: 2 }}>
          {item.subjectName}
        </Text>
        <Text
          style={{
            fontSize: 12,
            color: item.isOverdue ? '#dc2626' : VITANA_COLORS.textSecondary,
            marginTop: 3,
          }}
        >
          Due: {dueDate}
          {item.isOverdue ? ' · Overdue' : ''}
        </Text>
      </View>
      <View style={{ backgroundColor: colors.bg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 }}>
        <Text style={{ fontSize: 12, color: colors.text, fontWeight: '600' }}>{item.status}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function AssignmentsScreen() {
  const { primaryColor } = useSchoolTheme();
  const [filter, setFilter] = useState<Filter>('All');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['student-assignments'],
    queryFn: () => studentApi.getAssignments(),
    staleTime: 5 * 60 * 1000,
  });

  const allItems = data?.items ?? [];
  const filtered = filter === 'All' ? allItems : allItems.filter((a) => a.status === filter);
  const sortedItems = [...filtered].sort((a, b) => {
    if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  const pendingCount = allItems.filter((a) => a.status === 'Pending' || a.status === 'Late').length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: VITANA_COLORS.surface }} edges={['top']}>
      <SubScreenHeader
        title="Assignments"
        subtitle={pendingCount > 0 ? `${pendingCount} pending` : undefined}
      />

      {/* Filter tabs */}
      <View
        style={{
          flexDirection: 'row', backgroundColor: '#fff',
          borderBottomWidth: 1, borderBottomColor: VITANA_COLORS.border,
        }}
      >
        {(['All', 'Pending', 'Submitted', 'Graded'] as Filter[]).map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={{
              flex: 1, paddingVertical: 12, alignItems: 'center',
              borderBottomWidth: 2,
              borderBottomColor: filter === f ? primaryColor : 'transparent',
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: filter === f ? '600' : '400',
                color: filter === f ? primaryColor : VITANA_COLORS.textSecondary,
              }}
            >
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={{ padding: 16, gap: 10 }}>
          {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} lines={2} />)}
        </View>
      ) : (
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
          <FlashList
            data={sortedItems}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <AssignmentRow item={item} />}
            estimatedItemSize={80}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
            ListEmptyComponent={
              <EmptyState
                icon="book-open"
                title="No assignments"
                subtitle={filter === 'All' ? 'No assignments assigned yet.' : `No ${filter.toLowerCase()} assignments.`}
              />
            }
          />
        </View>
      )}
    </SafeAreaView>
  );
}
