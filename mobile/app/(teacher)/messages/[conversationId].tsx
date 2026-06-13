import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Feather } from '@expo/vector-icons';
import {
  communicationApi,
  type MessageDto,
  type ConversationDto,
} from '@/api/endpoints/communication';
import { useAuthStore } from '@/stores/authStore';
import { useAppTheme } from '@/theme';
import { VITANA_COLORS } from '@/theme/tokens';
import { queryClient } from '@/api/queryClient';

type OptimisticMessage = MessageDto & { isOptimistic?: boolean };

export default function TeacherMessageThread() {
  const { conversationId, recipientId, recipientName } =
    useLocalSearchParams<{
      conversationId: string;
      recipientId?: string;
      recipientName?: string;
    }>();

  const isNew = conversationId === 'new';
  const { user } = useAuthStore();
  const { colors } = useAppTheme();
  const flatListRef = useRef<FlatList>(null);

  const [inputText, setInputText] = useState('');
  const [isConnected, setIsConnected] = useState(true);
  const [actualConversationId, setActualConversationId] = useState<string | null>(
    isNew ? null : conversationId,
  );

  const draftKey = `message_draft_${actualConversationId ?? recipientId ?? 'new'}`;

  // ── Connectivity ─────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => setIsConnected(!!state.isConnected));
    return unsub;
  }, []);

  // ── Draft restore ────────────────────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(draftKey).then((draft) => {
      if (draft) setInputText(draft);
    });
  }, [draftKey]);

  // ── Draft save (debounced) ────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputText.trim()) {
        void AsyncStorage.setItem(draftKey, inputText);
      } else {
        void AsyncStorage.removeItem(draftKey);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [inputText, draftKey]);

  // ── Fetch conversation header (for participant name) ─────────────────────
  const { data: conversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => communicationApi.getConversations(1),
    staleTime: 30_000,
    enabled: !isNew,
  });
  const conversation = conversations?.items.find((c: ConversationDto) => c.id === conversationId);
  const headerName = isNew
    ? (recipientName ?? 'New Conversation')
    : (conversation?.participantName ?? 'Message');

  // ── Fetch messages ────────────────────────────────────────────────────────
  const {
    data,
    fetchNextPage,
    isLoading,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['messages', actualConversationId],
    queryFn: ({ pageParam = 1 }) =>
      communicationApi.getMessages(actualConversationId!, pageParam as number),
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
    initialPageParam: 1,
    staleTime: 15_000,
    refetchInterval: 15_000,
    enabled: !!actualConversationId,
  });

  const allMessages: OptimisticMessage[] = (
    data?.pages.flatMap((p) => p.items) ?? []
  ).reverse();

  // ── Mark read on open ────────────────────────────────────────────────────
  useEffect(() => {
    if (!actualConversationId || !allMessages.length) return;
    const unread = allMessages.filter(
      (m) => m.senderId !== user?.id && m.status !== 'read',
    );
    unread.forEach((m) => {
      void communicationApi.markRead(m.id).catch(() => undefined);
    });
    if (unread.length > 0) {
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
      void queryClient.invalidateQueries({ queryKey: ['messages-unread'] });
    }
  // Only run when conversation opens (actualConversationId changes)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actualConversationId]);

  // ── Send message ─────────────────────────────────────────────────────────
  const sendMutation = useMutation({
    mutationFn: (text: string) =>
      communicationApi.sendMessage({
        conversationId: actualConversationId ?? undefined,
        recipientId: actualConversationId ? '' : (recipientId ?? ''),
        message: text,
      }),
    onMutate: async (text: string) => {
      const optimistic: OptimisticMessage = {
        id: `optimistic-${Date.now()}`,
        senderId: user?.id ?? '',
        senderName: user?.fullName ?? '',
        message: text,
        sentAt: new Date().toISOString(),
        status: 'sending',
        isOptimistic: true,
      };

      if (actualConversationId) {
        queryClient.setQueryData(['messages', actualConversationId], (old: typeof data) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page, i) =>
              i === 0 ? { ...page, items: [optimistic, ...page.items] } : page,
            ),
          };
        });
      }
      return { optimistic };
    },
    onSuccess: (msg) => {
      if (isNew && msg.id && !actualConversationId) {
        setActualConversationId(msg.id);
      }
      void queryClient.invalidateQueries({ queryKey: ['messages', actualConversationId ?? msg.id] });
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (_err, _text, context) => {
      if (context?.optimistic && actualConversationId) {
        queryClient.setQueryData(['messages', actualConversationId], (old: typeof data) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.filter((m) => m.id !== context.optimistic.id),
            })),
          };
        });
      }
    },
  });

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || !isConnected || sendMutation.isPending) return;
    setInputText('');
    await AsyncStorage.removeItem(draftKey);
    sendMutation.mutate(text);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [inputText, isConnected, sendMutation, draftKey]);

  const canSend = inputText.trim().length > 0 && isConnected && !sendMutation.isPending;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
          <Feather name="arrow-left" size={22} color={VITANA_COLORS.text} />
        </TouchableOpacity>
        <View
          className="w-8 h-8 rounded-full items-center justify-center mr-2"
          style={{ backgroundColor: VITANA_COLORS.surface }}
        >
          <Text className="text-sm font-bold" style={{ color: VITANA_COLORS.textSecondary }}>
            {headerName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text className="font-bold text-gray-900 flex-1" numberOfLines={1}>
          {headerName}
        </Text>
      </View>

      {/* Message list */}
      {isLoading && !!actualConversationId ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={allMessages}
          keyExtractor={(item) => item.id}
          inverted
          onEndReached={() => {
            if (!isFetchingNextPage) fetchNextPage();
          }}
          onEndReachedThreshold={0.3}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
          ListEmptyComponent={
            isNew ? (
              <View className="items-center mt-16 px-6">
                <Feather name="message-circle" size={40} color={VITANA_COLORS.textSecondary} />
                <Text className="text-gray-400 text-sm text-center mt-3">
                  Start the conversation by sending a message below.
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }: { item: OptimisticMessage }) => (
            <MessageBubble item={item} userId={user?.id ?? ''} primaryColor={colors.primary} />
          )}
        />
      )}

      {/* Input area */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View className="bg-white border-t border-gray-100 px-4 py-3 flex-row items-end gap-2">
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={2000}
            placeholder={isConnected ? 'Type a message…' : 'No connection'}
            placeholderTextColor={VITANA_COLORS.textSecondary}
            editable={isConnected}
            onSubmitEditing={handleSend}
            className="flex-1 border border-gray-200 rounded-2xl px-4 py-2.5 text-gray-900 bg-gray-50 max-h-24"
            style={{ fontSize: 15 }}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!canSend}
            accessibilityLabel="Send message"
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: canSend ? colors.primary : VITANA_COLORS.border }}
          >
            {sendMutation.isPending ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Feather name="send" size={17} color={canSend ? 'white' : VITANA_COLORS.textSecondary} />
            )}
          </TouchableOpacity>
        </View>

        {!isConnected && (
          <View className="px-4 pb-2 bg-white">
            <Text className="text-xs text-center" style={{ color: VITANA_COLORS.textSecondary }}>
              Messaging requires an internet connection
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function MessageBubble({
  item,
  userId,
  primaryColor,
}: {
  item: OptimisticMessage;
  userId: string;
  primaryColor: string;
}) {
  const isMine = item.senderId === userId;
  const timeStr = new Date(item.sentAt).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View className={`mb-2 flex-row ${isMine ? 'justify-end' : 'justify-start'}`}>
      <View
        className={`max-w-xs rounded-2xl px-4 py-2.5 ${isMine ? 'rounded-tr-sm' : 'rounded-tl-sm'} ${item.isOptimistic ? 'opacity-70' : ''}`}
        style={{ backgroundColor: isMine ? primaryColor : VITANA_COLORS.surface }}
      >
        <Text
          className="text-sm leading-5"
          style={{ color: isMine ? 'white' : VITANA_COLORS.text }}
        >
          {item.message}
        </Text>
        <View className="flex-row items-center justify-end mt-1 gap-1">
          <Text
            className="text-xs"
            style={{ color: isMine ? 'rgba(255,255,255,0.7)' : VITANA_COLORS.textSecondary }}
          >
            {timeStr}
          </Text>
          {isMine && (
            <Feather
              name={item.status === 'read' ? 'check-circle' : 'check'}
              size={11}
              color={item.status === 'read' ? '#93c5fd' : 'rgba(255,255,255,0.65)'}
            />
          )}
        </View>
      </View>
    </View>
  );
}
