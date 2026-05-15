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
  return apiGet<PaginatedAnnouncements>(`announcements?${params.toString()}`);
}

export async function getAnnouncementById(id: string): Promise<AnnouncementBasic> {
  return apiGet<AnnouncementBasic>(`announcements/${id}`);
}

export async function getAnnouncementStats(): Promise<AnnouncementStats> {
  return apiGet<AnnouncementStats>('announcements/stats');
}

export async function getMyAnnouncements(): Promise<AnnouncementBasic[]> {
  return apiGet<AnnouncementBasic[]>('announcements/my');
}

export async function createAnnouncement(
  data: CreateAnnouncementDto,
): Promise<AnnouncementBasic> {
  return apiPost<AnnouncementBasic>('announcements', data);
}

export async function updateAnnouncement(
  id: string,
  data: UpdateAnnouncementDto,
): Promise<AnnouncementBasic> {
  return apiPut<AnnouncementBasic>(`announcements/${id}`, data);
}

export async function deleteAnnouncement(id: string): Promise<void> {
  return apiDelete<void>(`announcements/${id}`);
}

export async function markAnnouncementAsRead(data: MarkAsReadDto): Promise<boolean> {
  return apiPost<boolean>('announcements/mark-as-read', data);
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
    `announcements/${announcementId}/recipients?${params.toString()}`,
  );
}
