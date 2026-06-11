# PROMPT-14: Communication & Messaging

> **Version**: 2.0 — Full 10-Phase Anatomy  
> **Epic**: EP-15 — Communication & Messaging  
> **Sprint**: 19–20 (Weeks 37–40)  
> **Story Points**: 26  
> **Prerequisites**: PROMPT-05 ✓ (push notifications — new message requires push)  
> **Parallel with**: PROMPT-15 (Analytics)

---

## PHASE 1: Context & Scope

### What We're Building

Direct messaging between teachers and parents (within the school context), teacher-created announcements, and class broadcasts. This replaces unofficial WhatsApp/SMS communications with a tracked, in-app channel.

**Capabilities:**
- Teacher: conversation list (parents of their classes)
- Teacher: conversation thread with optimistic updates + read receipts
- Teacher: initiate new conversation (select from parent list)
- Parent: conversation list (only teacher threads)
- Parent: reply to teacher messages
- Teacher: create class announcements
- Teacher: broadcast to all parents of a class
- Push notification on every new message
- Draft persistence (save unsent message to AsyncStorage)
- Unread count badge on Messages navigation item

### Current State

- ✅ Push notifications live (PROMPT-05)
- ✅ TanStack Query configured
- ✅ Tab navigators with "More" section exist
- ❌ Messaging screens not built
- ❌ Communication API endpoints not called

### Success Criteria

- [ ] Teacher sends message → parent receives push within 5 seconds
- [ ] Parent replies → teacher receives push
- [ ] Conversation list sorted by most recent message
- [ ] Unread messages shown in bold with blue dot
- [ ] "Mark All Read" clears unread count badge
- [ ] Optimistic update: message appears instantly before server confirms
- [ ] Draft message preserved on app close + restored on re-open
- [ ] Offline indicator shows on send button when no connectivity
- [ ] Announcement created by teacher → shows in parent's feed
- [ ] Urgent announcement confirmation dialog with recipient count

---

## PHASE 2: Analysis Phase

### Read First

```bash
docs/mobile_application_docs/epics/EP-15-communication-messaging.md
```

### API Contracts

```
GET /api/communication/messages/conversations?page=1&pageSize=20
  → [{ id, participantId, participantName, participantRole, 
         lastMessage, lastMessageTime, unreadCount }]

GET /api/communication/messages?conversationId=X&page=1&pageSize=50
  → PaginatedResponse<Message>
  Message: { id, senderId, senderName, message, sentAt, status: 'sent'|'delivered'|'read' }

POST /api/communication/messages
  Body: { conversationId?, recipientId, message }
  → Message

PUT /api/communication/messages/{id}/read  → {}
GET /api/communication/messages/unread-count → { count: number }

POST /api/announcements  → Announcement (teacher creates for own class)
GET /api/announcements?role=teacher&classIds=X,Y → Announcement[]
```

### Polling Strategy

No WebSocket. Use TanStack Query `refetchInterval`:
- Conversation list: 30 seconds
- Active conversation thread: 15 seconds (when screen is focused)
- Unread count: 60 seconds
- On push notification received: immediate `queryClient.invalidateQueries`

---

## PHASE 3: Technical Planning

### Screen Map

```
mobile/app/(teacher)/
└── messages/
    ├── index.tsx                ← Conversations list
    ├── new.tsx                  ← New conversation (select parent)
    └── [conversationId].tsx     ← Message thread

mobile/app/(parent)/
└── messages/
    ├── index.tsx                ← Conversations list (reply-only)
    └── [conversationId].tsx     ← Message thread

mobile/app/(teacher)/
└── announcements/
    ├── index.tsx                ← My announcements
    └── create.tsx               ← Create form (already in PROMPT-09 for admin — teacher variant)
```

---

## PHASE 4: Database Design

> No SQLite for messages — requires connectivity. Draft stored in AsyncStorage.

```typescript
// Draft pattern:
const draftKey = `message_draft_${conversationId}`;
// Store: AsyncStorage.setItem(draftKey, draftText)
// Restore: AsyncStorage.getItem(draftKey) on mount
// Clear: AsyncStorage.removeItem(draftKey) on send
```

