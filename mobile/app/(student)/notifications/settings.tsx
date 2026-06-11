import { NotificationPreferencesScreen } from '@/features/notifications/NotificationPreferencesScreen';

const STUDENT_TYPES = [
  'assignment_graded',
  'assignment_created',
  'result_published',
  'new_announcement',
];

export default function StudentNotificationSettings() {
  return <NotificationPreferencesScreen roleTypes={STUDENT_TYPES} />;
}
