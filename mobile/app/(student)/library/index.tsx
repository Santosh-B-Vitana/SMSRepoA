import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { studentApi } from '@/api/endpoints/student';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { SkeletonCard } from '@/components/common/SkeletonLoader';
import { EmptyState } from '@/components/ui/EmptyState';
import { VITANA_COLORS } from '@/theme/tokens';
import { SubScreenHeader } from '@/components/ui/SubScreenHeader';

export default function LibraryScreen() {
  const { primaryColor } = useSchoolTheme();

  const { data: issues, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['student-library'],
    queryFn: studentApi.getLibraryIssues,
    staleTime: 15 * 60 * 1000,
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f7fa' }}>
      <View
        style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: 16, paddingVertical: 12,
          backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: VITANA_COLORS.border,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Feather name="arrow-left" size={22} color={VITANA_COLORS.text} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 17, fontWeight: '600', color: VITANA_COLORS.text, marginLeft: 12 }}>
          Library
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <View style={{ padding: 16, gap: 10 }}>
          {isLoading ? (
            [1, 2, 3].map((i) => <SkeletonCard key={i} lines={3} />)
          ) : (issues?.length ?? 0) === 0 ? (
            <EmptyState
              icon="book"
              title="No books issued"
              subtitle="Books issued to you will appear here."
            />
          ) : (
            issues!.map((issue) => (
              <View
                key={issue.id}
                style={{
                  backgroundColor: '#fff', borderRadius: 12, padding: 14,
                  borderWidth: 1,
                  borderColor: issue.isOverdue ? '#fca5a5' : VITANA_COLORS.border,
                }}
              >
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                  <View
                    style={{
                      backgroundColor: primaryColor + '15', borderRadius: 10, padding: 10,
                    }}
                  >
                    <Feather name="book" size={20} color={primaryColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: VITANA_COLORS.text }} numberOfLines={2}>
                      {issue.bookTitle}
                    </Text>
                    <Text style={{ fontSize: 13, color: VITANA_COLORS.textSecondary, marginTop: 2 }}>
                      {issue.author}
                      {issue.isbnNumber ? ` · ISBN: ${issue.isbnNumber}` : ''}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
                      <View>
                        <Text style={{ fontSize: 11, color: VITANA_COLORS.textSecondary }}>Issued</Text>
                        <Text style={{ fontSize: 12, fontWeight: '500', color: VITANA_COLORS.text }}>
                          {issue.issuedDate.split('T')[0]}
                        </Text>
                      </View>
                      <View>
                        <Text style={{ fontSize: 11, color: VITANA_COLORS.textSecondary }}>Due</Text>
                        <Text
                          style={{
                            fontSize: 12, fontWeight: '500',
                            color: issue.isOverdue ? '#dc2626' : VITANA_COLORS.text,
                          }}
                        >
                          {issue.dueDate.split('T')[0]}
                        </Text>
                      </View>
                      {issue.returnedDate && (
                        <View>
                          <Text style={{ fontSize: 11, color: VITANA_COLORS.textSecondary }}>Returned</Text>
                          <Text style={{ fontSize: 12, fontWeight: '500', color: '#16a34a' }}>
                            {issue.returnedDate.split('T')[0]}
                          </Text>
                        </View>
                      )}
                    </View>
                    {issue.isOverdue && !issue.returnedDate && (
                      <View
                        style={{
                          marginTop: 8, backgroundColor: '#fee2e2', borderRadius: 6,
                          paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start',
                          flexDirection: 'row', alignItems: 'center', gap: 4,
                        }}
                      >
                        <Feather name="alert-circle" size={12} color="#dc2626" />
                        <Text style={{ fontSize: 12, color: '#dc2626', fontWeight: '600' }}>
                          Overdue{issue.fine ? ` · Fine: ₹${issue.fine}` : ''}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
