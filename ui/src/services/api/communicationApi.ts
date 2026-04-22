/**
 * Communication API — connects to /api/communication
 * Covers: Announcements, Bulk Messages (SMS / WhatsApp / Email), Templates, Stats
 */
import { apiClient } from "@/lib/apiClient";

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

export type ChannelType = "email" | "sms" | "whatsapp" | "push_notification";
export type Priority    = "low" | "medium" | "high" | "urgent";
export type AnnouncementStatus = "draft" | "published" | "archived" | "scheduled";
export type MessageStatus = "queued" | "sent" | "delivered" | "failed" | "bounced";
export type TargetAudience =
  | "all"
  | "students"
  | "parents"
  | "staff"
  | "specific_class"
  | "specific_section";

export interface AttachmentDto {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
}

// ---------------------------------------------------------------------------
// Announcements
// ---------------------------------------------------------------------------

export interface AnnouncementBasic {
  id: string;
  title: string;
  targetAudience: TargetAudience;
  priority: Priority;
  category: string;
  status: AnnouncementStatus;
  publishedByName?: string;
  publishDate?: string;
  readCount: number;
  isPinned: boolean;
}

export interface AnnouncementFull extends AnnouncementBasic {
  schoolId: string;
  content: string;
  targetGroups: string[];
  targetUserIds: string[];
  publishedBy?: string;
  scheduleDate?: string;
  expiryDate?: string;
  attachments: AttachmentDto[];
  acknowledgedCount: number;
  totalTargetCount: number;
  requiresAcknowledgement: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AnnouncementListResponse {
  items: AnnouncementBasic[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CreateAnnouncementDto {
  title: string;
  content: string;
  targetAudience: TargetAudience;
  targetGroups?: string[];
  targetUserIds?: string[];
  priority: Priority;
  category: string;
  scheduleDate?: string;
  expiryDate?: string;
  isPinned?: boolean;
  requiresAcknowledgement?: boolean;
  publishImmediately: boolean;
}

export interface UpdateAnnouncementDto {
  title?: string;
  content?: string;
  priority?: Priority;
  category?: string;
  status?: string;
  scheduleDate?: string;
  expiryDate?: string;
  isPinned?: boolean;
}

export interface AnnouncementFilters {
  status?: string;
  priority?: Priority;
  targetAudience?: TargetAudience;
  searchQuery?: string;
  dateFrom?: string;
  dateTo?: string;
}

// ---------------------------------------------------------------------------
// Messages (broadcast / direct)
// ---------------------------------------------------------------------------

export interface MessageBasic {
  id: string;
  fromName?: string;
  recipientCount: number;
  subject: string;
  type: ChannelType;
  status: MessageStatus;
  sentAt?: string;
}

export interface RecipientDto {
  userId: string;
  name: string;
  email?: string;
  phone?: string;
}

export interface MessageFull extends MessageBasic {
  schoolId: string;
  fromUserId?: string;
  recipients: RecipientDto[];
  content: string;
  priority: string;
  deliveredAt?: string;
  failureReason?: string;
  templateId?: string;
  templateName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessageListResponse {
  items: MessageBasic[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SendMessageDto {
  toUserIds: string[];
  subject?: string;
  content: string;
  type: ChannelType;
  priority?: "normal" | "high";
  templateId?: string;
  templateVariables?: Record<string, string>;
}

export interface BulkSendDto {
  targetAudience: TargetAudience;
  targetGroups?: string[];
  subject?: string;
  content: string;
  type: ChannelType;
  templateId?: string;
  templateVariables?: Record<string, string>;
}

export interface BulkSendResult {
  totalRecipients: number;
  successCount: number;
  failureCount: number;
  failedRecipients: string[];
  message: string;
}

export interface MessageFilters {
  type?: ChannelType;
  status?: MessageStatus;
  searchQuery?: string;
  dateFrom?: string;
  dateTo?: string;
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export interface MessageTemplate {
  id: string;
  schoolId: string;
  name: string;
  type: ChannelType;
  category: string;
  subject?: string;
  content: string;
  variables: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateDto {
  name: string;
  type: ChannelType;
  category: string;
  subject?: string;
  content: string;
  variables: string[];
}

export interface UpdateTemplateDto {
  name?: string;
  subject?: string;
  content?: string;
  variables?: string[];
  isActive?: boolean;
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export interface CommunicationStats {
  totalAnnouncements: number;
  publishedAnnouncements: number;
  totalMessages: number;
  sentMessages: number;
  failedMessages: number;
  deliveryRate: number;
  avgReadRate: number;
  messagesByType: Record<string, number>;
  announcementsByCategory: Record<string, number>;
}

// ---------------------------------------------------------------------------
// API Functions
// ---------------------------------------------------------------------------

async function get<T>(url: string, params?: Record<string, unknown>) {
  const res = await apiClient.get<T>(url, { params });
  return res.data;
}
async function post<T>(url: string, data?: unknown) {
  const res = await apiClient.post<T>(url, data);
  return res.data;
}
async function put<T>(url: string, data?: unknown) {
  const res = await apiClient.put<T>(url, data);
  return res.data;
}
async function del(url: string) {
  await apiClient.delete(url);
}

const BASE = "/communication";

export const communicationApi = {
  // ── Announcements ────────────────────────────────────────────────────────
  getAnnouncements(filters: AnnouncementFilters = {}, page = 1, pageSize = 20) {
    return get<AnnouncementListResponse>(`${BASE}/announcements`, { ...filters, page, pageSize });
  },

  getAnnouncementById(id: string) {
    return get<AnnouncementFull>(`${BASE}/announcements/${id}`);
  },

  createAnnouncement(dto: CreateAnnouncementDto) {
    return post<AnnouncementFull>(`${BASE}/announcements`, dto);
  },

  updateAnnouncement(id: string, dto: UpdateAnnouncementDto) {
    return put<AnnouncementFull>(`${BASE}/announcements/${id}`, dto);
  },

  deleteAnnouncement(id: string) {
    return del(`${BASE}/announcements/${id}`);
  },

  publishAnnouncement(id: string) {
    return put<AnnouncementFull>(`${BASE}/announcements/${id}/publish`);
  },

  markAnnouncementRead(id: string) {
    return post<void>(`${BASE}/announcements/${id}/mark-read`);
  },

  // ── Messages ─────────────────────────────────────────────────────────────
  getMessages(filters: MessageFilters = {}, page = 1, pageSize = 20) {
    return get<MessageListResponse>(`${BASE}/messages`, { ...filters, page, pageSize });
  },

  getMessageById(id: string) {
    return get<MessageFull>(`${BASE}/messages/${id}`);
  },

  sendMessage(dto: SendMessageDto) {
    return post<MessageFull>(`${BASE}/messages`, dto);
  },

  bulkSend(dto: BulkSendDto) {
    return post<BulkSendResult>(`${BASE}/messages/bulk`, dto);
  },

  // ── Templates ────────────────────────────────────────────────────────────
  getTemplates(type?: ChannelType, category?: string) {
    return get<MessageTemplate[]>(`${BASE}/templates`, { type, category });
  },

  createTemplate(dto: CreateTemplateDto) {
    return post<MessageTemplate>(`${BASE}/templates`, dto);
  },

  updateTemplate(id: string, dto: UpdateTemplateDto) {
    return put<MessageTemplate>(`${BASE}/templates/${id}`, dto);
  },

  deleteTemplate(id: string) {
    return del(`${BASE}/templates/${id}`);
  },

  seedDefaultTemplates() {
    return post<MessageTemplate[]>(`${BASE}/templates/seed-defaults`);
  },

  // ── Stats ────────────────────────────────────────────────────────────────
  getStats(startDate?: string, endDate?: string) {
    return get<CommunicationStats>(`${BASE}/stats`, { startDate, endDate });
  },
};
