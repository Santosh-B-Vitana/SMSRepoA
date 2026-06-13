import { apiClient } from '../client';
import type { PaginatedResponse } from './teacher';

// ─── Conversations ────────────────────────────────────────────────────────────

export interface ConversationDto {
  id: string;
  participantId: string;
  participantName: string;
  participantRole: string;
  lastMessage: string | null;
  lastMessageTime: string | null;
  unreadCount: number;
}

// ─── Messages ────────────────────────────────────────────────────────────────

export type MessageStatus = 'sent' | 'delivered' | 'read' | 'sending';

export interface MessageDto {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  sentAt: string;
  status: MessageStatus;
}

export interface SendMessagePayload {
  conversationId?: string;
  recipientId: string;
  message: string;
}

export interface UnreadCountDto {
  count: number;
}

// ─── Announcements ───────────────────────────────────────────────────────────

export type AnnouncementPriority = 'Low' | 'Normal' | 'High' | 'Urgent';

export interface AnnouncementDto {
  id: string;
  title: string;
  body: string;
  priority: AnnouncementPriority;
  classId: string | null;
  className: string | null;
  createdAt: string;
  recipientCount: number;
}

export interface CreateAnnouncementPayload {
  title: string;
  body: string;
  priority: AnnouncementPriority;
  classId?: string | null;
}

// ─── Recipients (for new conversation picker) ────────────────────────────────

export interface MessageRecipientDto {
  id: string;
  name: string;
  role: string;
  classId: string | null;
  className: string | null;
  studentName: string | null;
}

// ─── API ─────────────────────────────────────────────────────────────────────

export const communicationApi = {
  getMessageRecipients: (): Promise<MessageRecipientDto[]> =>
    apiClient.get('/communication/mobile/recipients'),

  getConversations: (page = 1): Promise<PaginatedResponse<ConversationDto>> =>
    apiClient.get('/communication/mobile/conversations', {
      params: { page, pageSize: 20 },
    }),

  getMessages: (conversationId: string, page = 1): Promise<PaginatedResponse<MessageDto>> =>
    apiClient.get(`/communication/mobile/messages/${conversationId}`, {
      params: { page, pageSize: 50 },
    }),

  sendMessage: (data: SendMessagePayload): Promise<MessageDto> =>
    apiClient.post('/communication/mobile/messages', data),

  markRead: (messageId: string): Promise<void> =>
    apiClient.put(`/communication/mobile/messages/${messageId}/read`),

  getUnreadCount: (): Promise<UnreadCountDto> =>
    apiClient.get('/communication/mobile/unread-count'),

  createAnnouncement: (data: CreateAnnouncementPayload): Promise<AnnouncementDto> =>
    apiClient.post('/announcements', data),

  getTeacherAnnouncements: (page = 1): Promise<PaginatedResponse<AnnouncementDto>> =>
    apiClient.get('/announcements', { params: { role: 'teacher', page, pageSize: 20 } }),
};