---

## PHASE 5: Backend Implementation

> All communication endpoints already exist.  
> Only change needed: push notification wired for `new_message` type.  
> This was handled in PROMPT-11/PROMPT-05 backend section.

---

## PHASE 6: Mobile Implementation

### 6.1 Communication API

```typescript
// mobile/src/api/endpoints/communication.ts
import apiClient from '../client';

export const communicationApi = {
  getConversations: (page = 1) =>
    apiClient.get('/communication/messages/conversations', { params: { page, pageSize: 20 } }),

  getMessages: (conversationId: string, page = 1) =>
    apiClient.get('/communication/messages', { params: { conversationId, page, pageSize: 50 } }),

  sendMessage: (data: { conversationId?: string; recipientId: string; message: string }) =>
    apiClient.post('/communication/messages', data),

  markRead: (messageId: string) =>
    apiClient.put(`/communication/messages/${messageId}/read`),

  getUnreadCount: () =>
    apiClient.get('/communication/messages/unread-count'),

  createAnnouncement: (data: any) =>
    apiClient.post('/announcements', data),

  getTeacherAnnouncements: (page = 1) =>
    apiClient.get('/announcements', { params: { role: 'teacher', page, pageSize: 20 } }),
};
```

### 6.2 Conversations List

```typescript
// mobile/app/(teacher)/messages/index.tsx
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { communicationApi } from '../../../src/api/endpoints/communication';
import { useAppTheme } from '../../../src/theme/SchoolThemeProvider';
import { formatRelativeTime, VITANA_DESIGN_TOKENS } from '@vitana/shared-utils';
import { Image } from 'expo-image';
import { EmptyState } from '../../../src/components/common/EmptyState';

export default function ConversationsList() {
  const { colors } = useAppTheme();

  const { data, fetchNextPage, hasNextPage, isLoading, refetch } = useInfiniteQuery({
    queryKey: ['conversations'],
    queryFn: ({ pageParam = 1 }) => communicationApi.getConversations(pageParam),
    getNextPageParam: (last: any) => last.page < last.totalPages ? last.page + 1 : undefined,
    initialPageParam: 1,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });

  const conversations = data?.pages.flatMap((p: any) => p.items) ?? [];

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-4 pt-4 pb-2 flex-row items-center justify-between">
        <Text className="font-heading text-xl text-text-primary">Messages</Text>
        <TouchableOpacity
          onPress={() => router.push('/(teacher)/messages/new')}
          className="w-9 h-9 rounded-full items-center justify-center"
          style={{ backgroundColor: colors.primary }}
        >
          <Feather name="plus" size={20} color="white" />
        </TouchableOpacity>
      </View>

      {conversations.length === 0 && !isLoading ? (
        <EmptyState
          icon="message-square"
          title="No conversations"
          subtitle="Tap + to start a conversation with a parent"
        />
      ) : (
        <FlashList
          data={conversations}
          estimatedItemSize={76}
          keyExtractor={(item: any) => item.id}
          onEndReached={() => { if (hasNextPage) fetchNextPage(); }}
          onEndReachedThreshold={0.3}
          renderItem={({ item }: { item: any }) => (
            <TouchableOpacity
              className={`flex-row items-center px-4 py-4 border-b border-border ${item.unreadCount > 0 ? 'bg-primary/5' : 'bg-white'}`}
              onPress={() => router.push(`/(teacher)/messages/${item.id}`)}
              activeOpacity={0.7}
            >
              {/* Avatar */}
              <View className="w-11 h-11 rounded-full bg-surface items-center justify-center mr-3">
                <Text className="font-heading text-lg text-text-secondary">
                  {item.participantName[0]}
                </Text>
              </View>
              {/* Content */}
              <View className="flex-1 min-w-0">
                <View className="flex-row items-center justify-between">
                  <Text className={`font-body-${item.unreadCount > 0 ? 'semibold' : 'medium'} text-text-primary`}>
                    {item.participantName}
                  </Text>
                  <Text className="font-body text-text-secondary text-xs">
                    {formatRelativeTime(item.lastMessageTime)}
                  </Text>
                </View>
                <View className="flex-row items-center justify-between mt-0.5">
                  <Text
                    className={`font-body text-sm flex-1 mr-2 ${item.unreadCount > 0 ? 'text-text-primary' : 'text-text-secondary'}`}
                    numberOfLines={1}
                  >
                    {item.lastMessage}
                  </Text>
                  {item.unreadCount > 0 && (
                    <View
                      className="w-5 h-5 rounded-full items-center justify-center"
                      style={{ backgroundColor: colors.primary }}
                    >
                      <Text className="text-white text-xs font-body-bold">{item.unreadCount}</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}
```

