import { NotificationPreferencesScreen } from '@/features/notifications/NotificationPreferencesScreen';

const PARENT_TYPES = [
  'fee_due',
  'fee_overdue',
  'attendance_absent',
  'result_published',
  'new_announcement',
  'new_diary_entry',
  'leave_approved',
];

export default function ParentNotificationSettings() {
  return <NotificationPreferencesScreen roleTypes={PARENT_TYPES} />;
}
