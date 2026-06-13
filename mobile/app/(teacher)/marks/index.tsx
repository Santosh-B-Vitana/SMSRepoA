import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { teacherApi, type ExamSetupBasicDto } from '@/api/endpoints/teacher';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { VITANA_COLORS } from '@/theme/tokens';

const STATUS_LABELS: Record<string, { label: string; bg: string; text: string }> = {
  marks_entry: { label: 'Pending Entry', bg: '#fef3c7', text: '#d97706' },
  draft: { label: 'Draft', bg: '#dbeafe', text: '#2563eb' },
  locked: { label: 'Locked', bg: '#f3e8ff', text: '#7c3aed' },
  finalized: { label: 'Finalized', bg: '#dcfce7', text: '#16a34a' },
  published: { label: 'Published', bg: '#dcfce7', text: '#15803d' },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_LABELS[status.toLowerCase()] ?? {
    label: status,
    bg: VITANA_COLORS.surface,
    text: VITANA_COLORS.textSecondary,
  };
  return (
    <View
      style={{
        backgroundColor: config.bg,
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 3,
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: '600', color: config.text }}>{config.label}</Text>
    </View>
  );
}

function ExamCard({ exam }: { exam: ExamSetupBasicDto }) {
  const isPendingEntry = ['marks_entry', 'draft'].includes(exam.status.toLowerCase());
  return (
    <TouchableOpacity
      onPress={() => router.push(`/(teacher)/marks/${exam.id}` as never)}
      style={{
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: isPendingEntry ? VITANA_COLORS.primary + '33' : VITANA_COLORS.border,
        marginBottom: 10,
        gap: 8,
      }}
      activeOpacity={0.75}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: VITANA_COLORS.text }} numberOfLines={1}>
            {exam.name}
          </Text>
          <Text style={{ fontSize: 13, color: VITANA_COLORS.textSecondary, marginTop: 2 }}>
            {exam.className} · {exam.examType}
          </Text>
        </View>
        <StatusBadge status={exam.status} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Feather name="book-open" size={13} color={VITANA_COLORS.textSecondary} />
        <Text style={{ fontSize: 13, color: VITANA_COLORS.textSecondary }}>
          {exam.myAssignedSubjectIds.length}{' '}
          {exam.myAssignedSubjectIds.length === 1 ? 'subject' : 'subjects'} assigned
        </Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Text style={{ fontSize: 13, color: VITANA_COLORS.primary, fontWeight: '600' }}>
          {isPendingEntry ? 'Enter Marks' : 'View Marks'}
        </Text>
        <Feather name="chevron-right" size={14} color={VITANA_COLORS.primary} />
      </View>
    </TouchableOpacity>
  );
}

export default function MarksIndex() {
  useSchoolTheme();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['my-exam-assignments'],
    queryFn: () => teacherApi.getMyExamAssignments(),
    staleTime: 5 * 60 * 1000,
  });

  const exams = data ?? [];
  const pending = exams.filter((e) =>
    ['marks_entry', 'draft'].includes(e.status.toLowerCase()),
  );
  const others = exams.filter(
    (e) => !['marks_entry', 'draft'].includes(e.status.toLowerCase()),
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: VITANA_COLORS.surface }} edges={['top']}>
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 14,
          backgroundColor: '#fff',
          borderBottomWidth: 1,
          borderBottomColor: VITANA_COLORS.border,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Feather name="arrow-left" size={22} color={VITANA_COLORS.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '700', color: VITANA_COLORS.text, flex: 1 }}>
          Marks Entry
        </Text>
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
                  height: 90,
                  backgroundColor: VITANA_COLORS.border,
                  borderRadius: 12,
                  opacity: 0.5,
                }}
              />
            ))}
          </View>
        )}

        {!isLoading && exams.length === 0 && (
          <View style={{ alignItems: 'center', paddingTop: 60, gap: 12 }}>
            <Feather name="check-circle" size={48} color={VITANA_COLORS.border} />
            <Text style={{ fontSize: 16, fontWeight: '600', color: VITANA_COLORS.text }}>
              No exams assigned
            </Text>
            <Text style={{ fontSize: 14, color: VITANA_COLORS.textSecondary, textAlign: 'center' }}>
              You will see exams here once you are assigned as the marks teacher.
            </Text>
          </View>
        )}

        {pending.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: VITANA_COLORS.textSecondary,
                textTransform: 'uppercase',
                letterSpacing: 0.8,
                marginBottom: 10,
              }}
            >
              Pending Entry ({pending.length})
            </Text>
            {pending.map((exam) => (
              <ExamCard key={exam.id} exam={exam} />
            ))}
          </View>
        )}

        {others.length > 0 && (
          <View>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: VITANA_COLORS.textSecondary,
                textTransform: 'uppercase',
                letterSpacing: 0.8,
                marginBottom: 10,
              }}
            >
              Completed ({others.length})
            </Text>
            {others.map((exam) => (
              <ExamCard key={exam.id} exam={exam} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
