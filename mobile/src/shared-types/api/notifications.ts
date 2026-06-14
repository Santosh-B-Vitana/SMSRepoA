export type NotificationType =
  | 'fee_due'
  | 'fee_paid'
  | 'attendance_marked'
  | 'result_published'
  | 'new_announcement'
  | 'leave_approved'
  | 'leave_rejected'
  | 'assignment_graded'
  | 'assignment_due'
  | 'exam_scheduled'
  | 'timetable_updated'
  | 'class_starting_soon'
  | 'class_started_now'
  | 'recording_available'
  | 'class_cancelled'
  | 'general';

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, string>;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
  deepLink?: string;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  sound?: string;
  badge?: number;
}

export interface DeviceTokenRegistration {
  token: string;
  platform: 'ios' | 'android';
  deviceId?: string;
  appVersion?: string;
}