### 6.3 Message Thread

```typescript
// mobile/app/(teacher)/messages/[conversationId].tsx
import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery, useMutation } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Feather } from '@expo/vector-icons';
import { communicationApi } from '../../../src/api/endpoints/communication';
import { useAuthStore } from '../../../src/stores/authStore';
import { useAppTheme } from '../../../src/theme/SchoolThemeProvider';
import { queryClient } from '../../../src/api/queryClient';
import { formatDateTimeIST, VITANA_DESIGN_TOKENS } from '@vitana/shared-utils';

export default function MessageThread() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const { user } = useAuthStore();
  const { colors } = useAppTheme();
  const [inputText, setInputText] = useState('');
  const [isConnected, setIsConnected] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  const draftKey = `message_draft_${conversationId}`;

  useEffect(() => {
    // Restore draft
    AsyncStorage.getItem(draftKey).then(draft => { if (draft) setInputText(draft); });
    // Connectivity
    const unsub = NetInfo.addEventListener(state => setIsConnected(!!state.isConnected));
    return unsub;
  }, []);

  // Save draft as user types
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputText.trim()) AsyncStorage.setItem(draftKey, inputText);
      else AsyncStorage.removeItem(draftKey);
    }, 500);
    return () => clearTimeout(timer);
  }, [inputText]);

  const { data, fetchNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['messages', conversationId],
    queryFn: ({ pageParam = 1 }) => communicationApi.getMessages(conversationId!, pageParam),
    getNextPageParam: (last: any) => last.page < last.totalPages ? last.page + 1 : undefined,
    initialPageParam: 1,
    staleTime: 15 * 1000,
    refetchInterval: 15 * 1000,
  });

  const allMessages = (data?.pages.flatMap((p: any) => p.items) ?? []).reverse();

  const sendMutation = useMutation({
    mutationFn: (message: string) =>
      communicationApi.sendMessage({ conversationId: conversationId!, recipientId: '', message }),
    onMutate: async (message: string) => {
      // Optimistic update
      const optimisticMsg = {
        id: `temp-${Date.now()}`,
        senderId: user!.id,
        message,
        sentAt: new Date().toISOString(),
        status: 'sending',
        isOptimistic: true,
      };
      queryClient.setQueryData(['messages', conversationId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any, i: number) =>
            i === 0 ? { ...page, items: [optimisticMsg, ...page.items] } : page
          ),
        };
      });
      return { optimisticMsg };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  async function handleSend() {
    if (!inputText.trim() || !isConnected) return;
    const text = inputText.trim();
    setInputText('');
    await AsyncStorage.removeItem(draftKey);
    sendMutation.mutate(text);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-border">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Feather name="arrow-left" size={22} color={VITANA_DESIGN_TOKENS.colors.textPrimary} />
        </TouchableOpacity>
        <Text className="font-heading text-base text-text-primary flex-1">Message</Text>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={allMessages}
        keyExtractor={(item: any) => item.id}
        inverted
        onEndReached={() => { if (data?.pages[data.pages.length - 1]) fetchNextPage(); }}
        onEndReachedThreshold={0.3}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
        renderItem={({ item }: { item: any }) => {
          const isMine = item.senderId === user?.id;
          return (
            <View className={`mb-2 flex-row ${isMine ? 'justify-end' : 'justify-start'}`}>
              <View
                className={`max-w-xs rounded-2xl px-4 py-2.5 ${
                  isMine ? 'rounded-tr-sm' : 'rounded-tl-sm'
                } ${item.isOptimistic ? 'opacity-70' : ''}`}
                style={{ backgroundColor: isMine ? colors.primary : VITANA_DESIGN_TOKENS.colors.surface }}
              >
                <Text
                  className="font-body text-sm"
                  style={{ color: isMine ? 'white' : VITANA_DESIGN_TOKENS.colors.textPrimary }}
                >
                  {item.message}
                </Text>
                <View className="flex-row items-center justify-end mt-1 gap-1">
                  <Text
                    className="font-body text-xs"
                    style={{ color: isMine ? 'rgba(255,255,255,0.7)' : VITANA_DESIGN_TOKENS.colors.textSecondary }}
                  >
                    {new Date(item.sentAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  {isMine && (
                    <Feather
                      name={item.status === 'read' ? 'check-circle' : 'check'}
                      size={12}
                      color={item.status === 'read' ? '#93c5fd' : 'rgba(255,255,255,0.7)'}
                    />
                  )}
                </View>
              </View>
            </View>
          );
        }}
      />

      {/* Input */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View className="flex-row items-end px-4 py-3 bg-white border-t border-border gap-2">
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={2000}
            placeholder={isConnected ? 'Type a message...' : 'No connection'}
            placeholderTextColor={VITANA_DESIGN_TOKENS.colors.textSecondary}
            editable={isConnected}
            className="flex-1 border border-border rounded-2xl px-4 py-2.5 font-body text-text-primary bg-surface max-h-24"
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!inputText.trim() || !isConnected || sendMutation.isPending}
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: inputText.trim() && isConnected ? colors.primary : VITANA_DESIGN_TOKENS.colors.border }}
          >
            <Feather name="send" size={18} color={inputText.trim() && isConnected ? 'white' : VITANA_DESIGN_TOKENS.colors.textSecondary} />
          </TouchableOpacity>
        </View>
        {!isConnected && (
          <View className="px-4 pb-2">
            <Text className="font-body text-xs text-text-secondary text-center">
              Messaging requires an internet connection
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
```

