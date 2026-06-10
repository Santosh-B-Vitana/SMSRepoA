# PROMPT-14: Communication & Messaging Implementation

> **Prompt ID:** PROMPT-14  
> **Epic:** EP-15 — Communication & Messaging  
> **Phase:** 3–4 — Sprint 19–20  
> **Estimated Story Points:** 26  
> **Prerequisites:** PROMPT-01, PROMPT-02, PROMPT-05 (push notifications) complete  
> **Related Architecture Docs:** [epics/EP-15-communication-messaging](../epics/EP-15-communication-messaging.md)

---

## Context

Build the complete messaging and communication system. This covers:
1. Direct messaging between teachers and parents.
2. Teacher-created class announcements.
3. Class-level broadcast messaging.

**Backend context:**
- `GET /api/communication/messages/conversations` — list of my conversations (paginated).
- `GET /api/communication/messages?conversationId=X&page=1&pageSize=50` — messages in a conversation.
- `POST /api/communication/messages` — send a message. Body: `{ recipientId, message, conversationId? }`.
- `PUT /api/communication/messages/{id}/read` — mark message as read.
- `GET /api/communication/messages/unread-count` — total unread count.
- Authorization: teachers can message parents of their assigned classes. Parents can reply to any teacher.
- `POST /api/announcements` — create announcement.
- `GET /api/announcements?role=teacher&classIds=X,Y` — teacher-filtered announcements.

**Polling strategy:** No WebSocket exists. Use TanStack Query with `refetchInterval: 15000` (15 seconds) for active conversations. Silent push can trigger immediate invalidation.

---

## Requirements

### Teacher Messaging

#### Screen: Conversations List (`/(teacher)/messages/`)

```
Messages
─────────────────────────────────────
  [Search conversations...]
─────────────────────────────────────
  ●  Priya Sharma (Aarav's mother)
     "Thank you so much, teacher"          2 min ago
  
  Ravi Gupta (Priya's father)
     You: "Please ensure homework..."      Yesterday
  
  ●  Sunita Mehta (Rohan's mother)
     ●  (3 unread)                         Jun 8
─────────────────────────────────────
  [+ New Conversation]
```

- Unread conversations sorted to top.
- Blue dot for unread messages.
- Last message preview (truncated to 50 chars).
- Relative timestamp.
- Pull-to-refresh.
- `useQuery({ queryKey: ['conversations'], refetchInterval: 30000 })`.

#### Screen: New Conversation (`/(teacher)/messages/new`)

