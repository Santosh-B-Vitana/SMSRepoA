import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { teacherApi, type ExamSetupBasicDto } from '@/api/endpoints/teacher';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { VITANA_COLORS, VITANA_SHADOWS } from '@/theme/tokens';
import { SubScreenHeader } from '@/components/ui/SubScreenHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';

const STATUS_VARIANTS: Record<string, 'warning' | 'info' | 'neutral' | 'success' | 'primary'> = {
  marks_entry: 'warning',
  draft: 'info',
  locked: 'neutral',
  finalized: 'success',
  published: 'success',
};

const STATUS_LABELS: Record<string, string> = {
  marks_entry: 'Entry Open',
  draft: 'Draft',
  locked: 'Locked',
  finalized: 'Finalized',
  published: 'Published',
};

function StatusBadge({ status }: { status: string }) {
  const key = status.toLowerCase();
  const label = STATUS_LABELS[key] ?? status;
  const variant = STATUS_VARIANTS[key] ?? 'neutral';
  return <Badge label={label} variant={variant} size="sm" />;
}

function ExamCard({ exam, primaryColor }: { exam: ExamSetupBasicDto; primaryColor: string }) {
  const isPendingEntry = ['marks_entry', 'draft'].includes(exam.status.toLowerCase());
  return (
    <TouchableOpacity
      onPress={() => router.push(`/(teacher)/marks/${exam.id}` as never)}
      style={[
        examStyles.card,
        VITANA_SHADOWS.sm,
        isPendingEntry && { borderColor: `${primaryColor}44` },
      ]}
      activeOpacity={0.75}
    >
      <View style={examStyles.header}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text style={examStyles.name} numberOfLines={1}>{exam.name}</Text>
          <Text style={examStyles.meta}>{exam.className} · {exam.examType}</Text>
        </View>
        <StatusBadge status={exam.status} />
      </View>
      <View style={examStyles.subjectRow}>
        <Feather name="book-open" size={13} color={VITANA_COLORS.textSecondary} />
        <Text style={examStyles.subjectText}>
          {exam.myAssignedSubjectIds.length} {exam.myAssignedSubjectIds.length === 1 ? 'subject' : 'subjects'} assigned
        </Text>
      </View>
      <View style={examStyles.ctaRow}>
        <Text style={[examStyles.ctaText, { color: primaryColor }]}>
          {isPendingEntry ? 'Enter / View Marks' : 'View Marks & Performance'}
        </Text>
        <Feather name="chevron-right" size={14} color={primaryColor} />
      </View>
    </TouchableOpacity>
  );
}

const sectionLabel = {
  fontSize: 11,
  fontWeight: '700' as const,
  color: VITANA_COLORS.textSecondary,
  textTransform: 'uppercase' as const,
  letterSpacing: 0.8,
  marginBottom: 10,
  fontFamily: 'Inter',
};

const examStyles = {
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: VITANA_COLORS.border,
    marginBottom: 10,
    gap: 8,
  } as const,
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' } as const,
  name: { fontSize: 15, fontWeight: '600', color: VITANA_COLORS.text, fontFamily: 'Inter' } as const,
  meta: { fontSize: 13, color: VITANA_COLORS.textSecondary, fontFamily: 'Inter', marginTop: 2 } as const,
  subjectRow: { flexDirection: 'row', alignItems: 'center', gap: 6 } as const,
  subjectText: { fontSize: 13, color: VITANA_COLORS.textSecondary, fontFamily: 'Inter' } as const,
  ctaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 } as const,
  ctaText: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter' } as const,
};

export default function MarksIndex() {
  const { primaryColor } = useSchoolTheme();

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
      <SubScreenHeader
        title="Marks Entry"
        subtitle={`${pending.length} open · ${others.length} completed`}
      />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={primaryColor} />}
      >
        {isLoading && (
          <View style={{ gap: 10 }}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={{ height: 100, backgroundColor: VITANA_COLORS.border, borderRadius: 14, opacity: 0.4 }} />
            ))}
          </View>
        )}

        {!isLoading && exams.length === 0 && (
          <EmptyState
            icon="check-circle"
            title="No exams assigned"
            subtitle="You will see exams here once you are assigned as the marks teacher."
            iconColor={VITANA_COLORS.textSecondary}
          />
        )}

        {pending.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <Text style={sectionLabel}>Open for Entry ({pending.length})</Text>
            {pending.map((exam) => <ExamCard key={exam.id} exam={exam} primaryColor={primaryColor} />)}
          </View>
        )}

        {others.length > 0 && (
          <View>
            <Text style={sectionLabel}>Completed ({others.length})</Text>
            {others.map((exam) => <ExamCard key={exam.id} exam={exam} primaryColor={primaryColor} />)}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