### 6.4 Wire Push → Query Invalidation

```typescript
// In PROMPT-05's setupNotificationHandlers(), the 'new_message' handler already
// calls queryClient.invalidateQueries. Verify this is wired:

// In src/notifications/handler.ts receivedSub:
if (type === 'new_message' && data?.conversationId) {
  queryClient.invalidateQueries({ queryKey: ['messages', data.conversationId] });
  queryClient.invalidateQueries({ queryKey: ['conversations'] });
  queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
}
```

---

## PHASE 9: Testing

### Maestro E2E

```yaml
# mobile/maestro/tests/teacher_send_message.yaml
appId: com.vitana.sms
---
- launchApp
- tapOn: "More"
- tapOn: "Messages"
- tapOn: "+"  # new conversation
- tapOn: index: 0  # first parent in list
- tapOn: "Type a message..."
- inputText: "Hello, I wanted to discuss Aarav's progress."
- tapOn:
    id: "send-button"
- assertVisible: "Hello, I wanted to discuss"
```

### Validation Checklist

- [ ] Message appears in thread immediately (optimistic update)
- [ ] Teacher sends → parent receives push notification
- [ ] Conversations sorted by most recent
- [ ] Unread badge decrements when conversation is opened
- [ ] Draft preserved: type in input → background app → return → text still there
- [ ] Send disabled when offline (greyed out button)
- [ ] Teacher announcement created → visible in parent's announcements feed
- [ ] Urgent announcement: confirmation dialog before posting

---

## PHASE 10: Documentation & Verification

### Git Commit

```bash
git add .
git commit -m "feat(mobile/messaging): teacher-parent messaging system

- Conversation list: sorted by recency, unread badge per conversation
- Message thread: optimistic updates, read receipts, draft persistence
- New conversation: select parent from teacher's class students
- Push notification → immediate query invalidation in thread
- Parent message view: reply-only (cannot initiate)
- Teacher announcement creation for own classes
- Unread count badge on Messages navigation item
- Offline indicator on send button when no connectivity

Next: PROMPT-15 (Analytics & Monitoring)"
```

---

**END OF PROMPT-14**
