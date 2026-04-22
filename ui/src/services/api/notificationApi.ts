/**
 * Notification API — connects to /api/notifications endpoints
 * All roles: my, unread-count, mark read, delete own
 * Staff: send
 * Admin/Principal: broadcast, list all, stats, admin delete
 */
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/apiClient";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface NotificationItem {
  id: string;
  schoolId: string;
  recipientId: string;
  recipientType: string;
  senderId?: string;
  senderName?: string;
  type: string;
  title: string;
  content: string;
  actionUrl?: string;
  referenceId?: string;
  referenceType?: string;
  isRead: boolean;
  readAt?: string;
  priority: string;
  createdAt: string;
}

export interface NotificationListResponse {
  notifications: NotificationItem[];
  total: number;
  unreadCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface NotificationStats {
  total: number;
  unread: number;
  read: number;
  readRate: number;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
  sentLast24Hours: number;
  sentLast7Days: number;
}

export interface SendNotificationRequest {
  recipientId: string;
  recipientType: string;
  type: string;
  title: string;
  content: string;
  priority?: string;
  actionUrl?: string;
  referenceId?: string;
  referenceType?: string;
}

export interface BroadcastNotificationRequest {
  recipientIds?: string[];
  recipientRole?: string;
  recipientType: string;
  type: string;
  title: string;
  content: string;
  priority?: string;
  actionUrl?: string;
}

export interface BroadcastResult {
  totalRecipients: number;
  sent: number;
  failed: number;
  errors: string[];
}

// ─── API functions ──────────────────────────────────────────────────────────

/** Get notifications for the currently authenticated user */
export const getMyNotifications = (params?: {
  page?: number;
  pageSize?: number;
  unreadOnly?: boolean;
  type?: string;
}) => apiGet<NotificationListResponse>("/notifications/my", params as Record<string, unknown>);

/** Get quick unread count for badge */
export const getUnreadCount = () =>
  apiGet<{ unreadCount: number }>("/notifications/unread-count");

/** Mark a single notification as read */
export const markAsRead = (id: string) =>
  apiPut<{ message: string }>(`/notifications/${id}/read`);

/** Mark all notifications as read */
export const markAllAsRead = () =>
  apiPut<{ message: string; count: number }>("/notifications/read-all");

/** Delete (soft) a notification the user received */
export const deleteMyNotification = (id: string) =>
  apiDelete<{ message: string }>(`/notifications/${id}`);

/** Send a notification to a single recipient (staff role required) */
export const sendNotification = (request: SendNotificationRequest) =>
  apiPost<NotificationItem>("/notifications/send", request);

/** Broadcast to multiple recipients (admin/principal role required) */
export const broadcastNotification = (request: BroadcastNotificationRequest) =>
  apiPost<BroadcastResult>("/notifications/broadcast", request);

/** Admin: get all notifications for the school */
export const getSchoolNotifications = (params?: {
  page?: number;
  pageSize?: number;
  type?: string;
  priority?: string;
  recipientId?: string;
}) => apiGet<NotificationListResponse>("/notifications", params as Record<string, unknown>);

/** Admin: get notification statistics */
export const getNotificationStats = () =>
  apiGet<NotificationStats>("/notifications/stats");

/** Admin: force-delete any notification */
export const adminDeleteNotification = (id: string) =>
  apiDelete<{ message: string }>(`/notifications/${id}/admin`);

// Legacy compat export for components using old shape
export const notificationApi = {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
};

export type { NotificationItem as NotificationItem_ };
