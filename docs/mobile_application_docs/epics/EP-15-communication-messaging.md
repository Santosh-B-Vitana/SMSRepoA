# EP-15: Communication & Messaging

> **Epic ID:** EP-15  
> **Priority:** P2  
> **Estimated Sprints:** 2  
> **Phase:** 3–4 — Sprint 19  
> **Related Docs:** [13-feature-inventory](../13-feature-inventory.md) · [PROMPT-14](../12-cursor-prompts/PROMPT-14-communication-messaging.md)

---

## Business Objective

Parents and teachers need a direct communication channel within the school context. Currently, this happens via WhatsApp personal accounts or phone calls — untracked, unofficial, and lost to audit. A built-in messaging system keeps school communication within Vitana, provides records, and enables Vitana to offer moderated, school-safe messaging as a platform differentiator.

## Technical Objective

Build a direct messaging system between teachers and parents, announcement creation/viewing for teachers, and class-level broadcast messaging. Integrate with push notifications for instant delivery.

---

## Current State Analysis

Backend provides:
- `POST /api/communication/messages` — send message to a user.
- `GET /api/communication/messages?conversationId=X` — conversation messages.
- `GET /api/communication/messages/conversations` — my conversation list.
- `POST /api/announcements` — create announcement (admin/teacher).
- `GET /api/announcements` — read announcements (all roles).
- School Connect (`/api/schoolconnect`) — social post model (Phase 5+).

All message endpoints use standard JWT auth. Teachers can only message parents of students in their assigned classes.

---

## Functional Requirements

### Direct Messaging (Teacher ↔ Parent)

| ID | Requirement |
|---|---|
| FR-1 | Teacher sees conversation list (all parent conversations) |
| FR-2 | Teacher initiates conversation with any parent of their class students |
| FR-3 | Parent sees conversation list (teacher conversations only) |
| FR-4 | Real-time-like message updates (30-second polling or push) |
| FR-5 | Message read receipts (sent → delivered → read indicators) |
| FR-6 | Push notification on new message |
| FR-7 | Message search within conversation |
| FR-8 | Unread message count badge on Messages navigation item |

### Announcements (Teacher Create)

| ID | Requirement |
|---|---|
| FR-9 | Teacher creates announcements for own classes |
| FR-10 | Audience: specific class, all parents, all students |
| FR-11 | Rich text body with formatting |
| FR-12 | Priority selection |
| FR-13 | Teacher views own published announcements |

### Broadcast (Teacher → Class Parents)

| ID | Requirement |
|---|---|
| FR-14 | Teacher sends one-way broadcast to all parents of a class |
| FR-15 | Broadcast appears in parent's announcement feed |
| FR-16 | Push notification sent to all recipients |

---

## Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-1 | Message list renders 100+ messages without jank |
| NFR-2 | New message appears within 30 seconds of being sent |
| NFR-3 | Conversation list sorted by most recent message |
| NFR-4 | Long messages (> 1000 chars) truncated in list, expanded in detail |

---

## API Requirements

| Method | Endpoint | Status |
|---|---|---|
| GET | `/api/communication/messages/conversations` | Exists |
| GET | `/api/communication/messages?conversationId=X` | Exists |
| POST | `/api/communication/messages` | Exists |
| PUT | `/api/communication/messages/{id}/read` | Exists |
| GET | `/api/communication/messages/unread-count` | Exists |
| POST | `/api/announcements` | Exists |
| GET | `/api/announcements?audience=teacher-class` | Exists |

---

## Mobile Screens

| Screen | Route | Role |
|---|---|---|
| Conversations List | `/(teacher)/messages/` | Teacher |
| Conversation Thread | `/(teacher)/messages/[conversationId]` | Teacher |
| New Conversation | `/(teacher)/messages/new` | Teacher |
| Parent Messages | `/(parent)/messages/` | Parent |
| Parent Message Thread | `/(parent)/messages/[conversationId]` | Parent |
| Announcements List | `/(teacher)/announcements/` | Teacher |
| Create Announcement | `/(teacher)/announcements/create` | Teacher |

---

## Conversation Thread Design

```
← Priya Sharma (Mother of Aarav)      [Search] [More]
─────────────────────────────────────────────────────
  Jun 10, 10:30 AM
  [You]                              Aarav has been
                                     doing well in
                                     class this week.
  
  Jun 10, 11:15 AM
  [PS] Priya Sharma
  Thank you so much, teacher. We'll
  make sure he keeps up the good work.
  
  Jun 10, 11:16 AM  ✓✓ (read)
  [You]             Of course! Let me
                    know if you have
                    any concerns.
─────────────────────────────────────────────────────
  [Type a message...]          [Send →]
```

Message states:
- Sent (single checkmark ✓)
- Delivered (double checkmark ✓✓ grey)
- Read (double checkmark ✓✓ blue)

---

## Offline Strategy

Messages cannot be sent offline (communication requires connectivity). However:
- Conversation list is cached (TanStack Query).
- Message history is cached per conversation.
- Offline indicator shown with "Messages require connection."
- Drafted message preserved if app is closed (AsyncStorage `draft_{conversationId}`).

---

## User Stories

| ID | Story | SP |
|---|---|---|
| EP-15-US-01 | Teacher–parent direct messaging | 8 |
| EP-15-US-02 | Message read receipts | 3 |
| EP-15-US-03 | Push notification on new message | 3 |
| EP-15-US-04 | Teacher creates class announcement | 5 |
| EP-15-US-05 | Teacher broadcast to class parents | 3 |
| EP-15-US-06 | Unread count badge | 2 |
| EP-15-US-07 | Message draft preservation | 2 |

**Total:** 26 story points / 2 sprints

---

## Acceptance Criteria

- [ ] Teacher sends message → parent receives push notification.
- [ ] Parent replies → teacher receives push notification.
- [ ] Unread badge count updates after new message.
- [ ] Message read receipts updated after recipient opens thread.
- [ ] Teacher cannot message parents from other schools.
- [ ] Conversation list sorted by most recent message.
- [ ] Announcement created by teacher appears in parent's feed.
- [ ] Draft message preserved when app is backgrounded and restored.

---

## Sprint Breakdown

| Sprint | Scope |
|---|---|
| Sprint 19 | Conversation list + thread + send message + push notifications |
| Sprint 20 | Read receipts + teacher announcements + broadcast + unread badge |

---

## Future Enhancements

- Group chat (all parents of a class in one thread).
- File/photo attachments in messages.
- Message moderation by admin.
- School Connect social posts (Phase 5).
- Voice message (Phase 5).
