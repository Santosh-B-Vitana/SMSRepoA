import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { teacherApi } from '@/api/endpoints/teacher';
import { apiClient } from '@/api/client';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { VITANA_COLORS } from '@/theme/tokens';
import { SubScreenHeader } from '@/components/ui/SubScreenHeader';
import { EmptyState } from '@/components/ui/EmptyState';

interface SyllabusUnit {
  id: string;
  unitNumber: number;
  unitName: string;
  topics: string[];
  completedTopics: number;
  totalTopics: number;
  status: 'not_started' | 'in_progress' | 'completed';
  estimatedDuration?: string | null;
}

interface SubjectSyllabus {
  subjectId: string;
  subjectName: string;
  className: string;
  academicYear: string;
  units: SyllabusUnit[];
  overallProgress: number;
}

const STATUS_CONFIG = {
  not_started: { color: '#94a3b8', label: 'Not Started', bg: '#f8fafc' },
  in_progress: { color: '#d97706', label: 'In Progress', bg: '#fef9c3' },
  completed: { color: '#16a34a', label: 'Completed', bg: '#dcfce7' },
};

function UnitCard({ unit, primaryColor }: { unit: SyllabusUnit; primaryColor: string }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[unit.status];
  const progress = unit.totalTopics > 0 ? unit.completedTopics / unit.totalTopics : 0;

  return (
    <View style={styles.unitCard}>
      <TouchableOpacity onPress={() => setExpanded((e) => !e)} activeOpacity={0.7}>
        <View style={styles.unitHeader}>
          <View style={[styles.unitNumber, { backgroundColor: `${primaryColor}15` }]}>
            <Text style={[styles.unitNumberText, { color: primaryColor }]}>{unit.unitNumber}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.unitName}>{unit.unitName}</Text>
            <Text style={styles.unitMeta}>{unit.completedTopics}/{unit.totalTopics} topics</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
          <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={VITANA_COLORS.textSecondary} />
        </View>
        <View style={styles.progressWrap}>
          <View style={[styles.progressBar, { width: `${Math.min(progress * 100, 100)}%` as any, backgroundColor: cfg.color }]} />
        </View>
      </TouchableOpacity>

      {expanded && unit.topics.length > 0 && (
        <View style={styles.topicList}>
          {unit.topics.map((topic, i) => (
            <View key={i} style={styles.topicRow}>
              <Feather
                name={i < unit.completedTopics ? 'check-circle' : 'circle'}
                size={14}
                color={i < unit.completedTopics ? '#16a34a' : VITANA_COLORS.border}
              />
              <Text style={[styles.topicText, i < unit.completedTopics && styles.topicDone]}>
                {topic}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default function SyllabusScreen() {
  const { primaryColor } = useSchoolTheme();
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ['teacher-assignments'],
    queryFn: teacherApi.getTeacherAssignments,
    staleTime: 10 * 60 * 1000,
  });

  const { data: syllabus, isLoading: syllabusLoading } = useQuery<SubjectSyllabus>({
    queryKey: ['syllabus', selectedSubject],
    queryFn: () => apiClient.get(`/syllabus/my-progress?classId=${selectedSubject}`),
    enabled: !!selectedSubject,
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = assignmentsLoading;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SubScreenHeader title="My Curriculum" />

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={primaryColor} size="large" /></View>
      ) : assignments.length === 0 ? (
        <EmptyState icon="book-open" title="No classes assigned" subtitle="You have no class assignments yet." />
      ) : (
        <>
          {/* Class selector */}
          <View style={styles.selectorWrap}>
            <FlatList
              horizontal
              data={assignments}
              keyExtractor={(a) => a.classId}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => setSelectedSubject(item.classId)}
                  style={[
                    styles.classChip,
                    selectedSubject === item.classId && { backgroundColor: primaryColor, borderColor: primaryColor },
                  ]}
                >
                  <Text style={[
                    styles.classChipText,
                    selectedSubject === item.classId && { color: '#fff' },
                  ]}>
                    {item.className}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>

          {!selectedSubject ? (
            <EmptyState icon="book-open" title="Select a class" subtitle="Choose a class above to view the curriculum." />
          ) : syllabusLoading ? (
            <View style={styles.center}><ActivityIndicator color={primaryColor} size="large" /></View>
          ) : !syllabus || (syllabus.units?.length ?? 0) === 0 ? (
            <EmptyState icon="book" title="No syllabus data" subtitle="Curriculum for this class has not been configured yet." />
          ) : (
            <>
              {/* Overall progress */}
              <View style={styles.progressCard}>
                <Text style={styles.progressLabel}>Overall Progress</Text>
                <Text style={[styles.progressValue, { color: primaryColor }]}>{syllabus.overallProgress}%</Text>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${syllabus.overallProgress}%` as any, backgroundColor: primaryColor }]} />
                </View>
              </View>

              <FlatList
                data={syllabus.units}
                keyExtractor={(u) => u.id}
                contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 10 }}
                renderItem={({ item }) => <UnitCard unit={item} primaryColor={primaryColor} />}
              />
            </>
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: VITANA_COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  selectorWrap: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: VITANA_COLORS.border },
  classChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: VITANA_COLORS.border,
    backgroundColor: '#fff',
  },
  classChipText: { fontSize: 13, fontWeight: '500', color: VITANA_COLORS.textSecondary },
  progressCard: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: VITANA_COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressLabel: { flex: 1, fontSize: 13, color: VITANA_COLORS.textSecondary },
  progressValue: { fontSize: 18, fontWeight: '700' },
  progressTrack: { flex: 2, height: 6, backgroundColor: '#f1f5f9', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  unitCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: VITANA_COLORS.border },
  unitHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  unitNumber: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  unitNumberText: { fontSize: 13, fontWeight: '700' },
  unitName: { fontSize: 14, fontWeight: '600', color: VITANA_COLORS.text },
  unitMeta: { fontSize: 11, color: VITANA_COLORS.textSecondary, marginTop: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '600' },
  progressWrap: { height: 3, backgroundColor: '#f1f5f9', borderRadius: 2, overflow: 'hidden' },
  progressBar: { height: '100%', borderRadius: 2 },
  topicList: { paddingTop: 12, gap: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9', marginTop: 8 },
  topicRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  topicText: { fontSize: 13, color: VITANA_COLORS.text, flex: 1 },
  topicDone: { color: VITANA_COLORS.textSecondary, textDecorationLine: 'line-through' },
});
