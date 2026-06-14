import {
  View, Text, ScrollView, RefreshControl, ActivityIndicator, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { studentApi } from '@/api/endpoints/student';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { SubScreenHeader } from '@/components/ui/SubScreenHeader';
import { VITANA_COLORS } from '@/theme/tokens';

function MetricCard({ label, value, unit }: { label: string; value?: number | null; unit: string }) {
  if (value == null) return null;
  return (
    <View style={s.metricCard}>
      <Text style={s.metricValue}>{value} <Text style={s.metricUnit}>{unit}</Text></Text>
      <Text style={s.metricLabel}>{label}</Text>
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ComponentProps<typeof Feather>['name']; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={s.infoRow}>
      <Feather name={icon} size={14} color={VITANA_COLORS.textSecondary} />
      <Text style={s.infoLabel}>{label}:</Text>
      <Text style={s.infoValue}>{value}</Text>
    </View>
  );
}

export default function StudentHealthScreen() {
  const { primaryColor } = useSchoolTheme();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['student-health-me'],
    queryFn: studentApi.getHealthRecord,
    staleTime: 10 * 60_000,
  });

  const bmi = data?.height && data?.weight
    ? (data.weight / Math.pow(data.height / 100, 2)).toFixed(1)
    : null;
  const bmiCategory =
    bmi === null ? null
    : parseFloat(bmi) < 18.5 ? { label: 'Underweight', color: '#f59e0b' }
    : parseFloat(bmi) < 25 ? { label: 'Normal', color: '#16a34a' }
    : parseFloat(bmi) < 30 ? { label: 'Overweight', color: '#f59e0b' }
    : { label: 'Obese', color: '#dc2626' };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <SubScreenHeader title="Health Record" />

      <ScrollView
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={primaryColor} />}
      >
        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={primaryColor} />
        ) : !data ? (
          <View style={s.empty}>
            <Feather name="heart" size={40} color={VITANA_COLORS.border} />
            <Text style={s.emptyText}>No health record on file.</Text>
            <Text style={[s.emptyText, { fontSize: 13 }]}>Contact your school nurse to update your health information.</Text>
          </View>
        ) : (
          <View style={s.body}>
            {/* Blood group banner */}
            {data.bloodGroup ? (
              <View style={s.bloodBanner}>
                <View style={s.bloodBadge}>
                  <Text style={s.bloodText}>{data.bloodGroup}</Text>
                </View>
                <View>
                  <Text style={s.bloodLabel}>Blood Group</Text>
                  {data.lastUpdated ? (
                    <Text style={s.bloodSub}>Last updated: {new Date(data.lastUpdated).toLocaleDateString('en-IN')}</Text>
                  ) : null}
                </View>
              </View>
            ) : null}

            {/* Physical metrics */}
            <View style={s.card}>
              <Text style={s.sectionTitle}>Physical Measurements</Text>
              <View style={s.metricsRow}>
                <MetricCard label="Height" value={data.height} unit="cm" />
                <MetricCard label="Weight" value={data.weight} unit="kg" />
                {bmi ? (
                  <View style={s.metricCard}>
                    <Text style={[s.metricValue, { color: bmiCategory?.color }]}>
                      {bmi}
                    </Text>
                    <Text style={s.metricLabel}>BMI</Text>
                    {bmiCategory ? (
                      <View style={[s.bmiTag, { backgroundColor: bmiCategory.color + '20' }]}>
                        <Text style={{ fontSize: 10, color: bmiCategory.color, fontWeight: '600' }}>
                          {bmiCategory.label}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </View>
            </View>

            {/* Vision */}
            {(data.visionLeft || data.visionRight) ? (
              <View style={s.card}>
                <Text style={s.sectionTitle}>Vision</Text>
                <View style={s.visionRow}>
                  <View style={s.visionItem}>
                    <Text style={s.visionValue}>{data.visionLeft ?? '—'}</Text>
                    <Text style={s.metricLabel}>Left Eye</Text>
                  </View>
                  <View style={s.visionDivider} />
                  <View style={s.visionItem}>
                    <Text style={s.visionValue}>{data.visionRight ?? '—'}</Text>
                    <Text style={s.metricLabel}>Right Eye</Text>
                  </View>
                </View>
              </View>
            ) : null}

            {/* Medical info */}
            {(data.allergies || data.medicalConditions) ? (
              <View style={s.card}>
                <Text style={s.sectionTitle}>Medical Information</Text>
                {data.allergies ? (
                  <View style={s.alertRow}>
                    <Feather name="alert-triangle" size={14} color="#f59e0b" />
                    <View style={{ flex: 1 }}>
                      <Text style={s.alertLabel}>Allergies</Text>
                      <Text style={s.alertText}>{data.allergies}</Text>
                    </View>
                  </View>
                ) : null}
                {data.medicalConditions ? (
                  <View style={s.alertRow}>
                    <Feather name="activity" size={14} color="#ef4444" />
                    <View style={{ flex: 1 }}>
                      <Text style={s.alertLabel}>Medical Conditions</Text>
                      <Text style={s.alertText}>{data.medicalConditions}</Text>
                    </View>
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* Emergency contact */}
            {(data.emergencyContact || data.emergencyPhone) ? (
              <View style={s.card}>
                <Text style={s.sectionTitle}>Emergency Contact</Text>
                <InfoRow icon="user" label="Name" value={data.emergencyContact} />
                <InfoRow icon="phone" label="Phone" value={data.emergencyPhone} />
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f7fa' },
  body: { padding: 16, gap: 12, paddingBottom: 40 },
  bloodBanner: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 1, borderColor: VITANA_COLORS.border,
  },
  bloodBadge: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center',
  },
  bloodText: { fontSize: 18, fontWeight: '800', color: '#991b1b' },
  bloodLabel: { fontSize: 15, fontWeight: '600', color: VITANA_COLORS.text },
  bloodSub: { fontSize: 12, color: VITANA_COLORS.textSecondary, marginTop: 2 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, gap: 10,
    borderWidth: 1, borderColor: VITANA_COLORS.border,
  },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: VITANA_COLORS.text },
  metricsRow: { flexDirection: 'row', gap: 12 },
  metricCard: {
    flex: 1, alignItems: 'center', backgroundColor: '#f8fafc',
    borderRadius: 10, padding: 12, gap: 4,
  },
  metricValue: { fontSize: 22, fontWeight: '700', color: VITANA_COLORS.text },
  metricUnit: { fontSize: 13, fontWeight: '400', color: VITANA_COLORS.textSecondary },
  metricLabel: { fontSize: 11, color: VITANA_COLORS.textSecondary, textAlign: 'center' },
  bmiTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 2 },
  visionRow: { flexDirection: 'row', alignItems: 'center' },
  visionItem: { flex: 1, alignItems: 'center' },
  visionValue: { fontSize: 24, fontWeight: '700', color: VITANA_COLORS.text },
  visionDivider: { width: 1, height: 40, backgroundColor: VITANA_COLORS.border },
  alertRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  alertLabel: { fontSize: 13, fontWeight: '600', color: VITANA_COLORS.text },
  alertText: { fontSize: 13, color: VITANA_COLORS.textSecondary, lineHeight: 18, marginTop: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoLabel: { fontSize: 13, fontWeight: '600', color: VITANA_COLORS.text, width: 60 },
  infoValue: { fontSize: 13, color: VITANA_COLORS.textSecondary, flex: 1 },
  empty: { paddingVertical: 60, paddingHorizontal: 24, alignItems: 'center', gap: 10 },
  emptyText: { fontSize: 14, color: VITANA_COLORS.textSecondary, textAlign: 'center' },
});
