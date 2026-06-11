import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import { Feather } from '@expo/vector-icons';
import { parentApi } from '@/api/endpoints/parent';
import { SkeletonLoader } from '@/components/common/SkeletonLoader';
import { formatDate } from '@vitana/shared-utils';
import { VITANA_COLORS } from '@/theme/tokens';

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  Urgent: { bg: '#fee2e2', text: '#dc2626' },
  High: { bg: '#fef3c7', text: '#d97706' },
  Normal: { bg: '#dbeafe', text: '#1d4ed8' },
  Low: { bg: '#f3f4f6', text: '#6b7280' },
};

export default function AnnouncementDetail() {
  // Fetch all announcements and find the one with this id
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: allData, isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => parentApi.getAnnouncements(1),
    staleTime: 5 * 60 * 1000,
  });

  const announcement = allData?.items.find((a) => a.id === id);

  const priorityStyle = announcement
    ? (PRIORITY_COLORS[announcement.priority] ?? PRIORITY_COLORS.Normal)
    : PRIORITY_COLORS.Normal;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f7fa' }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: '#fff',
          borderBottomWidth: 1,
          borderBottomColor: VITANA_COLORS.border,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="arrow-left" size={22} color={VITANA_COLORS.text} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 17, fontWeight: '600', color: VITANA_COLORS.text, marginLeft: 12 }}>
          Announcement
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ padding: 16, paddingBottom: 32, gap: 16 }}>
          {isLoading ? (
            <View style={{ gap: 10 }}>
              <SkeletonLoader height={24} width="80%" />
              <SkeletonLoader height={14} width="40%" />
              <SkeletonLoader height={14} />
              <SkeletonLoader height={14} />
              <SkeletonLoader height={14} width="70%" />
            </View>
          ) : announcement ? (
            <>
              {/* Priority Badge */}
              <View style={{ alignSelf: 'flex-start' }}>
                <View
                  style={{
                    backgroundColor: priorityStyle.bg,
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                  }}
                >
                  <Text style={{ color: priorityStyle.text, fontSize: 12, fontWeight: '600' }}>
                    {announcement.priority}
                  </Text>
                </View>
              </View>

              {/* Title */}
              <Text style={{ fontSize: 20, fontWeight: '700', color: VITANA_COLORS.text, lineHeight: 28 }}>
                {announcement.title}
              </Text>

              {/* Meta */}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Feather name="calendar" size={13} color={VITANA_COLORS.textSecondary} />
                  <Text style={{ fontSize: 13, color: VITANA_COLORS.textSecondary }}>
                    {formatDate(announcement.publishedAt)}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Feather name="user" size={13} color={VITANA_COLORS.textSecondary} />
                  <Text style={{ fontSize: 13, color: VITANA_COLORS.textSecondary }}>
                    {announcement.publishedBy}
                  </Text>
                </View>
              </View>

              {/* Divider */}
              <View style={{ height: 1, backgroundColor: VITANA_COLORS.border }} />

              {/* Content */}
              <Text
                style={{ fontSize: 15, color: VITANA_COLORS.text, lineHeight: 24 }}
              >
                {announcement.content}
              </Text>

              {/* Attachment */}
              {announcement.attachmentUrl && (
                <TouchableOpacity
                  onPress={() => WebBrowser.openBrowserAsync(announcement.attachmentUrl!)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    backgroundColor: '#eff6ff',
                    borderRadius: 10,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: '#bfdbfe',
                  }}
                >
                  <Feather name="paperclip" size={18} color="#2563eb" />
                  <Text style={{ fontSize: 14, color: '#2563eb', fontWeight: '500', flex: 1 }}>
                    View Attachment
                  </Text>
                  <Feather name="external-link" size={14} color="#2563eb" />
                </TouchableOpacity>
              )}

              {/* Tags */}
              {announcement.tags && announcement.tags.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {announcement.tags.map((tag) => (
                    <View
                      key={tag}
                      style={{
                        backgroundColor: '#f3f4f6',
                        borderRadius: 20,
                        paddingHorizontal: 12,
                        paddingVertical: 5,
                      }}
                    >
                      <Text style={{ fontSize: 12, color: VITANA_COLORS.textSecondary }}>#{tag}</Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          ) : (
            <Text style={{ fontSize: 15, color: VITANA_COLORS.textSecondary, textAlign: 'center', marginTop: 32 }}>
              Announcement not found.
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
