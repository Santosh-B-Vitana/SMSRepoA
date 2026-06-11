import { NotificationPreferencesScreen } from '@/features/notifications/NotificationPreferencesScreen';

const TEACHER_TYPES = [
  'leave_request_received',
  'submission_received',
  'timetable_change',
  'new_message',
];

export default function TeacherNotificationSettings() {
  return <NotificationPreferencesScreen roleTypes={TEACHER_TYPES} />;
}
