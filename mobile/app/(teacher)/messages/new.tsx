import { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { communicationApi, type MessageRecipientDto } from '@/api/endpoints/communication';
import { useAppTheme } from '@/theme';
import { VITANA_COLORS } from '@/theme/tokens';

export default function NewConversation() {
  const { colors } = useAppTheme();
  const [search, setSearch] = useState('');

  const { data: recipients = [], isLoading, isError } = useQuery({
    queryKey: ['message-recipients'],
    queryFn: communicationApi.getMessageRecipients,
    staleTime: 5 * 60_000,
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return recipients;
    const q = search.toLowerCase();
    return recipients.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.studentName?.toLowerCase().includes(q) ||
        r.className?.toLowerCase().includes(q),
    );
  }, [recipients, search]);

  function handleSelectRecipient(recipient: MessageRecipientDto) {
    router.push({
      pathname: '/(teacher)/messages/[conversationId]' as never,
      params: {
        conversationId: 'new',
        recipientId: recipient.id,
        recipientName: recipient.name,
      },
    });
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center px-4 pt-3 pb-2 border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="p-1 mr-3">
          <Feather name="arrow-left" size={22} color={VITANA_COLORS.text} />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900">New Message</Text>
      </View>

      <View className="px-4 py-3 border-b border-gray-100">
        <View className="flex-row items-center bg-gray-100 rounded-xl px-3 py-2 gap-2">
          <Feather name="search" size={16} color={VITANA_COLORS.textSecondary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search parents or students..."
            placeholderTextColor={VITANA_COLORS.textSecondary}
            className="flex-1 text-gray-900 text-sm"
            autoFocus
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : isError ? (
        <View className="flex-1 items-center justify-center px-6">
          <Feather name="wifi-off" size={40} color={VITANA_COLORS.textSecondary} />
          <Text className="text-gray-500 mt-3 text-center">
            Could not load recipients. Check your connection and try again.
          </Text>
        </View>
      ) : filtered.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Feather name="users" size={40} color={VITANA_COLORS.textSecondary} />
          <Text className="text-gray-500 mt-3 text-center">
            {search ? 'No results for that search' : 'No parents to message right now'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }: { item: MessageRecipientDto }) => (
            <TouchableOpacity
              className="flex-row items-center px-4 py-3.5 border-b border-gray-100 bg-white"
              onPress={() => handleSelectRecipient(item)}
              activeOpacity={0.7}
            >
              <View
                className="w-10 h-10 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: VITANA_COLORS.surface }}
              >
                <Text className="text-base font-bold" style={{ color: VITANA_COLORS.textSecondary }}>
                  {item.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-gray-900 font-medium">{item.name}</Text>
                {item.studentName ? (
                  <Text className="text-xs mt-0.5" style={{ color: VITANA_COLORS.textSecondary }}>
                    Parent of {item.studentName}
                    {item.className ? ` · ${item.className}` : ''}
                  </Text>
                ) : item.className ? (
                  <Text className="text-xs mt-0.5" style={{ color: VITANA_COLORS.textSecondary }}>
                    {item.className}
                  </Text>
                ) : null}
              </View>
              <Feather name="chevron-right" size={16} color={VITANA_COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}
