import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { studentApi } from '@/api/endpoints/student';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { VITANA_COLORS } from '@/theme/tokens';

export default function ReportCardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { primaryColor } = useSchoolTheme();

  const { data: reportCards, isLoading } = useQuery({
    queryKey: ['student-report-cards'],
    queryFn: studentApi.getReportCards,
    staleTime: 30 * 60 * 1000,
  });

  const reportCard = reportCards?.find((rc) => rc.id === id);

  async function openPdf() {
    if (reportCard?.pdfUrl) {
      await WebBrowser.openBrowserAsync(reportCard.pdfUrl);
    }
  }

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
          Report Card
        </Text>
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        {isLoading ? (
          <ActivityIndicator size="large" color={primaryColor} />
        ) : !reportCard ? (
          <View style={{ alignItems: 'center' }}>
            <Feather name="x-circle" size={48} color={VITANA_COLORS.textSecondary} />
            <Text style={{ color: VITANA_COLORS.textSecondary, fontSize: 16, marginTop: 12, textAlign: 'center' }}>
              Report card not found
            </Text>
          </View>
        ) : (
          <View style={{ alignItems: 'center', width: '100%' }}>
            <View
              style={{
                backgroundColor: primaryColor + '15', borderRadius: 20,
                width: 96, height: 96, alignItems: 'center', justifyContent: 'center', marginBottom: 20,
              }}
            >
              <Feather name="file-text" size={44} color={primaryColor} />
            </View>

            <Text style={{ fontSize: 20, fontWeight: '700', color: VITANA_COLORS.text, textAlign: 'center', marginBottom: 6 }}>
              {reportCard.examName}
            </Text>
            <Text style={{ fontSize: 14, color: VITANA_COLORS.textSecondary, marginBottom: 32 }}>
              Report Card · {reportCard.generatedAt.split('T')[0]}
            </Text>

            <TouchableOpacity
              onPress={openPdf}
              style={{
                backgroundColor: primaryColor, borderRadius: 12,
                paddingVertical: 14, paddingHorizontal: 32,
                flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%', justifyContent: 'center',
              }}
            >
              <Feather name="external-link" size={18} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>View PDF</Text>
            </TouchableOpacity>

            <Text style={{ color: VITANA_COLORS.textSecondary, fontSize: 13, marginTop: 16, textAlign: 'center' }}>
              Opens in your device browser
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
