import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/apiClient';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export type AnnouncementPriority = 'low' | 'normal' | 'high' | 'urgent';
export type AnnouncementAudience =
  | 'all'
  | 'students'
  | 'staff'
  | 'parents'
  | 'class'
  | 'section';

export interface AnnouncementBasic {
  id: string;
  schoolId: string;
  title: string;
  content: string;
  createdByStaffId: string;
  createdByStaffName?: string;
  priority: AnnouncementPriority;
  targetAudience: AnnouncementAudience;
  targetClassId?: string;
  targetClassName?: string;
  targetSectionId?: string;
  targetSectionName?: string;
  publishedDate: string;
  expiryDate?: string;
  isActive: boolean;
  isPinned: boolean;
  isExpired: boolean;
  attachmentUrl?: string;
  totalRecipients: number;
  readCount: number;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AnnouncementStats {
  totalAnnouncements: number;
  activeAnnouncements: number;
  pinnedAnnouncements: number;
  urgentAnnouncements: number;
  expiringToday: number;
  expiredAnnouncements: number;
  totalRecipients: number;
  readCount: number;
  unreadCount: number;
  byPriority: Record<string, number>;
  byAudience: Record<string, number>;
}

export interface AnnouncementRecipient {
  id: string;
  announcementId: string;
  recipientType: string;
  recipientId: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface PaginatedAnnouncements {
  items: AnnouncementBasic[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginatedRecipients {
  items: AnnouncementRecipient[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AnnouncementFilters {
  isActive?: boolean;
  isPinned?: boolean;
  targetAudience?: AnnouncementAudience;
  priority?: AnnouncementPriority;
  search?: string;
}

export interface CreateAnnouncementDto {
  title: string;
  content: string;
  createdByStaffId: string;
  priority: AnnouncementPriority;
  targetAudience: AnnouncementAudience;
  targetClassId?: string;
  targetSectionId?: string;
  expiryDate?: string;
  isPinned: boolean;
  attachmentUrl?: string;
}

export interface UpdateAnnouncementDto {
  title?: string;
  content?: string;
  priority?: AnnouncementPriority;
  targetAudience?: AnnouncementAudience;
  targetClassId?: string;
  targetSectionId?: string;
  expiryDate?: string;
  isPinned?: boolean;
  isActive?: boolean;
  attachmentUrl?: string;
}

export interface MarkAsReadDto {
  announcementId: string;
  recipientType: string;
  recipientId: string;
}

// ═══════════════════════════════════════════════════════════════
// API functions
// ═══════════════════════════════════════════════════════════════

export async function getAnnouncements(
  filters?: AnnouncementFilters,
  page = 1,
  pageSize = 20,
): Promise<PaginatedAnnouncements> {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));
  if (filters?.isActive !== undefined) params.set('isActive', String(filters.isActive));
  if (filters?.isPinned !== undefined) params.set('isPinned', String(filters.isPinned));
  if (filters?.targetAudience) params.set('targetAudience', filters.targetAudience);
  if (filters?.priority) params.set('priority', filters.priority);
  if (filters?.search) params.set('search', filters.search);
  return apiGet<PaginatedAnnouncements>(`/api/announcements?${params.toString()}`);
}

export async function getAnnouncementById(id: string): Promise<AnnouncementBasic> {
  return apiGet<AnnouncementBasic>(`/api/announcements/${id}`);
}

export async function getAnnouncementStats(): Promise<AnnouncementStats> {
  return apiGet<AnnouncementStats>('/api/announcements/stats');
}

export async function getMyAnnouncements(
  recipientId: string,
  recipientType: string,
): Promise<AnnouncementBasic[]> {
  const params = new URLSearchParams({ recipientId, recipientType });
  return apiGet<AnnouncementBasic[]>(`/api/announcements/my?${params.toString()}`);
}

export async function createAnnouncement(
  data: CreateAnnouncementDto,
): Promise<AnnouncementBasic> {
  return apiPost<AnnouncementBasic>('/api/announcements', data);
}

export async function updateAnnouncement(
  id: string,
  data: UpdateAnnouncementDto,
): Promise<AnnouncementBasic> {
  return apiPut<AnnouncementBasic>(`/api/announcements/${id}`, data);
}

export async function deleteAnnouncement(id: string): Promise<void> {
  return apiDelete<void>(`/api/announcements/${id}`);
}

export async function markAnnouncementAsRead(data: MarkAsReadDto): Promise<boolean> {
  return apiPost<boolean>('/api/announcements/mark-as-read', data);
}

export async function getAnnouncementRecipients(
  announcementId: string,
  isRead?: boolean,
  page = 1,
  pageSize = 20,
): Promise<PaginatedRecipients> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (isRead !== undefined) params.set('isRead', String(isRead));
  return apiGet<PaginatedRecipients>(
    `/api/announcements/${announcementId}/recipients?${params.toString()}`,
  );
}