- Search parents by student name or parent name (from teacher's class students).
- `GET /api/students?classId=X&minimal=true` → get student list → show parent names.
- Select parent → navigate to conversation thread.

#### Screen: Conversation Thread (`/(teacher)/messages/[conversationId]`)

- Messages displayed in chat bubble style (teacher right, parent left).
- Read receipts: single tick (sent), double tick grey (delivered), double tick blue (read).
- Scroll to bottom on open.
- Load older messages on scroll-to-top (pagination).
- Message input bar at bottom.
- Send button (disabled when empty).
- `useQuery({ queryKey: ['messages', conversationId], refetchInterval: 15000 })`.

**Send message:**
```typescript
const sendMutation = useMutation({
  mutationFn: (message: string) => communicationApi.sendMessage({
    conversationId,
    recipientId,
    message,
  }),
  onMutate: async (message) => {
    // Optimistic update: show message immediately
    queryClient.setQueryData(['messages', conversationId], (old) => ({
      ...old,
      items: [...old.items, {
        id: `temp-${Date.now()}`,
        message,
        senderId: user.id,
        sentAt: new Date().toISOString(),
        status: 'sending',
      }],
    }));
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
  },
});
```

**Draft persistence:**
```typescript
// Save draft as user types (debounced 500ms)
const draftKey = `message_draft_${conversationId}`;
await AsyncStorage.setItem(draftKey, inputText);

// On mount: restore draft
const draft = await AsyncStorage.getItem(draftKey);
if (draft) setInputText(draft);

// On send: clear draft
await AsyncStorage.removeItem(draftKey);
```

### Parent Messaging

#### Screen: Parent Conversations (`/(parent)/messages/`)

Same structure as teacher but:
- Parent can only see conversations with teachers of their child's classes.
- Cannot initiate — can only reply to teacher messages.

#### Screen: Parent Thread (`/(parent)/messages/[conversationId]`)

- Same UI as teacher thread.
- Parent bubbles on right, teacher on left.

### Teacher Announcements

#### Screen: My Announcements (`/(teacher)/announcements/`)

```
Announcements
─────────────────────────────────────
  [+ Create Announcement]
─────────────────────────────────────
  Sports Day Practice              Normal
  Class 8A · Posted Jun 10
  
  ⚠ Important: Parent Meeting      High
  All Classes · Posted Jun 8
  [Edit] [Delete]
─────────────────────────────────────
```

#### Screen: Create Announcement (`/(teacher)/announcements/create`)

```
Create Announcement
─────────────────────────────────
Title *             [max 100 chars]
Body  *             [rich textarea, 4000 chars]
Priority            [Low] [Normal] [High] [Urgent]
Audience
  ● My Classes (8A, 8B)
  ○ One Class → [select]
  ○ All Parents
  ○ All Students
Expiry              [Date (optional)]
─────────────────────────────────
                     [Post Now]
```

Validation: title and body required.

On "Urgent" + "All Parents": confirmation dialog showing recipient count.

#### Class Broadcast (`/(teacher)/messages/broadcast`)

- Select class.
- Write message.
- `POST /api/communication/messages` with `broadcast: true, classId: X`.
- This creates a one-way broadcast (parents receive but cannot reply as a group — they can reply individually).

---

## Push Notification Integration

When a new message is sent:
1. Backend `NotificationService.CreateAndPushAsync()` sends push to recipient.
2. Mobile receives push → if conversation is currently open: `queryClient.invalidateQueries(['messages', conversationId])`.
3. If conversation is not open: show in-app notification banner + increment unread count.

Push notification type: `new_message`  
Deep link: `/(teacher)/messages/{conversationId}` or `/(parent)/messages/{conversationId}`

```typescript
// In notification handler
if (type === 'new_message') {
  const { conversationId } = data;
  // If the conversation is currently open: invalidate query
  queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
  queryClient.invalidateQueries({ queryKey: ['conversations'] });
}
```

---

## Unread Count Badge

```typescript
// src/features/messaging/hooks/useUnreadCount.ts
export function useUnreadMessageCount() {
  return useQuery({
    queryKey: ['messages', 'unread-count'],
    queryFn: () => communicationApi.getUnreadCount(),
    refetchInterval: 60 * 1000,  // 60 seconds
  });
}
```

Show badge on "Messages" navigation item (tab bar or "More" section).

---

## Offline Strategy

Messages require connectivity. Show clear indicator:

```typescript
function MessageInput({ onSend }: Props) {
  const { isConnected } = useNetInfo();
  return (
    <View style={styles.inputBar}>
      <TextInput ... />
      <TouchableOpacity
        onPress={onSend}
        disabled={!isConnected}
      >
        <Send color={isConnected ? primaryColor : '#9ca3af'} />
      </TouchableOpacity>
      {!isConnected && (
        <Text style={styles.offlineHint}>
          Messaging requires an internet connection
        </Text>
      )}
    </View>
  );
}
```

Draft is saved to AsyncStorage even offline — sent when connectivity returns (manual retry, not auto-queued).

---

## Implementation Tasks

1. Implement `/(teacher)/messages/index.tsx` — conversations list.
2. Implement `/(teacher)/messages/new.tsx` — parent search and selection.
3. Implement `/(teacher)/messages/[conversationId].tsx` — thread with optimistic updates.
4. Implement `/(parent)/messages/index.tsx` — parent conversation list.
5. Implement `/(parent)/messages/[conversationId].tsx` — parent thread.
6. Implement `/(teacher)/announcements/index.tsx` — teacher announcement management.
7. Implement `/(teacher)/announcements/create.tsx` — create form.
8. Implement class broadcast flow.
9. Implement `useUnreadMessageCount()` hook with badge.
10. Wire push notification → conversation query invalidation.
11. Implement message draft persistence (AsyncStorage per conversation).
12. Implement read receipt update when conversation opened.
13. Implement `communicationApi.ts` endpoints.
14. Write E2E tests.

---

## Acceptance Criteria

- [ ] Teacher sends message → parent receives push notification within 5 seconds.
- [ ] Parent replies → teacher receives push notification.
- [ ] Unread badge on Messages navigation item shows correct count.
- [ ] Opening conversation marks messages as read.
- [ ] Optimistic update: message appears immediately on send (before server confirms).
- [ ] Draft message preserved on app close + restore on re-open.
- [ ] "Offline" indicator shown on message input when no connectivity.
- [ ] Cannot initiate message from parent side (reply-only UI).
- [ ] Announcement created by teacher shows in parent's announcements feed.
- [ ] Urgent announcement: confirmation dialog with recipient count shown.
- [ ] Message pagination: scrolling up loads older messages.

---

## Testing Requirements

Unit:
- `useSendMessage` optimistic update: message appears before API resolves.
- Draft persistence: save to AsyncStorage on input change; restore on mount.

E2E (Maestro):
- `teacher_send_message.yaml`: login as teacher → messages → new → select parent → send → verify appears.
- `parent_reply_message.yaml`: login as parent → messages → reply → verify in teacher thread.

Manual:
- Test on physical device with 4G degraded: message input shows correctly.
- Test notification tap → correct conversation opens.

---

## Definition of Done

- [ ] All acceptance criteria pass.
- [ ] Tested on physical devices (teacher + parent on separate phones).
- [ ] Message polling doesn't drain battery excessively (refetchInterval ≥ 15s when conversation open).
- [ ] No TypeScript errors.
- [ ] Peer review complete.
